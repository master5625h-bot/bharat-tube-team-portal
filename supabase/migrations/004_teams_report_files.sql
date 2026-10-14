-- Teams + weekly report attachments. Run once in Supabase > SQL Editor.

-- 1) Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.teams enable row level security;
create policy "teams read" on public.teams for select using (public.is_approved());
create policy "teams admin insert" on public.teams for insert with check (public.is_admin());
create policy "teams admin delete" on public.teams for delete using (public.is_admin());

insert into public.teams (name) values ('Marketing'), ('Research'), ('Editing')
on conflict (name) do nothing;

alter table public.profiles add column if not exists team_id uuid references public.teams(id) on delete set null;

-- Only an admin may change role, approval or team (members can still edit nothing else sensitive)
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and (
    new.role <> old.role or new.approved <> old.approved
    or new.team_id is distinct from old.team_id) then
    raise exception 'Only an admin can change role, approval or team';
  end if;
  return new;
end; $$;

-- 2) Weekly report attachments (PNG / PDF, max 5 MB, private bucket)
create table if not exists public.report_files (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  path text not null,
  filename text not null,
  mime text not null,
  size_bytes integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.report_files enable row level security;

create policy "report files read" on public.report_files for select
  using (public.is_admin() or (public.is_approved() and user_id = auth.uid()));
create policy "report files insert own" on public.report_files for insert with check (
  public.is_approved() and user_id = auth.uid()
  and exists (select 1 from public.weekly_reports r where r.id = report_id and r.user_id = auth.uid()));
create policy "report files delete own or admin" on public.report_files for delete
  using (public.is_admin() or (public.is_approved() and user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 5242880, array['image/png','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/png','application/pdf'];

create policy "reports bucket read own or admin" on storage.objects for select using (
  bucket_id = 'reports' and (public.is_admin() or (public.is_approved() and (storage.foldername(name))[1] = auth.uid()::text)));
create policy "reports bucket insert own folder" on storage.objects for insert with check (
  bucket_id = 'reports' and public.is_approved() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "reports bucket delete own or admin" on storage.objects for delete using (
  bucket_id = 'reports' and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text));
