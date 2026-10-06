# FriendBoard

A private, invite-only job board for one friend group. No public sign-up —
you get in with a 6-digit PIN, set once from a personal invite link. Post
jobs you find, flag referrals for each other, and track your own
applications privately. See [ARCHITECTURE.md](./ARCHITECTURE.md) for how
it's built.

## Product overview

- **Shared board** (`/board`) — anyone in the group can post a job link;
  Gemini extracts company/role/skills/salary in the background so posting
  is "paste a link and go."
- **Private tracker** (`/tracker/[userId]`) — mark any shared job as Draft /
  Applied / Interviewing / Offered / Rejected, with private notes only you
  can see.
- **Invite-only access** — an admin generates single-use invite links from
  a Creator Dashboard (`/admin`); there is no email/password and no public
  registration.

## Route map

| Route                         | Access                          | Purpose                                   |
| ----------------------------- | ------------------------------- | ----------------------------------------- |
| `/`                           | Public                          | Landing page                              |
| `/login`                      | Public                          | PIN re-entry for a remembered browser     |
| `/join?token=…`               | Public (requires a valid token) | Redeem a single-use invite, set a PIN     |
| `/board`                      | Signed in                       | Shared job feed                           |
| `/tracker/[userId]`           | Signed in, self only            | Personal application tracker              |
| `/admin`                      | Master Admin PIN                | Generate invites, view Pending/Joined     |
| `/robots.txt`, `/sitemap.xml` | Public                          | Crawling directives for the public routes |

## Authentication & session model

No Supabase Auth — a custom invite + PIN system, enforced entirely in
Server Actions:

- **Identity** = a name (set once, from an invite) + a bcrypt-hashed 6-digit
  PIN. The only way in is an admin-issued single-use invite link.
- **Cookies**: `fb_session` (30 days, signed HS256 via `jose`) proves who's
  logged in; `fb_uid` (1 year, _not_ a credential) remembers which user a
  browser belongs to so `/login` can skip straight to "enter your PIN";
  `fb_admin_session` (12 hours, separate secret) gates `/admin` only.
- **Data access rule**: all database access happens in Server Actions
  (`lib/actions/*.ts`) using the service-role client
  (`lib/supabase/admin.ts`). Every privileged action verifies the
  `fb_session` or `fb_admin_session` cookie (via `getCurrentUser()` /
  `isAdminSession()`) _before_ touching the database — the service-role
  key never reaches the browser.
