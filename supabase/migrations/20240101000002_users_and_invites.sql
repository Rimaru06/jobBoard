-- Passwordless, PIN + invite-token based identity for a closed friend
-- group. No email/password; see lib/actions/auth.ts for the redemption
-- flow this table pair supports.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pin_hash text not null,              -- bcrypt hash, never the raw PIN
  role user_role not null default 'friend',
  created_at timestamptz not null default now()
);

-- Admin pre-generates one row per friend; the friend redeems it once
-- to set their name + PIN and create their `users` row.
create table if not exists invite_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,     -- hash of the invite code, never the raw code
  assigned_name text not null,
  is_used boolean not null default false,
  created_at timestamptz not null default now()
);
