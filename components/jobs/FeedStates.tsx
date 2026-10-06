import { Inbox } from "lucide-react";

export function JobCardSkeleton() {
  return (
    <div className="animate-pulse rounded border border-border bg-bg-panel p-4">
      <div className="h-3.5 w-2/3 rounded-sm bg-bg-raised" />
      <div className="mt-2 h-3 w-1/3 rounded-sm bg-bg-raised" />
      <div className="mt-4 flex gap-1.5">
        <div className="h-4 w-12 rounded-sm bg-bg-raised" />
        <div className="h-4 w-16 rounded-sm bg-bg-raised" />
        <div className="h-4 w-10 rounded-sm bg-bg-raised" />
      </div>
      <div className="mt-6 h-3 w-1/2 rounded-sm bg-bg-raised" />
    </div>
  );
}

export function EmptyFeedState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-2 rounded border border-dashed border-border py-16 text-center">
      <Inbox className="h-5 w-5 text-text-faint" aria-hidden />
      <p className="text-sm text-text-muted">
        {hasFilters ? "No jobs match your filters." : "No jobs posted yet."}
      </p>
      {hasFilters && <p className="text-xs text-text-faint">Try clearing search or status filters.</p>}
    </div>
  );
}
