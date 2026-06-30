-- Company profile fields on clients
alter table clients add column if not exists address text not null default '';
alter table clients add column if not exists website text not null default '';
alter table clients add column if not exists company_size text not null default '';

-- Migrate pic from text to text[] (preserves existing data)
alter table clients alter column pic drop default;
alter table clients
  alter column pic type text[]
  using case when pic = '' then array[]::text[] else array[pic] end;
alter table clients alter column pic set default array[]::text[];

-- Owner and win/loss reason on deals
alter table deals add column if not exists owner text not null default '';
alter table deals add column if not exists win_loss_reason text not null default '';

-- Contact Persons
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null default '',
  title text not null default '',
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Tasks / Reminders
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_date date,
  client_id uuid references clients(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  assigned_to text not null default '',
  status text not null default 'Open',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Products / Solution Catalog
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  description text not null default '',
  created_at timestamptz not null default now()
);

-- Documents / Proposal Tracker (per deal)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  name text not null default '',
  type text not null default 'Proposal Teknis',
  status text not null default 'Draft',
  date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- File Attachments
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_size bigint not null default 0,
  uploaded_at timestamptz not null default now()
);

-- Indexes
create index if not exists contacts_client_id_idx on contacts(client_id);
create index if not exists tasks_client_id_idx on tasks(client_id);
create index if not exists tasks_deal_id_idx on tasks(deal_id);
create index if not exists tasks_due_date_idx on tasks(due_date);
create index if not exists documents_deal_id_idx on documents(deal_id);
create index if not exists attachments_deal_id_idx on attachments(deal_id);
create index if not exists attachments_client_id_idx on attachments(client_id);

-- Enable RLS
alter table contacts enable row level security;
alter table tasks enable row level security;
alter table products enable row level security;
alter table documents enable row level security;
alter table attachments enable row level security;

create policy "Public read"   on contacts  for select using (true);
create policy "Public insert" on contacts  for insert with check (true);
create policy "Public update" on contacts  for update using (true);
create policy "Public delete" on contacts  for delete using (true);

create policy "Public read"   on tasks     for select using (true);
create policy "Public insert" on tasks     for insert with check (true);
create policy "Public update" on tasks     for update using (true);
create policy "Public delete" on tasks     for delete using (true);

create policy "Public read"   on products  for select using (true);
create policy "Public insert" on products  for insert with check (true);
create policy "Public update" on products  for update using (true);
create policy "Public delete" on products  for delete using (true);

create policy "Public read"   on documents for select using (true);
create policy "Public insert" on documents for insert with check (true);
create policy "Public update" on documents for update using (true);
create policy "Public delete" on documents for delete using (true);

create policy "Public read"   on attachments for select using (true);
create policy "Public insert" on attachments for insert with check (true);
create policy "Public update" on attachments for update using (true);
create policy "Public delete" on attachments for delete using (true);

-- Storage bucket for file uploads
-- Run this in the Supabase SQL editor (requires storage schema access):
-- insert into storage.buckets (id, name, public)
-- values ('crm-attachments', 'crm-attachments', true)
-- on conflict do nothing;
--
-- create policy "Public read" on storage.objects for select using (bucket_id = 'crm-attachments');
-- create policy "Public insert" on storage.objects for insert with check (bucket_id = 'crm-attachments');
-- create policy "Public delete" on storage.objects for delete using (bucket_id = 'crm-attachments');
