alter table deals add column if not exists stage_updated_at timestamptz;
update deals set stage_updated_at = created_at where stage_updated_at is null;
