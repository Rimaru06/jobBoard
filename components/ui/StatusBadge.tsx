import type { JobStatus } from "@/types/database";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<JobStatus, { color: string; dot: string }> = {
  Draft: { color: "text-status-draft", dot: "bg-status-draft" },
  Applied: { color: "text-status-applied", dot: "bg-status-applied" },
  Interviewing: { color: "text-status-interviewing", dot: "bg-status-interviewing" },
  Offered: { color: "text-status-offered", dot: "bg-status-offered" },
  Rejected: { color: "text-status-rejected", dot: "bg-status-rejected" },
};

/**
 * Read-only status pill. Pure server component — the clickable
 * status-change control that wraps this lives in a separate client
 * component (StatusMenu, Part 2) so this stays reusable anywhere
 * (lists, cards, filters) without pulling in client JS.
 */
export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-border bg-bg-panel px-2 py-0.5 text-xs font-medium",
        style.color,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden />
      {status}
    </span>
  );
}
