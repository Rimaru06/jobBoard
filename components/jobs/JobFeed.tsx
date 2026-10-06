"use client";

import { Suspense, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { getJobsPage, type JobFiltersInput, type JobsCursor } from "@/lib/actions/jobs";
import type { JobWithContext } from "@/types/database";
import { FilterBar } from "@/components/jobs/FilterBar";
import { JobGrid } from "@/components/jobs/JobGrid";
import { JobCard } from "@/components/jobs/JobCard";
import { JobCardSkeleton, EmptyFeedState } from "@/components/jobs/FeedStates";

const DEFAULT_FILTERS: JobFiltersInput = { filled: "open", sort: "newest" };

/**
 * Client-side orchestrator for the feed: holds the accumulated job
 * list + cursor, re-fetches page 1 whenever filters change, and loads
 * further pages when the sentinel at the bottom scrolls into view.
 *
 * Data fetching itself stays server-side (getJobsPage Server Action) —
 * this component only sequences *when* to call it.
 */
export function JobFeed({
  initialJobs,
  initialCursor,
  refreshSignal = 0,
  viewerId,
  viewerRole,
}: {
  initialJobs: JobWithContext[];
  initialCursor: JobsCursor | null;
  /** Bump this (e.g. from a parent after a successful createJob) to
   *  refetch page 1 with current filters — used to surface a newly
   *  submitted job at the top of the feed. */
  refreshSignal?: number;
  viewerId: string | null;
  viewerRole: string | null;
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [cursor, setCursor] = useState(initialCursor);
  const [filters, setFilters] = useState<JobFiltersInput>(DEFAULT_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Filters changed, or a new job was just created → replace the list
  // from page 1. Skips the very first render since initialJobs already
  // covers the default filters.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await getJobsPage(filters, null);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setJobs(result.data.jobs);
      setCursor(result.data.nextCursor);
    });
  }, [filters, refreshSignal]);

  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingMore || isPending) return;
    setIsLoadingMore(true);
    const result = await getJobsPage(filtersRef.current, cursor);
    setIsLoadingMore(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setJobs((prev) => [...prev, ...result.data.jobs]);
    setCursor(result.data.nextCursor);
  }, [cursor, isLoadingMore, isPending]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" } // start fetching before the sentinel is actually visible
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const hasActiveFilters = Boolean(
    filters.query?.trim() ||
    filters.experience?.length ||
    filters.skills?.length ||
    filters.company?.trim() ||
    (filters.filled && filters.filled !== "open")
  );

  return (
    <div className="flex flex-col gap-4">
      <Suspense
        fallback={<div className="h-[70px] animate-pulse rounded border border-border bg-bg-panel" />}
      >
        <FilterBar onChange={setFilters} />
      </Suspense>

      {error && (
        <p
          role="alert"
          className="rounded border border-status-rejected/30 bg-status-rejected/10 px-3 py-2 text-xs text-status-rejected"
        >
          {error}
        </p>
      )}

      <JobGrid>
        {isPending ? (
          Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)
        ) : jobs.length === 0 ? (
          <EmptyFeedState hasFilters={hasActiveFilters} />
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} viewerId={viewerId} viewerRole={viewerRole} />)
        )}
      </JobGrid>

      {!isPending && cursor && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoadingMore && (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-faint">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading more…
            </span>
          )}
        </div>
      )}
    </div>
  );
}
