import { JobCardSkeleton } from "@/components/jobs/FeedStates";

export default function BoardLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 h-9 w-40 animate-pulse rounded bg-bg-panel" />
      <div className="h-[70px] animate-pulse rounded border border-border bg-bg-panel" />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
