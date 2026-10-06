-- FriendBoard has no Supabase Auth session — every legitimate read or
-- write goes through a Server Action using the service-role client
-- (lib/supabase/admin.ts), which bypasses RLS entirely, after the
-- action itself verifies the fb_session/fb_admin_session cookie.
--
-- The anon key, however, is still shipped to the browser
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY) for a possible future realtime
-- subscription use. Without RLS enabled, Postgres's default grants
-- would let that public anon key read/write every table directly via
-- the PostgREST API, completely bypassing the app's session checks.
--
-- Enabling RLS with zero policies makes every table default-deny for
-- the anon/authenticated roles while leaving the service role (which
-- always bypasses RLS) fully functional — closing that gap without
-- changing any application behavior.
alter table users enable row level security;
alter table invite_tokens enable row level security;
alter table jobs enable row level security;
alter table user_job_interactions enable row level security;
alter table job_connections enable row level security;

alter table users force row level security;
alter table invite_tokens force row level security;
alter table jobs force row level security;
alter table user_job_interactions force row level security;
alter table job_connections force row level security;
