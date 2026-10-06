"use client";

import { CircleAlert, Check } from "lucide-react";

/**
 * Inline warning shown when the pasted URL already exists. Presentational
 * only — SubmitJobForm owns the "track it" mutation and passes down
 * onTrack + tracked state.
 */
export function DuplicateNotice({
  addedBy,
  onTrack,
  isTracking,
  tracked,
}: {
  addedBy: string;
  onTrack: () => void;
  isTracking: boolean;
  tracked: boolean;
}) {
  return (
    <div className="flex items-start gap-2 rounded-sm border border-status-interviewing/30 bg-status-interviewing/10 px-3 py-2 text-xs">
      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-interviewing" aria-hidden />
      <div className="flex-1">
        <p className="text-text-primary">
          This job was already added by <span className="font-medium">{addedBy}</span>. Would you like to
          track it?
        </p>
        {tracked ? (
          <p className="mt-1 inline-flex items-center gap-1 text-status-offered">
            <Check className="h-3 w-3" aria-hidden /> Added to your tracker.
          </p>
        ) : (
          <button
            type="button"
            onClick={onTrack}
            disabled={isTracking}
            className="mt-1.5 rounded-sm border border-status-interviewing/40 px-2 py-1 text-[11px] font-medium text-status-interviewing hover:bg-status-interviewing/10 disabled:opacity-50"
          >
            {isTracking ? "Tracking…" : "Track it instead"}
          </button>
        )}
      </div>
    </div>
  );
}
