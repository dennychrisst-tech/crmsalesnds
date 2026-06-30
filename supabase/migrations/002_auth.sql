-- ============================================================
-- Phase 1: Auth — Profiles table + Row Level Security
-- Run this in Supabase SQL Editor after enabling Authentication
-- ============================================================

-- Profiles table linked to Supabase Auth users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'employee' check (role in ('super_admin', 'admin', 'employee')),
  created_at timestamptz not null default now()
);

-- Auto-create profile when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS on profiles
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('super_admin', 'admin')
    )
  );

-- ============================================================
-- Enable RLS on all CRM tables
-- Phase 1: allow all authenticated users (tighten in Phase 3)
-- ============================================================

alter table clients    enable row level security;
alter table contacts   enable row level security;
alter table visits     enable row level security;
alter table deals      enable row level security;
alter table projects   enable row level security;
alter table tasks      enable row level security;
alter table products   enable row level security;
alter table documents  enable row level security;
alter table attachments enable row level security;
alter table activities enable row level security;
alter table events     enable row level security;

-- Allow all authenticated users full access (Phase 1)
-- Replace with per-user policies in Phase 3
create policy "Authenticated full access" on clients    for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access" on contacts   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access" on visits     for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access" on deals      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access" on projects   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access" on tasks      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access" on products   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access" on documents  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access" on attachments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access" on activities for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated full access" on events     for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
