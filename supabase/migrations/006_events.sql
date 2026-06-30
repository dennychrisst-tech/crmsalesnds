create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  date date not null,
  type text not null default 'Meeting Online',
  description text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists events_date_idx on events(date);
alter table events enable row level security;
create policy "Public read"   on events for select using (true);
create policy "Public insert" on events for insert with check (true);
create policy "Public update" on events for update using (true);
create policy "Public delete" on events for delete using (true);
