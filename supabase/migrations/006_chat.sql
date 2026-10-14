-- 006: Chat (common channel, team channels, 1-to-1 DMs). Run once.

create or replace function public.my_team() returns uuid
language sql stable security definer set search_path = public as $$
  select team_id from public.profiles where id = auth.uid();
$$;
revoke all on function public.my_team() from public, anon;
grant execute on function public.my_team() to authenticated;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('common','team','dm')),
  team_id uuid references public.teams(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (
    (kind = 'common' and team_id is null and recipient_id is null) or
    (kind = 'team' and team_id is not null and recipient_id is null) or
    (kind = 'dm' and recipient_id is not null and team_id is null and recipient_id <> sender_id)
  )
);
create index if not exists messages_created_idx on public.messages (created_at desc);
alter table public.messages enable row level security;

-- Who may see a message: everyone approved sees common; team channel = that team's members + admins;
-- a DM = only the sender and the recipient (admins included are NOT allowed).
create policy "messages read" on public.messages for select using (
  public.is_approved() and (
    kind = 'common'
    or (kind = 'team' and (public.is_admin() or team_id = public.my_team()))
    or (kind = 'dm' and (sender_id = auth.uid() or recipient_id = auth.uid()))
  ));
create policy "messages insert" on public.messages for insert with check (
  public.is_approved() and sender_id = auth.uid() and (
    kind = 'common'
    or (kind = 'team' and (public.is_admin() or team_id = public.my_team()))
    or (kind = 'dm' and exists (select 1 from public.profiles r where r.id = recipient_id and r.approved))
  ));
create policy "messages delete own" on public.messages for delete
  using (public.is_approved() and sender_id = auth.uid());

-- Unread tracking: one row per user per channel
create table if not exists public.chat_reads (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  channel text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, channel)
);
alter table public.chat_reads enable row level security;
create policy "chat reads own" on public.chat_reads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Live updates
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
