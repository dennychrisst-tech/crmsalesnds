-- Marks the new follow-up visit as originating from a reschedule.
-- Run in Supabase Dashboard -> SQL Editor (after visit_reschedule_migration.sql).

ALTER TABLE visits ADD COLUMN IF NOT EXISTS rescheduled_from_id UUID;
