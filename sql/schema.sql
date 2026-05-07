-- ============================================================================
-- Calcule · Piramide — Supabase schema
-- ============================================================================
-- Run this in your Supabase project: SQL Editor → paste → Run.
-- It is idempotent: safe to re-run.
--
-- This creates two tables:
--   profiles     — one row per user, mirrors auth.users with full_name + role
--   submissions  — one row per completed exercise
--
-- and locks them down with Row-Level Security so:
--   - students see only their own profile and their own submissions
--   - teachers see all profiles and all submissions
-- ============================================================================

-- ---- profiles --------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  role        text not null check (role in ('student', 'teacher')) default 'student',
  class_group text,
  created_at  timestamptz default now()
);

-- ---- submissions -----------------------------------------------------------
create table if not exists public.submissions (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles(id) on delete cascade,
  module         text not null default 'piramide',  -- 'piramide' | 'aritmetica' | ...
  pyramid_type   text,                              -- only meaningful for module='piramide'
  problem        jsonb not null,
  answers        jsonb not null,
  score_correct  integer not null,
  score_total    integer not null,
  created_at     timestamptz default now()
);

-- Migration 001 (idempotent), in case schema.sql is re-applied to an existing DB.
alter table public.submissions add column if not exists module text not null default 'piramide';
alter table public.submissions alter column pyramid_type drop not null;

create index if not exists submissions_student_id_idx
  on public.submissions(student_id, created_at desc);

-- ---- RLS -------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.submissions enable row level security;

-- Helper: is the calling user a teacher?
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;

-- ---- profiles policies ----
drop policy if exists "profiles: read own"       on public.profiles;
drop policy if exists "profiles: teacher reads"  on public.profiles;
drop policy if exists "profiles: update own"     on public.profiles;

create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: teacher reads"
  on public.profiles for select
  using (public.is_teacher());

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid());

-- ---- submissions policies ----
drop policy if exists "submissions: student reads own"     on public.submissions;
drop policy if exists "submissions: teacher reads all"     on public.submissions;
drop policy if exists "submissions: student inserts own"   on public.submissions;

create policy "submissions: student reads own"
  on public.submissions for select
  using (student_id = auth.uid());

create policy "submissions: teacher reads all"
  on public.submissions for select
  using (public.is_teacher());

create policy "submissions: student inserts own"
  on public.submissions for insert
  with check (student_id = auth.uid());

-- ---- auto-provision a profile when a user is created -----------------------
-- The "Add user" form in the Supabase dashboard lets you set
-- raw_user_meta_data with keys `full_name`, `role`, `class_group`. This
-- trigger copies those into public.profiles automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, class_group)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    new.raw_user_meta_data ->> 'class_group'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
