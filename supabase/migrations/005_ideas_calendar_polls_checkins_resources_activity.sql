-- 005: Idea box, content calendar, polls, daily check-in, resources, activity feed.
-- Run once in Supabase > SQL Editor.

-- 1) IDEA BOX
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  status text not null default 'new' check (status in ('new','under review','accepted','rejected')),
  created_by uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists public.idea_votes (
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);
alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;
create policy "ideas read" on public.ideas for select using (public.is_approved());
create policy "ideas insert own" on public.ideas for insert
  with check (public.is_approved() and created_by = auth.uid() and status = 'new');
create policy "ideas admin update" on public.ideas for update using (public.is_admin()) with check (public.is_admin());
create policy "ideas delete own or admin" on public.ideas for delete
  using (public.is_admin() or (public.is_approved() and created_by = auth.uid()));
create policy "idea votes read" on public.idea_votes for select using (public.is_approved());
create policy "idea votes insert own" on public.idea_votes for insert
  with check (public.is_approved() and user_id = auth.uid());
create policy "idea votes delete own" on public.idea_votes for delete
  using (public.is_approved() and user_id = auth.uid());

-- 2) CONTENT CALENDAR (editorial plan, not a scheduler)
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 150),
  publish_date date not null,
  platform text not null default 'YouTube' check (platform in ('YouTube','Shorts','Instagram','Facebook','Other')),
  note text not null default '' check (char_length(note) <= 500),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.content_items enable row level security;
create policy "content read" on public.content_items for select using (public.is_approved());
create policy "content insert" on public.content_items for insert
  with check (public.is_approved() and created_by = auth.uid()
    and (public.is_admin() or assigned_to is null or assigned_to = auth.uid()));
create policy "content update own or admin" on public.content_items for update
  using (public.is_admin() or (public.is_approved() and created_by = auth.uid()))
  with check (public.is_admin() or (public.is_approved() and created_by = auth.uid()
    and (assigned_to is null or assigned_to = auth.uid())));
create policy "content delete own or admin" on public.content_items for delete
  using (public.is_admin() or (public.is_approved() and created_by = auth.uid()));

-- 3) POLLS (admin creates through create_poll(); votes are final; voters stay private)
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 1 and 200),
  closed boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  position integer not null default 0
);
create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  option_id uuid not null references public.poll_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
create policy "polls read" on public.polls for select using (public.is_approved());
create policy "polls admin update" on public.polls for update using (public.is_admin()) with check (public.is_admin());
create policy "polls admin delete" on public.polls for delete using (public.is_admin());
create policy "poll options read" on public.poll_options for select using (public.is_approved());
-- members see only their own vote row; counts come from poll_results()
create policy "poll votes read own" on public.poll_votes for select
  using (public.is_approved() and user_id = auth.uid());
create policy "poll votes insert own" on public.poll_votes for insert with check (
  public.is_approved() and user_id = auth.uid()
  and exists (select 1 from public.polls p where p.id = poll_id and not p.closed)
  and exists (select 1 from public.poll_options o where o.id = option_id and o.poll_id = poll_votes.poll_id));

create or replace function public.create_poll(q text, opts text[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid; i int; n int;
begin
  if not public.is_admin() then raise exception 'Only an admin can create polls'; end if;
  n := coalesce(array_length(opts, 1), 0);
  if n < 2 or n > 5 then raise exception 'A poll needs 2 to 5 options'; end if;
  insert into public.polls (question) values (q) returning id into pid;
  for i in 1..n loop
    insert into public.poll_options (poll_id, label, position) values (pid, opts[i], i);
  end loop;
  return pid;
end; $$;

create or replace function public.poll_results() returns table (poll_id uuid, option_id uuid, votes bigint)
language sql stable security definer set search_path = public as $$
  select o.poll_id, o.id, count(v.user_id) from public.poll_options o
  left join public.poll_votes v on v.option_id = o.id
  where public.is_approved() group by o.poll_id, o.id;
$$;
revoke all on function public.create_poll(text, text[]) from public, anon;
revoke all on function public.poll_results() from public, anon;
grant execute on function public.create_poll(text, text[]) to authenticated;
grant execute on function public.poll_results() to authenticated;

-- 4) DAILY CHECK-IN (one note per member per day, IST)
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  day date not null default ((now() at time zone 'Asia/Kolkata')::date),
  note text not null check (char_length(note) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
alter table public.checkins enable row level security;
create policy "checkins read" on public.checkins for select using (public.is_approved());
create policy "checkins insert own today" on public.checkins for insert
  with check (public.is_approved() and user_id = auth.uid()
    and day = (now() at time zone 'Asia/Kolkata')::date);
create policy "checkins update own today" on public.checkins for update
  using (public.is_approved() and user_id = auth.uid() and day = (now() at time zone 'Asia/Kolkata')::date)
  with check (user_id = auth.uid() and day = (now() at time zone 'Asia/Kolkata')::date);
create policy "checkins delete own or admin" on public.checkins for delete
  using (public.is_admin() or (public.is_approved() and user_id = auth.uid()));

-- 5) RESOURCES (links + files; admin adds, everyone views; private bucket)
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  kind text not null check (kind in ('link','file')),
  url text,
  file_path text,
  filename text,
  mime text,
  created_by uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  check ((kind = 'link' and url is not null and url ~* '^https?://')
      or (kind = 'file' and file_path is not null))
);
alter table public.resources enable row level security;
create policy "resources read" on public.resources for select using (public.is_approved());
create policy "resources admin insert" on public.resources for insert with check (public.is_admin());
create policy "resources admin update" on public.resources for update using (public.is_admin()) with check (public.is_admin());
create policy "resources admin delete" on public.resources for delete using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resources', 'resources', false, 10485760,
  array['image/png','image/jpeg','image/webp','application/pdf','application/zip'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','application/pdf','application/zip'];
create policy "resources bucket read" on storage.objects for select
  using (bucket_id = 'resources' and public.is_approved());
create policy "resources bucket admin insert" on storage.objects for insert
  with check (bucket_id = 'resources' and public.is_admin());
create policy "resources bucket admin delete" on storage.objects for delete
  using (bucket_id = 'resources' and public.is_admin());

-- 6) ACTIVITY FEED (read-only view over existing tables; follows each user's own access rules)
alter table public.tasks add column if not exists completed_at timestamptz;
create or replace function public.set_completed_at() returns trigger
language plpgsql as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then new.completed_at := now();
  elsif new.status <> 'done' then new.completed_at := null; end if;
  return new;
end; $$;
drop trigger if exists tasks_completed_at on public.tasks;
create trigger tasks_completed_at before update on public.tasks
  for each row execute function public.set_completed_at();

create or replace view public.activity_feed with (security_invoker = true) as
  select 'task_new'::text as kind, t.created_at as at, t.created_by as actor_id, t.title as title from public.tasks t
  union all
  select 'task_done', t.completed_at, t.assigned_to, t.title from public.tasks t where t.completed_at is not null
  union all
  select 'attendance', a.created_at, a.user_id, a.status::text from public.attendance a
  union all
  select 'announcement', n.created_at, n.created_by, n.title from public.announcements n
  union all
  select 'member', p.created_at, p.id, p.full_name from public.profiles p where p.approved
  union all
  select 'idea', i.created_at, i.created_by, i.title from public.ideas i
  union all
  select 'checkin', c.created_at, c.user_id, c.note from public.checkins c
  union all
  select 'poll', po.created_at, po.created_by, po.question from public.polls po;
grant select on public.activity_feed to authenticated;
