-- Initial migration: creates all tables with IF NOT EXISTS
-- Safe to run against existing Supabase DB (idempotent)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (custom auth, replaces Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'employee',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  sector        TEXT NOT NULL DEFAULT 'Banking',
  pic           JSONB NOT NULL DEFAULT '[]',
  contact       TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'Prospect',
  notes         TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',
  website       TEXT NOT NULL DEFAULT '',
  company_size  TEXT NOT NULL DEFAULT '',
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  title         TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  notes         TEXT NOT NULL DEFAULT '',
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Visits
CREATE TABLE IF NOT EXISTS visits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  purpose       TEXT NOT NULL DEFAULT '',
  approach      TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'Planned',
  pic           TEXT NOT NULL DEFAULT '',
  pic_client    TEXT NOT NULL DEFAULT '',
  summary       TEXT NOT NULL DEFAULT '',
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deals
CREATE TABLE IF NOT EXISTS deals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  value            BIGINT NOT NULL DEFAULT 0,
  stage            TEXT NOT NULL DEFAULT 'Lead',
  deal_type        TEXT NOT NULL DEFAULT '',
  product          TEXT NOT NULL DEFAULT '',
  close_date       DATE,
  notes            TEXT NOT NULL DEFAULT '',
  owner            TEXT NOT NULL DEFAULT '',
  win_loss_reason  TEXT NOT NULL DEFAULT '',
  competitor       TEXT NOT NULL DEFAULT '',
  stage_updated_at TIMESTAMPTZ,
  created_by_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product       TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'Initiation',
  value         BIGINT NOT NULL DEFAULT 0,
  golive        DATE,
  notes         TEXT NOT NULL DEFAULT '',
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  due_date      DATE,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  deal_id       UUID REFERENCES deals(id) ON DELETE SET NULL,
  assigned_to   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'Open',
  notes         TEXT NOT NULL DEFAULT '',
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'Proposal Teknis',
  status        TEXT NOT NULL DEFAULT 'Draft',
  date          DATE,
  notes         TEXT NOT NULL DEFAULT '',
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID REFERENCES deals(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_size     BIGINT NOT NULL DEFAULT 0,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID REFERENCES deals(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'Note',
  description   TEXT NOT NULL DEFAULT '',
  created_by    TEXT NOT NULL DEFAULT '',
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL DEFAULT '',
  date          DATE NOT NULL,
  type          TEXT NOT NULL DEFAULT 'Meeting Online',
  description   TEXT NOT NULL DEFAULT '',
  created_by    TEXT NOT NULL DEFAULT '',
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS visits_client_id_idx ON visits(client_id);
CREATE INDEX IF NOT EXISTS visits_date_idx ON visits(date);
CREATE INDEX IF NOT EXISTS deals_client_id_idx ON deals(client_id);
CREATE INDEX IF NOT EXISTS contacts_client_id_idx ON contacts(client_id);
CREATE INDEX IF NOT EXISTS tasks_client_id_idx ON tasks(client_id);
CREATE INDEX IF NOT EXISTS tasks_deal_id_idx ON tasks(deal_id);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);
CREATE INDEX IF NOT EXISTS documents_deal_id_idx ON documents(deal_id);
CREATE INDEX IF NOT EXISTS attachments_deal_id_idx ON attachments(deal_id);
CREATE INDEX IF NOT EXISTS attachments_client_id_idx ON attachments(client_id);
CREATE INDEX IF NOT EXISTS activities_deal_id_idx ON activities(deal_id);
CREATE INDEX IF NOT EXISTS activities_client_id_idx ON activities(client_id);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);
