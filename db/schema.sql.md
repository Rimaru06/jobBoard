# Database schema

The schema previously lived here as a single hand-applied SQL file.
It's now managed as ordered, idempotent Supabase CLI migrations in
[`supabase/migrations/`](../supabase/migrations) — see the project
[README](../README.md#database--migrations) for the local workflow
(`supabase start`, `supabase db reset`, `supabase gen types`).

This file is intentionally left as a pointer so old links/references
don't 404; there is no separate schema to maintain here.
