"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { TrackerFilterBar } from "@/components/tracker/TrackerFilterBar";
import { TrackerStatsBar } from "@/components/tracker/TrackerStatsBar";
import { TrackerCard } from "@/components/tracker/TrackerCard";
import type { TrackerFilters, TrackerRow } from "@/lib/actions/tracker";
import type { JobStatus } from "@/types/database";

/**
 * Client shell that owns:
 *   1. The full list of tracker rows (server-fetched, passed as props)
 *   2. Active filter/sort state from TrackerFilterBar
 *   3. Local removal — when the user removes a card, it disappears
 *      instantly without a page refetch
 *
 * All filtering happens in-memory here (not via another server fetch)
 * because the tracker is bounded to a single user's jobs and fast
 * in-memory filtering is indistinguishable from a round-trip at this
 * cardinality.
 */
export function TrackerGrid({ initialRows }: { initialRows: TrackerRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [filters, setFilters] = useState<TrackerFilters>({
    sort: "updated_at_desc",
    statuses: [],
    query: "",
  });

  // Per-status counts for the filter bar pills — computed from the
  // full unfiltered list so counts reflect totals, not current filter.
  const counts = useMemo(() => {
    const c: Partial<Record<JobStatus, number>> = {};
    for (const r of rows) {
      c[r.interaction.status] = (c[r.interaction.status] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  // Client-side filter + sort, mirroring the logic in getTrackerRows
  // but against live client state (so removing/updating cards is
  // reflected instantly without another server round-trip).
  const filtered = useMemo(() => {
    let result = [...rows];

    if (filters.statuses?.length) {
      result = result.filter((r) => filters.statuses!.includes(r.interaction.status));
    }

    if (filters.query?.trim()) {
      const q = filters.query.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.job.company.toLowerCase().includes(q) ||
          r.job.role.toLowerCase().includes(q) ||
          r.job.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    const sort = filters.sort ?? "updated_at_desc";
    const STATUS_RANK: Record<JobStatus, number> = {
      Draft: 0,
      Applied: 1,
      Interviewing: 2,
      Offered: 3,
      Rejected: 4,
    };
    result.sort((a, b) => {
      if (sort === "updated_at_desc")
        return new Date(b.interaction.updated_at).getTime() - new Date(a.interaction.updated_at).getTime();
      if (sort === "added_at_desc")
        return new Date(b.job.created_at).getTime() - new Date(a.job.created_at).getTime();
      if (sort === "status_asc") return STATUS_RANK[a.interaction.status] - STATUS_RANK[b.interaction.status];
      return STATUS_RANK[b.interaction.status] - STATUS_RANK[a.interaction.status];
    });

    return result;
  }, [rows, filters]);

  function handleRemoved(jobId: string) {
    setRows((prev) => prev.filter((r) => r.job.id !== jobId));
  }

  return (
    <div className="flex flex-col gap-4">
      <TrackerStatsBar rows={rows} />

      <TrackerFilterBar onChange={setFilters} counts={counts} />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded border border-dashed border-border py-16 text-center">
          <ClipboardList className="h-5 w-5 text-text-faint" aria-hidden />
          <p className="text-sm text-text-muted">
            {rows.length === 0
              ? "No jobs tracked yet — add one from the board."
              : "No jobs match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => (
            <TrackerCard
              key={row.job.id}
              job={row.job}
              interaction={row.interaction}
              onRemoved={handleRemoved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
