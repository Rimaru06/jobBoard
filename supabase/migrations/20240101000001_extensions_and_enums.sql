-- Extensions and shared enum types. Idempotent: safe to re-run against
-- a database that already has some or all of these.

create extension if not exists pgcrypto;  -- gen_random_uuid()
create extension if not exists pg_trgm;   -- trigram index for search_text

do $$ begin
  create type user_role as enum ('admin', 'friend');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('Draft', 'Applied', 'Interviewing', 'Offered', 'Rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type connection_type as enum ('referral', 'knows_someone');
exception when duplicate_object then null; end $$;

do $$ begin
  create type extraction_status as enum ('pending', 'done', 'failed');
exception when duplicate_object then null; end $$;
