-- Mandays Rate (rate card benchmark) menu. Run in Supabase Dashboard -> SQL Editor.

CREATE TABLE IF NOT EXISTS mandays_roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name     TEXT NOT NULL UNIQUE,
  cogs          BIGINT NOT NULL DEFAULT 0,
  low_rate      BIGINT NOT NULL DEFAULT 0,
  med_rate      BIGINT NOT NULL DEFAULT 0,
  max_price     BIGINT NOT NULL DEFAULT 0,
  created_by_id UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mandays_client_rates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id        UUID NOT NULL REFERENCES mandays_roles(id) ON DELETE CASCADE,
  client_label   TEXT NOT NULL,
  rate_label     TEXT NOT NULL,
  rate_value     BIGINT NOT NULL DEFAULT 0,
  classification TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  created_by_id  UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mandays_client_rates_role_idx ON mandays_client_rates(role_id);
