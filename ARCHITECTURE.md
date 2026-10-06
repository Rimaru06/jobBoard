# FriendBoard — Architecture

For setup/env vars/migration commands, see [README.md](./README.md). This
file is about _how_ the app is put together and _why_.

## Rules

1. **RSC by default.** Every component is a Server Component unless it
   needs state, effects, or event handlers — those get `"use client"` and
   are pushed as far down the tree as possible (e.g. `FilterBar`, not the
   whole `/board` page). Presentation-only pieces (`StatusBadge`,
   `UserChip`, `TimeChip`) are pure server components; they take data as
   props and render.
2. **Server Actions own all mutations, and all reads of privileged data.**
   No client-side Supabase calls for reads or writes.
   `lib/supabase/client.ts` (anon key, browser) exists only for a possible
   future realtime subscription and is not used for querying today.
   `lib/supabase/server.ts` (anon key, RLS-governed) is reserved for the
   day real RLS policies exist. Every actual query in this app goes
   through `lib/supabase/admin.ts` (service-role client) from inside a
   Server Action (`lib/actions/*.ts`), which:
   - never runs before verifying `getCurrentUser()` (`fb_session`) or
     `isAdminSession()` (`fb_admin_session`), and
   - never exposes `SUPABASE_SERVICE_ROLE_KEY` outside server code
     (it's not a `NEXT_PUBLIC_*` variable, so Next never bundles it to
     the client).
3. **Every Server Action returns `ActionResult<T>`.** Success or failure,
   never a thrown error crossing the server/client boundary. Failures go
   through `handleServerActionError` (`lib/errors.ts`), which:
   - re-throws Next.js's own internal control-flow errors (`redirect()`,
     `notFound()`, dynamic-server-usage during static generation — all
     identifiable by a `.digest` string) instead of swallowing them,
   - logs `{ code, message, details, hint }` for every Postgrest/JS error
     (keys always present, `null` when absent) without ever including
     secrets, and
   - maps common Postgres error codes (`23505`, `23503`, `23502`,
     `42501`, `PGRST116`) to a safe, specific message + `ErrorCode`.
4. **Every server-action input is Zod-validated, not just client forms.**
   Client components validate with React Hook Form + `zodResolver` for
   inline UX; the Server Action re-validates independently with the same
   or a corresponding schema from `lib/validations/*.ts` — one small file
   per concern (`pin.ts`, `invite.ts`, `job.ts`, `filters.ts`, `tracker.ts`,
   `extraction.ts`), not one large shared file.
5. **Design tokens live in one place.** `tailwind.config.ts` is the single
   source for color/spacing/radius/shadow — components reference
   `bg-bg-panel`, `text-status-offered`, etc., never raw hex values.
6. **Componentization is atomic.** Small, single-purpose pieces
   (`StatusBadge`, `UserChip`) compose into larger ones (`JobCard`), which
   compose into page sections. Data-fetching, form, list/grid, card, and
   action-menu responsibilities are separate components/hooks, not one
   file doing everything.

## Directory layout

```
app/                    routes, layouts, global styles, robots.ts/sitemap.ts
  page.tsx              public landing page ("/")
  board/                the shared job feed ("/board", signed-in only)
  tracker/[userId]/      personal tracker (self only)
  admin/                 Creator Dashboard (separate PIN gate)
  login/ join/           the two unauthenticated entry points
components/ui/          atomic, generic (StatusBadge, UserChip, Toast, …)
components/jobs/        board domain components (JobCard, FilterBar, …)
components/tracker/     tracker domain components (TrackerCard, …)
components/admin/       Creator Dashboard components
components/auth/        PinInput, JoinForm, LoginForm
lib/supabase/           admin.ts (service role) / server.ts / client.ts
lib/actions/            Server Actions — the only place the DB is touched
lib/validations/        one small Zod schema module per concern
lib/rateLimit/          durable rate-limit adapter interface + memory impl
lib/errors.ts           handleServerActionError + ActionResult type
types/database.ts       Supabase-generated-shape DB types (npm run db:types)
supabase/migrations/    ordered, idempotent SQL migrations (source of truth)
tests/                  Vitest: pure logic + mocked Server Action tests
```

## Auth model

- **No email/password, no open sign-up.** Identity = a name (set once,
  from the invite) + a 6-digit PIN, bcrypt-hashed. The only way in is an
  admin-issued invite link (`/join?token=…`).
- **Three cookies, deliberately different lifetimes/secrets:**
  `fb_session` (30 days, HS256 via `jose` — works identically in Server
  Actions and Edge middleware), `fb_uid` (1 year, _not_ a credential —
  only lets `/login` skip straight to "enter your PIN"), and
  `fb_admin_session` (12 hours, a separate secret so a leaked user-session
  secret can never forge admin access).
- **Invite tokens are single-use by construction.** `redeemInvite`
  atomically claims the row (`UPDATE … WHERE is_used = false`) before
  creating the user, then records `used_at` — a real audit trail for the
  Creator Dashboard's Pending/Joined view, not just a boolean flip.
- **Rate limiting** goes through the `RateLimiter` interface
  (`lib/rateLimit/types.ts`); see README for the production Redis swap.

## Data layer

- **Migrations** (`supabase/migrations/`) are the single source of truth
  for schema — ordered, idempotent (`create table if not exists`,
  `create or replace function`, guarded `do $$ … exception when
duplicate_object$$` for enums), one concern per file.
- **RLS is enabled with zero policies** on every table
  (`…_row_level_security.sql`) — default-deny for the anon/authenticated
  Postgres roles, since the app has no Supabase Auth session for a policy
  to key off of yet. The service-role client (used exclusively from
  verified Server Actions) bypasses RLS entirely and is the only thing
  that ever touches these tables. See README's
  [Security limitations](./README.md#security-limitations--future-rls-plan)
  for the planned next step.
- **`jobs.url` has a real unique index**, not just an app-level
  check-then-insert — `createJob()` still checks first (for a fast,
  friendly duplicate message) but treats a `23505` from the insert itself
  as the authoritative duplicate signal, since the check and insert
  aren't atomic.
- **Keyset (cursor) pagination** on `(created_at, id)` for the board feed
  — never offset pagination, and every query is capped at a fixed page
  size. Filters (query/company/skills/experience/fill-state/sort) are
  validated with `jobFiltersSchema` and use the indexes added in
  `supabase/migrations/…_filter_indexes.sql`.

## Extraction pipeline (`lib/actions/extract.ts`)

- Uses `gemini-2.5-flash-lite` with `responseMimeType: "application/json"`
  for cheap, structured output; input is capped aggressively (~12k chars)
  after stripping script/style/nav/header/footer/svg tags.
- Gemini's output is validated with `extractedJobSchema`
  (`lib/validations/extraction.ts`) before ever touching the database —
  malformed fields fall back to safe defaults (`.catch(...)`) rather than
  throwing.
- `extraction_status` (`pending` → `done`/`failed`), a safe
  `extraction_failure_reason`, `extraction_retry_count`, and
  `extraction_attempted_at` are all recorded — never the raw
  stack trace, never the fetched page content.
- **Extraction failure never blocks or hides the created job.** The job
  row exists before extraction ever runs; failure only flips the status
  so the card offers "Retry" (`retryExtraction`, re-verifies the session
  and re-derives the URL server-side) or manual edit as a fallback.

## Open items

- Real RLS policies keyed off a verified `fb_session` claim (see README).
- `lib/supabase/client.ts` / `server.ts` remain reserved for a future
  realtime subscription — not wired into any current read path.
