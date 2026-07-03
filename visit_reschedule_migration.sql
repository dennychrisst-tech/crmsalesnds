-- Visit reschedule -> auto-create follow-up visit. Run in Supabase Dashboard -> SQL Editor.

ALTER TABLE visits ADD COLUMN IF NOT EXISTS rescheduled_to_id UUID;
