-- ============================================================
-- Phase 2: Admin — Update profiles RLS for team visibility
-- Run in Supabase SQL Editor after 002_auth.sql
-- ============================================================

-- Drop the restrictive per-user read policy
drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "Admins can read all profiles" on profiles;

-- All authenticated users can read all profiles (needed for team dropdowns)
-- Names are not sensitive in an internal CRM tool
create policy "Authenticated users can read all profiles"
  on profiles for select
  using (auth.role() = 'authenticated');

-- Allow admins to update any profile role (for role management)
create policy "Admins can update any profile"
  on profiles for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('super_admin', 'admin')
    )
  );

-- Allow admins to insert profiles (for invite flow)
create policy "Admins can insert profiles"
  on profiles for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('super_admin', 'admin')
    )
  );
