-- Deal Type field
alter table deals add column if not exists deal_type text not null default '';

-- Activity Timeline
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  type text not null default 'Note',
  description text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists activities_deal_id_idx on activities(deal_id);
create index if not exists activities_client_id_idx on activities(client_id);
create index if not exists activities_created_at_idx on activities(created_at desc);

alter table activities enable row level security;
create policy "Public read"   on activities for select using (true);
create policy "Public insert" on activities for insert with check (true);
create policy "Public update" on activities for update using (true);
create policy "Public delete" on activities for delete using (true);
