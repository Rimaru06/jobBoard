-- createJob() already normalizes the URL (lib/normalizeUrl.ts) and
-- checks for a duplicate before inserting, but that check-then-insert
-- is not atomic: two people pasting the same link within milliseconds
-- of each other could both pass the check. A unique constraint on the
-- (already-normalized) column is the real guarantee; the app-level
-- check just gives a faster/friendlier error in the common case.
create unique index if not exists jobs_url_unique_idx on jobs (url);
