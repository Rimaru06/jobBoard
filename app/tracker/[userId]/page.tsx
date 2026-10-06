import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTrackerRows } from "@/lib/actions/tracker";
import { TrackerGrid } from "@/components/tracker/TrackerGrid";

export const metadata: Metadata = {
  title: "My Tracker",
  robots: { index: false, follow: false },
};

/**
 * /tracker/[userId] — a user's personal job tracker.
 *
 * Authorization:
 *   - Must be logged in (middleware redirects to /login first, but we
 *     double-check here for defence-in-depth).
 *   - Only the session owner may view their own tracker. Visiting
 *     /tracker/[someone-elses-id] returns 404 rather than 403 to avoid
 *     leaking whether a user ID exists.
 */
export default async function TrackerPage({ params }: { params: { userId: string } }) {
  const viewer = await getCurrentUser();

  // Should never reach here (middleware redirects to /login), but
  // guard regardless.
  if (!viewer) redirect(`/login?next=/tracker/${params.userId}`);

  // Return 404 rather than 403 — avoids leaking whether the id exists.
  if (viewer.id !== params.userId) notFound();

  const result = await getTrackerRows(params.userId);

  if (result.error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="rounded border border-status-rejected/30 bg-status-rejected/10 px-3 py-2 text-sm text-status-rejected">
          {result.error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-5">
        <h1 className="text-base font-semibold text-text-primary">{viewer.name}&apos;s Tracker</h1>
        <p className="text-xs text-text-muted">
          Your private view — statuses and notes are only visible to you.
        </p>
      </header>

      <TrackerGrid initialRows={result.data} />
    </main>
  );
}

// Opt out of static generation — this page is always personal and
// session-gated, so there's no safe static version to cache.
export const dynamic = "force-dynamic";
