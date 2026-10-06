-- The shared pool of postings anyone in the group can add.

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  company text not null,
  role text not null,
  experience text,                     -- free text, e.g. "2-4 yrs"
  skills text[] not null default '{}',
  salary text,                         -- free text to allow ranges/currencies
  added_by_user_id uuid not null references users (id) on delete cascade,
  is_filled boolean not null default false,
  search_text text not null default '', -- see set_job_search_text() below
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_added_by_idx on jobs (added_by_user_id);
create index if not exists jobs_is_filled_idx on jobs (is_filled);
create index if not exists jobs_skills_idx on jobs using gin (skills);
create index if not exists jobs_created_at_idx on jobs (created_at desc, id desc); -- keyset pagination

-- Single searchable column combining company/role/experience/skills so
-- the feed's search box is one ilike against an indexed column instead
-- of an OR across several unindexed ones. Can't be a generated column:
-- Postgres marks array_to_string as non-immutable. A trigger keeps the
-- ordinary column in sync instead.
create or replace function set_job_search_text()
returns trigger as $$
begin
  new.search_text := lower(
    new.company || ' ' || new.role || ' ' || coalesce(new.experience, '') || ' ' || array_to_string(new.skills, ' ')
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists jobs_search_text_set on jobs;
create trigger jobs_search_text_set
  before insert or update of company, role, experience, skills on jobs
  for each row execute function set_job_search_text();

-- Backfill rows if this migration runs against a database that already
-- has data. New/updated rows are handled by the trigger above.
update jobs
set search_text = lower(company || ' ' || role || ' ' || coalesce(experience, '') || ' ' || array_to_string(skills, ' '))
where search_text = '';

create index if not exists jobs_search_text_idx on jobs using gin (search_text gin_trgm_ops);
