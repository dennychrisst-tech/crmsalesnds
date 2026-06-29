-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Clients
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text not null default 'Banking',
  pic text not null default '',
  contact text not null default '',
  status text not null default 'Prospect',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Visits
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  date date not null,
  purpose text not null default '',
  approach text not null default '',
  status text not null default 'Planned',
  pic text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now()
);

-- Deals
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid not null references clients(id) on delete cascade,
  value bigint not null default 0,
  stage text not null default 'Lead',
  product text not null default '',
  close_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid not null references clients(id) on delete cascade,
  product text not null default '',
  status text not null default 'Initiation',
  value bigint not null default 0,
  golive date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists visits_client_id_idx on visits(client_id);
create index if not exists visits_date_idx on visits(date);
create index if not exists deals_client_id_idx on deals(client_id);
create index if not exists projects_client_id_idx on projects(client_id);

-- Enable Row Level Security (open for now - add auth later)
alter table clients enable row level security;
alter table visits enable row level security;
alter table deals enable row level security;
alter table projects enable row level security;

create policy "Public read" on clients for select using (true);
create policy "Public insert" on clients for insert with check (true);
create policy "Public update" on clients for update using (true);
create policy "Public delete" on clients for delete using (true);

create policy "Public read" on visits for select using (true);
create policy "Public insert" on visits for insert with check (true);
create policy "Public update" on visits for update using (true);
create policy "Public delete" on visits for delete using (true);

create policy "Public read" on deals for select using (true);
create policy "Public insert" on deals for insert with check (true);
create policy "Public update" on deals for update using (true);
create policy "Public delete" on deals for delete using (true);

create policy "Public read" on projects for select using (true);
create policy "Public insert" on projects for insert with check (true);
create policy "Public update" on projects for update using (true);
create policy "Public delete" on projects for delete using (true);
