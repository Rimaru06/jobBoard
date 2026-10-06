"use client";

import type { JobStatus } from "@/types/database";
import type { TrackerRow } from "@/lib/actions/tracker";
import { cn } from "@/lib/cn";

const ORDERED: JobStatus[] = ["Draft", "Applied", "Interviewing", "Offered", "Rejected"];

const STATUS_STYLES: Record<JobStatus, { bg: string; text: string; label: string }> = {
  Draft: { bg: "bg-status-draft", text: "text-status-draft", label: "Draft" },
  Applied: { bg: "bg-status-applied", text: "text-status-applied", label: "Applied" },
  Interviewing: { bg: "bg-status-interviewing", text: "text-status-interviewing", label: "Interviewing" },
  Offered: { bg: "bg-status-offered", text: "text-status-offered", label: "Offered" },
  Rejected: { bg: "bg-status-rejected", text: "text-status-rejected", label: "Rejected" },
};

/**
 * Compact pipeline summary bar: one cell per status with count and a
 * proportional fill segment beneath. Gives an instant read on how the
 * funnel looks without needing to count cards manually.
 */
export function TrackerStatsBar({ rows }: { rows: TrackerRow[] }) {
  const total = rows.length;
  if (total === 0) return null;

  const counts = Object.fromEntries(
    ORDERED.map((s) => [s, rows.filter((r) => r.interaction.status === s).length])
  ) as Record<JobStatus, number>;

  return (
    <div className="rounded border border-border bg-bg-panel p-3">
      {/* Proportional segments */}
      <div className="mb-3 flex h-1 w-full overflow-hidden rounded-full gap-px">
        {ORDERED.map((s) => {
          const pct = total > 0 ? (counts[s] / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={s}
              className={cn("h-full transition-all", STATUS_STYLES[s].bg)}
              style={{ width: `${pct}%` }}
              title={`${s}: ${counts[s]}`}
            />
          );
        })}
      </div>

      {/* Per-status counts */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {ORDERED.map((s) => (
          <div key={s} className="flex items-baseline gap-1">
            <span className={cn("text-sm font-semibold tabular-nums", STATUS_STYLES[s].text)}>
              {counts[s]}
            </span>
            <span className="text-[11px] text-text-faint">{STATUS_STYLES[s].label}</span>
          </div>
        ))}
        <div className="flex items-baseline gap-1 border-l border-border pl-5">
          <span className="text-sm font-semibold tabular-nums text-text-primary">{total}</span>
          <span className="text-[11px] text-text-faint">total</span>
        </div>
      </div>
    </div>
  );
}
