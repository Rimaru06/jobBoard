"use client";

import { useTransition } from "react";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { retryExtraction } from "@/lib/actions/extract";
import type { ExtractionStatus, Job } from "@/types/database";

type ExtractedFields = Pick<
  Job,
  "company" | "role" | "experience" | "skills" | "salary" | "extraction_status"
>;

/**
 * Shown inside a JobCard/TrackerCard when extraction hasn't resolved
 * (or didn't succeed) yet.
 * - pending: pulsing spinner + "Extracting details…"
 * - failed:  warning icon + a retry button (client-interactive) and a
 *            prompt to edit manually as a fallback
 */
export function ExtractionBanner({
  jobId,
  status,
  onExtracted,
}: {
  jobId: string;
  status: ExtractionStatus;
  /** Called with the freshly extracted fields after a successful retry
   *  so the parent card can update without a full page refetch. */
  onExtracted?: (updated: ExtractedFields) => void;
}) {
  const [isRetrying, startRetry] = useTransition();

  if (status === "done") return null;

  if (status === "pending") {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-border bg-bg px-2.5 py-2">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" aria-hidden />
        <span className="text-[11px] text-text-muted">Extracting details…</span>
      </div>
    );
  }

  function handleRetry() {
    startRetry(async () => {
      const result = await retryExtraction(jobId);
      if (result.data) {
        onExtracted?.({
          company: result.data.company,
          role: result.data.role,
          experience: result.data.experience,
          skills: result.data.skills,
          salary: result.data.salary,
          extraction_status: "done",
        });
      }
    });
  }

  // failed
  return (
    <div className="flex items-center justify-between gap-2 rounded-sm border border-status-interviewing/30 bg-status-interviewing/10 px-2.5 py-2">
      <span className="inline-flex items-center gap-2 text-[11px] text-text-muted">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-status-interviewing" aria-hidden />
        Extraction failed — retry or edit manually.
      </span>
      <button
        type="button"
        onClick={handleRetry}
        disabled={isRetrying}
        className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-status-interviewing/40 px-2 py-1 text-[11px] font-medium text-status-interviewing hover:bg-status-interviewing/10 disabled:opacity-50"
      >
        {isRetrying ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        ) : (
          <RotateCw className="h-3 w-3" aria-hidden />
        )}
        Retry
      </button>
    </div>
  );
}
