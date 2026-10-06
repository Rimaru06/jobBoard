"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { upsertInteraction } from "@/lib/actions/tracker";
import { cn } from "@/lib/cn";
import type { JobStatus } from "@/types/database";

const STATUSES: JobStatus[] = ["Draft", "Applied", "Interviewing", "Offered", "Rejected"];

const STATUS_STYLES: Record<JobStatus, { dot: string; text: string; bg: string; border: string }> = {
  Draft: {
    dot: "bg-status-draft",
    text: "text-status-draft",
    bg: "bg-status-draft/10",
    border: "border-status-draft/30",
  },
  Applied: {
    dot: "bg-status-applied",
    text: "text-status-applied",
    bg: "bg-status-applied/10",
    border: "border-status-applied/30",
  },
  Interviewing: {
    dot: "bg-status-interviewing",
    text: "text-status-interviewing",
    bg: "bg-status-interviewing/10",
    border: "border-status-interviewing/30",
  },
  Offered: {
    dot: "bg-status-offered",
    text: "text-status-offered",
    bg: "bg-status-offered/10",
    border: "border-status-offered/30",
  },
  Rejected: {
    dot: "bg-status-rejected",
    text: "text-status-rejected",
    bg: "bg-status-rejected/10",
    border: "border-status-rejected/30",
  },
};

/**
 * Clickable status badge that opens an inline dropdown.
 * Optimistic: updates visually before the server round-trip and rolls
 * back if the action fails. Isolated client component so the parent
 * TrackerCard doesn't have to be a client component itself.
 */
export function StatusMenu({
  jobId,
  initialStatus,
  onChanged,
}: {
  jobId: string;
  initialStatus: JobStatus;
  onChanged?: (next: JobStatus) => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  function select(next: JobStatus) {
    setOpen(false);
    if (next === status) return;
    const prev = status;
    setStatus(next); // optimistic
    onChanged?.(next);
    startTransition(async () => {
      const result = await upsertInteraction(jobId, { status: next });
      if (result.error) {
        setStatus(prev); // roll back
        onChanged?.(prev);
      }
    });
  }

  const s = STATUS_STYLES[status];

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium transition-opacity",
          s.bg,
          s.border,
          s.text,
          isPending && "opacity-60"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} aria-hidden />
        {status}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Change status"
          className="absolute left-0 top-full z-30 mt-1 min-w-[140px] overflow-hidden rounded border border-border bg-bg-panel shadow-xl"
        >
          {STATUSES.map((s) => {
            const st = STATUS_STYLES[s];
            const isCurrent = s === status;
            return (
              <li key={s} role="option" aria-selected={isCurrent}>
                <button
                  type="button"
                  onClick={() => select(s)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors",
                    isCurrent
                      ? cn("font-medium", st.text, st.bg)
                      : "text-text-muted hover:bg-bg-raised hover:text-text-primary"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", st.dot)} aria-hidden />
                  {s}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
