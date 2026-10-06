-- Each user's private tracking state against a shared job: status,
-- personal notes. Composite PK — one row per (user, job).
create table if not exists user_job_interactions (
  user_id uuid not null references users (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  status job_status not null default 'Draft',
  notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index if not exists user_job_interactions_job_idx on user_job_interactions (job_id);

-- Lets a friend flag "I can refer" / "I know someone" on a job so
-- others browsing can reach out. One flag per user/job.
create table if not exists job_connections (
  user_id uuid not null references users (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  type connection_type not null,
  primary key (user_id, job_id)
);

create index if not exists job_connections_job_idx on job_connections (job_id);