- **Rate limiting**: PIN attempts are throttled via a small adapter
  interface (`lib/rateLimit/`). The default implementation is in-memory
  (fine for a single-instance deployment); see
  [Production rate limiting](#production-rate-limiting) to swap in Redis.

## Environment variables

Copy `.env.example` to `.env.local` and fill these in. **Never commit real
values** — `SUPABASE_SERVICE_ROLE_KEY` in particular must never reach the
browser or a public repo.

| Variable                        | Required             | Notes                                                                                                                         |
| ------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes                  | Your Supabase project URL.                                                                                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes                  | Public anon key. RLS (see [supabase/migrations](./supabase/migrations)) denies it by default.                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes                  | Server-only. Used exclusively in `lib/supabase/admin.ts`.                                                                     |
| `NEXT_PUBLIC_APP_URL`           | Recommended          | Canonical origin, used for invite links, metadata, and `sitemap.ts`.                                                          |
| `SESSION_SECRET`                | Yes                  | Signs `fb_session`. Generate with `openssl rand -base64 32`.                                                                  |
| `ADMIN_SESSION_SECRET`          | Yes                  | Signs `fb_admin_session`. Must differ from `SESSION_SECRET`.                                                                  |
| `ADMIN_PIN_HASH`                | Yes                  | bcrypt hash of the Master Admin PIN — generate with `node scripts/hash-pin.js <pin>`.                                         |
| `GEMINI_API_KEY`                | Yes (for extraction) | [Get a key](https://aistudio.google.com/app/apikey). Extraction failure never blocks job creation if this is missing/invalid. |

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values above
npm run dev
```

## Database & migrations

Schema lives as ordered, idempotent SQL files in
[`supabase/migrations/`](./supabase/migrations) — no hand-applied
`schema.sql` to keep in sync.

```bash
# One-time: install the Supabase CLI (https://supabase.com/docs/guides/cli)
npx supabase login
npx supabase link --project-ref <your-project-ref>

# Local Postgres + Studio via Docker
npx supabase start

# Apply every migration in supabase/migrations/, in order
npx supabase db reset          # local database
npx supabase db push           # remote/linked project

# Regenerate types/database.ts from whichever database you just migrated
npm run db:types               # wraps: supabase gen types typescript --local > types/database.ts
```

Adding a new migration:

```bash
npx supabase migration new <short_description>
# edit the generated file under supabase/migrations/, then re-run db:types
```

## Type generation

`types/database.ts` mirrors the Supabase CLI's generated shape (`Row` /
`Insert` / `Update` / `Relationships` / `Functions` per table) so the app
type-checks without a live database. **Always regenerate it after a
migration** with `npm run db:types` — never hand-edit the `Database` type
itself; the convenience aliases below it (`Job`, `JobWithContext`, etc.)
are derived from `Database` and don't need touching.

## Production rate limiting

The default `lib/rateLimit/memory.ts` adapter is per-process — correct for
a single long-running instance, not correct across multiple
serverless/edge instances. For a multi-instance deployment, implement the
`RateLimiter` interface (`lib/rateLimit/types.ts`) against
[Upstash Redis](https://upstash.com/) and swap the export in
`lib/rateLimit/index.ts` — no call sites elsewhere need to change. See the
doc comment in that file for a minimal implementation sketch.

## Scripts

| Command                           | Purpose                                                         |
| --------------------------------- | --------------------------------------------------------------- |
| `npm run dev`                     | Start the dev server                                            |
| `npm run build`                   | Production build                                                |
| `npm run typecheck`               | `tsc --noEmit`                                                  |
| `npm run lint`                    | ESLint (`next lint`)                                            |
| `npm run test`                    | Run the Vitest suite once                                       |
| `npm run test:watch`              | Vitest in watch mode                                            |
| `npm run format` / `format:check` | Prettier write / check                                          |
| `npm run db:types`                | Regenerate `types/database.ts` from the local Supabase instance |

## Tests

Vitest covers pure logic and Server Action validation/authorization paths
(URL normalization, every Zod schema, invite redemption, job creation +
duplicate detection, filter validation, Gemini output parsing) using a
small chainable Supabase mock (`tests/helpers/supabaseMock.ts`) rather than
a live database:

```bash
npm run test
```

## Deployment checklist

1. Run migrations against the target Supabase project: `npx supabase db push`.
2. Set every variable in [Environment variables](#environment-variables) in
   your host's secret store — `SUPABASE_SERVICE_ROLE_KEY` server-side only.
3. `npm run typecheck && npm run lint && npm run test && npm run build`
   locally (or let CI do it — see `.github/workflows/ci.yml`) before
   deploying.
4. Regenerate and commit `types/database.ts` if the migration set changed:
   `npm run db:types`.
5. Confirm `NEXT_PUBLIC_APP_URL` matches the real deployed origin (used for
   invite links, canonical URLs, and the sitemap).

## Security limitations & future RLS plan

- **RLS is default-deny, not policy-driven.** Every table has Row Level
  Security enabled with zero policies (`supabase/migrations/…_row_level_security.sql`),
  so the anon key can't read or write anything directly — but that also
  means there are no fine-grained Postgres-level policies yet. All
  authorization is enforced in application code (Server Actions checking
  `fb_session`/`fb_admin_session`), not in the database.
- **Planned**: real RLS policies keyed off a verified claim from
  `fb_session` (via a Postgres function reading a signed cookie/JWT),
  so authorization is enforced at both layers — defense in depth instead
  of app-code-only.
- **Rate limiting is best-effort and in-memory** by default; see
  [Production rate limiting](#production-rate-limiting).
- **Invite redemption is two steps, not one transaction**: the token is
  atomically claimed (`UPDATE … WHERE is_used = false`) before the user
  row is created. If user creation fails after the claim succeeds, the
  token is burned without an account being created — a deliberate
  trade-off (favors "never reusable" over "never lost"); see the code
  comment in `lib/actions/auth.ts` for the fix if it ever matters.
