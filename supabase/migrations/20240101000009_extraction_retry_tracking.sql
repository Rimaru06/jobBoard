-- Supports the extraction retry button and diagnostics: why the last
-- attempt failed, how many attempts have been made, and when the most
-- recent attempt ran (distinct from created_at/updated_at, which track
-- the job row itself, not the extraction subsystem).
alter table jobs add column if not exists extraction_failure_reason text;
alter table jobs add column if not exists extraction_retry_count integer not null default 0;
alter table jobs add column if not exists extraction_attempted_at timestamptz;
