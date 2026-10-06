create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists jobs_set_updated_at on jobs;
create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function set_updated_at();

drop trigger if exists interactions_set_updated_at on user_job_interactions;
create trigger interactions_set_updated_at
  before update on user_job_interactions
  for each row execute function set_updated_at();
