import type { Metadata } from "next";
import { getJobsPage } from "@/lib/actions/jobs";
import { getCurrentUser } from "@/lib/auth";
import { BoardShell } from "@/components/jobs/BoardShell";

export const metadata: Metadata = {
  title: "Board",
  description:
    "Jobs the group has found, newest first — shared postings, referrals, and your private tracker.",
};

// Always personal/session-gated (interaction state, connections) —
// no safe static version to cache.
export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const [result, viewer] = await Promise.all([
    getJobsPage({ filled: "open", sort: "newest" }, null),
    getCurrentUser(),
  ]);

  if (result.error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p
          role="alert"
          className="rounded border border-status-rejected/30 bg-status-rejected/10 px-3 py-2 text-sm text-status-rejected"
        >
          {result.error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-5">
        <h1 className="text-base font-semibold text-text-primary">FriendBoard</h1>
        <p className="text-xs text-text-muted">Jobs the group has found, newest first.</p>
      </header>

      <BoardShell
        initialJobs={result.data.jobs}
        initialCursor={result.data.nextCursor}
        viewerId={viewer?.id ?? null}
        viewerRole={viewer?.role ?? null}
      />
    </main>
  );
}
