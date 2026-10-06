"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import type { TrackerFilters, TrackerSort } from "@/lib/actions/tracker";
import type { JobStatus } from "@/types/database";
import { cn } from "@/lib/cn";

const STATUSES: JobStatus[] = ["Draft", "Applied", "Interviewing", "Offered", "Rejected"];

const STATUS_ACTIVE: Record<JobStatus, string> = {
  Draft: "border-status-draft/40        bg-status-draft/10        text-status-draft",
  Applied: "border-status-applied/40      bg-status-applied/10      text-status-applied",
  Interviewing: "border-status-interviewing/40 bg-status-interviewing/10 text-status-interviewing",
  Offered: "border-status-offered/40      bg-status-offered/10      text-status-offered",
  Rejected: "border-status-rejected/40     bg-status-rejected/10     text-status-rejected",
};

const SORT_OPTIONS: { value: TrackerSort; label: string }[] = [
  { value: "updated_at_desc", label: "Last updated" },
  { value: "added_at_desc", label: "Newest job" },
  { value: "status_asc", label: "Status ↑" },
  { value: "status_desc", label: "Status ↓" },
];

const DEBOUNCE_MS = 250;

export function TrackerFilterBar({
  onChange,
  counts,
}: {
  onChange: (filters: TrackerFilters) => void;
  /** Optional per-status counts shown on the filter pills. */
  counts?: Partial<Record<JobStatus, number>>;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statuses, setStatuses] = useState<JobStatus[]>([]);
  const [sort, setSort] = useState<TrackerSort>("updated_at_desc");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    onChange({ query: debouncedQuery, statuses, sort });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, statuses, sort]);

  function toggleStatus(s: JobStatus) {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-border bg-bg-panel p-3">
      {/* Row 1: search + sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search role, company, skill…"
            className="w-full rounded-sm border border-border bg-bg py-1.5 pl-8 pr-8 text-xs text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as TrackerSort)}
          className="rounded-sm border border-border bg-bg px-2 py-1.5 text-xs text-text-muted focus:border-accent focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: status pills */}
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => {
          const active = statuses.includes(s);
          const count = counts?.[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors",
                active ? STATUS_ACTIVE[s] : "border-border text-text-muted hover:border-border-hover"
              )}
            >
              {s}
              {count !== undefined && (
                <span className={cn("rounded px-1 text-[10px]", active ? "bg-white/10" : "bg-bg-raised")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {statuses.length > 0 && (
          <button
            type="button"
            onClick={() => setStatuses([])}
            className="text-[11px] text-text-faint hover:text-text-muted"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
