-- BharatTube Team Portal: schema + security (run in Supabase > SQL Editor)

create type public.user_role as enum ('admin', 'member');
create type public.task_status as enum ('todo', 'in_progress', 'done');
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.attendance_status as enum ('present', 'absent', 'leave');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role public.user_role not null default 'member',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_date date,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  week_start date not null,
  summary text not null,
  blockers text not null default '',
  next_plan text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  day date not null default current_date,
  status public.attendance_status not null default 'present',
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- Helpers (security definer avoids recursive RLS)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and approved);
$$;
create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and approved);
$$;

-- New signups: always Member and NOT approved. Admin must approve.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block users from changing their own role/approval
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and (new.role <> old.role or new.approved <> old.approved) then
    raise exception 'Only an admin can change role or approval';
  end if;
  return new;
end; $$;
create trigger protect_profile_trg before update on public.profiles
  for each row execute function public.protect_profile();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.attendance enable row level security;
alter table public.announcements enable row level security;

-- profiles
create policy "read own or admin" on public.profiles for select
  using (id = auth.uid() or public.is_approved());
create policy "update own name" on public.profiles for update
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- tasks: admin all; member sees/updates assigned
create policy "tasks read" on public.tasks for select
  using (public.is_admin() or (public.is_approved() and assigned_to = auth.uid()));
create policy "tasks admin insert" on public.tasks for insert with check (public.is_admin());
create policy "tasks update" on public.tasks for update
  using (public.is_admin() or (public.is_approved() and assigned_to = auth.uid()));
create policy "tasks admin delete" on public.tasks for delete using (public.is_admin());

-- weekly reports: own or admin
create policy "reports read" on public.weekly_reports for select
  using (public.is_admin() or (public.is_approved() and user_id = auth.uid()));
create policy "reports insert own" on public.weekly_reports for insert
  with check (public.is_approved() and user_id = auth.uid());
create policy "reports update own" on public.weekly_reports for update
  using (public.is_approved() and user_id = auth.uid());

-- attendance: own or admin
create policy "attendance read" on public.attendance for select
  using (public.is_admin() or (public.is_approved() and user_id = auth.uid()));
create policy "attendance insert own" on public.attendance for insert
  with check (public.is_approved() and user_id = auth.uid());
create policy "attendance admin update" on public.attendance for update using (public.is_admin());

-- announcements: all approved read, admin write
create policy "ann read" on public.announcements for select using (public.is_approved());
create policy "ann admin insert" on public.announcements for insert with check (public.is_admin());
create policy "ann admin delete" on public.announcements for delete using (public.is_admin());
