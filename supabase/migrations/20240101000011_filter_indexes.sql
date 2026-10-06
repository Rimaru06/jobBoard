-- Supports the board's expanded filter set (company, sort order) added
-- in Phase 2 without falling back to sequential scans.
create index if not exists jobs_company_idx on jobs (lower(company));
create index if not exists jobs_created_at_asc_idx on jobs (created_at asc, id asc); -- for oldest-first sort
