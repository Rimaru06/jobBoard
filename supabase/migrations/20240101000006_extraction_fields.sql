-- Gemini extraction lifecycle per job.
-- 'pending' -> written on insert, card shows "Extracting details…"
-- 'done'    -> Gemini (or a manual edit) populated the fields
-- 'failed'  -> extraction failed; user may retry or edit manually
alter table jobs add column if not exists extraction_status extraction_status not null default 'pending';

-- Gemini's raw JSON response, stored alongside the structured fields so
-- it can be re-parsed without re-fetching if the output shape changes.
alter table jobs add column if not exists extraction_raw jsonb;

-- Per-user WhatsApp notification tracking. Array of user IDs rather than
-- a join table because it's a cosmetic "Notified" dim state, not a join
-- target — keeps it a single read.
alter table jobs add column if not exists whatsapp_notified_by uuid[] not null default '{}';

create index if not exists jobs_extraction_status_idx on jobs (extraction_status)
  where extraction_status = 'pending'; -- partial index: only pending jobs need to be queued

-- Atomic, idempotent append of a user to whatsapp_notified_by. Called
-- from markWhatsAppNotified() to avoid a read-modify-write race.
create or replace function append_whatsapp_notifier(p_job_id uuid, p_user_id uuid)
returns void as $$
begin
  update jobs
  set whatsapp_notified_by = array_append(whatsapp_notified_by, p_user_id)
  where id = p_job_id
    and not (whatsapp_notified_by @> array[p_user_id]);
end;
$$ language plpgsql;
