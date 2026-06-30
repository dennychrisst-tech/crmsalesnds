-- ============================================================
-- Phase 3: Multi-tenant isolation
-- Adds created_by_id (uuid → auth.users) to all core tables.
-- RLS model:
--   SELECT  → all authenticated (full team visibility)
--   INSERT  → authenticated + app sets created_by_id = auth.uid()
--   UPDATE  → creator OR admin/super_admin OR NULL (legacy data)
--   DELETE  → same as UPDATE
-- ============================================================

-- Helper: is the current user admin?
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('super_admin', 'admin')
  )
$$;

-- ── Add created_by_id to each table ────────────────────────

alter table clients    add column if not exists created_by_id uuid references auth.users(id) on delete set null;
alter table contacts   add column if not exists created_by_id uuid references auth.users(id) on delete set null;
alter table visits     add column if not exists created_by_id uuid references auth.users(id) on delete set null;
alter table deals      add column if not exists created_by_id uuid references auth.users(id) on delete set null;
alter table projects   add column if not exists created_by_id uuid references auth.users(id) on delete set null;
alter table tasks      add column if not exists created_by_id uuid references auth.users(id) on delete set null;
alter table activities add column if not exists created_by_id uuid references auth.users(id) on delete set null;
alter table events     add column if not exists created_by_id uuid references auth.users(id) on delete set null;
alter table documents  add column if not exists created_by_id uuid references auth.users(id) on delete set null;
alter table attachments add column if not exists created_by_id uuid references auth.users(id) on delete set null;
alter table products   add column if not exists created_by_id uuid references auth.users(id) on delete set null;

-- ── Drop old Phase-1 catch-all policies ─────────────────────

drop policy if exists "Authenticated full access" on clients;
drop policy if exists "Authenticated full access" on contacts;
drop policy if exists "Authenticated full access" on visits;
drop policy if exists "Authenticated full access" on deals;
drop policy if exists "Authenticated full access" on projects;
drop policy if exists "Authenticated full access" on tasks;
drop policy if exists "Authenticated full access" on products;
drop policy if exists "Authenticated full access" on documents;
drop policy if exists "Authenticated full access" on attachments;
drop policy if exists "Authenticated full access" on activities;
drop policy if exists "Authenticated full access" on events;

-- ── New per-table RLS policies ───────────────────────────────

-- Macro: applies same pattern to every CRM table
-- SELECT: any authenticated user (full team visibility)
-- INSERT: any authenticated user (app must set created_by_id)
-- UPDATE/DELETE: creator OR admin OR legacy NULL record

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'clients','contacts','visits','deals','projects',
    'tasks','products','documents','attachments','activities','events'
  ] loop
    execute format(
      'create policy "Team read" on %I for select using (auth.role() = ''authenticated'')',
      tbl
    );
    execute format(
      'create policy "Team insert" on %I for insert with check (auth.role() = ''authenticated'')',
      tbl
    );
    execute format(
      $p$create policy "Owner or admin update" on %I for update
        using (
          created_by_id is null
          or created_by_id = auth.uid()
          or is_admin()
        )$p$,
      tbl
    );
    execute format(
      $p$create policy "Owner or admin delete" on %I for delete
        using (
          created_by_id is null
          or created_by_id = auth.uid()
          or is_admin()
        )$p$,
      tbl
    );
  end loop;
end $$;

-- ── Index for fast lookups by creator ───────────────────────

create index if not exists idx_clients_created_by    on clients(created_by_id);
create index if not exists idx_deals_created_by      on deals(created_by_id);
create index if not exists idx_visits_created_by     on visits(created_by_id);
create index if not exists idx_tasks_created_by      on tasks(created_by_id);
create index if not exists idx_activities_created_by on activities(created_by_id);
