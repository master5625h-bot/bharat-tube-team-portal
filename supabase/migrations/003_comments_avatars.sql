-- Task comments, profile photos (private storage bucket). Run once in Supabase > SQL Editor.

-- 1) Profile photo path
alter table public.profiles add column if not exists avatar_url text;

-- 2) Task comments
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists task_comments_task_idx on public.task_comments(task_id, created_at);
alter table public.task_comments enable row level security;

-- Admin sees all comments. A member sees comments only on tasks assigned to them.
create policy "comments read" on public.task_comments for select using (
  public.is_admin() or (public.is_approved() and exists (
    select 1 from public.tasks t where t.id = task_id and t.assigned_to = auth.uid()))
);
-- Anyone allowed to see the task may comment, only as themselves.
create policy "comments insert" on public.task_comments for insert with check (
  user_id = auth.uid() and (public.is_admin() or (public.is_approved() and exists (
    select 1 from public.tasks t where t.id = task_id and t.assigned_to = auth.uid())))
);
create policy "comments delete own or admin" on public.task_comments for delete using (
  public.is_admin() or (public.is_approved() and user_id = auth.uid())
);

-- 3) Private avatar bucket (max 1 MB, images only). Each user writes only inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 1048576,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

create policy "avatars read approved" on storage.objects for select
  using (bucket_id = 'avatars' and public.is_approved());
create policy "avatars insert own folder" on storage.objects for insert
  with check (bucket_id = 'avatars' and public.is_approved() and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update own folder" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete own folder" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
