"use client";

import { useState } from "react";
import { Briefcase, DollarSign, ExternalLink, Trash2 } from "lucide-react";
import { removeFromTracker } from "@/lib/actions/tracker";
import { StatusMenu } from "@/components/tracker/StatusMenu";
import { NotesEditor } from "@/components/tracker/NotesEditor";
import { UserChip } from "@/components/ui/UserChip";
import { TimeChip } from "@/components/ui/TimeChip";
import { ExtractionBanner } from "@/components/jobs/ExtractionBanner";
import { cn } from "@/lib/cn";
import type { JobStatus, JobWithContext, UserJobInteraction } from "@/types/database";

const STATUS_GLOW: Record<JobStatus, string> = {
  Draft: "rgba(122,128,136,0.2)",
  Applied: "rgba(91,141,239,0.2)",
  Interviewing: "rgba(224,165,38,0.2)",
  Offered: "rgba(63,185,80,0.3)",
  Rejected: "rgba(229,83,75,0.15)",
};

/**
 * TrackerCard is the tracker-specific counterpart to JobCard on the
 * board. Key differences:
 *   - StatusMenu replaces the read-only StatusBadge (user controls it)
 *   - NotesEditor is always present at the bottom
 *   - Remove button lets user un-track without touching the shared job
 *   - Glow color shifts with status so Offered cards glow green,
 *     Rejected cards are visually quieter, etc.
 */
export function TrackerCard({
  job: initialJob,
  interaction: initialInteraction,
  onRemoved,
}: {
  job: JobWithContext;
  interaction: UserJobInteraction;
  onRemoved: (jobId: string) => void;
}) {
  const [job, setJob] = useState(initialJob);
  const [interaction, setInteraction] = useState(initialInteraction);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function handleRemove() {
    setIsRemoving(true);
    setRemoveError(null);
    const result = await removeFromTracker(job.id);
    setIsRemoving(false);
    if (result.error) {
      setRemoveError(result.error.message);
      return;
    }
    onRemoved(job.id);
  }

  const glowColor = STATUS_GLOW[interaction.status];
  const visibleSkills = job.skills.slice(0, 4);
  const hiddenCount = job.skills.length - visibleSkills.length;

  return (
    <article
      className="flex flex-col rounded border border-border bg-bg-panel p-4 transition-shadow hover:shadow-glow-sm"
      style={{ "--glow-color": glowColor } as React.CSSProperties}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-text-primary">{job.role}</h3>
          <p className="truncate text-xs text-text-muted">{job.company}</p>
        </div>

        {/* Status menu — clickable, not just a badge */}
        <StatusMenu
          jobId={job.id}
          initialStatus={interaction.status}
          onChanged={(next) => setInteraction((i) => ({ ...i, status: next }))}
        />
      </header>

      {/* ── Extraction banner (if still pending/failed) ─────── */}
      {job.extraction_status !== "done" && (
        <div className="mt-3">
          <ExtractionBanner
            jobId={job.id}
            status={job.extraction_status}
            onExtracted={(updated) => setJob((prev) => ({ ...prev, ...updated }))}
          />
        </div>
      )}

      {/* ── Meta: EXP + salary ──────────────────────────────── */}
      {(job.experience || job.salary) && (
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-text-muted">
          {job.experience && (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3 w-3 text-text-faint" aria-hidden />
              {job.experience}
            </span>
          )}
          {job.salary && (
            <span className="inline-flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-text-faint" aria-hidden />
              {job.salary}
            </span>
          )}
        </div>
      )}

      {/* ── Skills ──────────────────────────────────────────── */}
      {visibleSkills.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {visibleSkills.map((skill) => (
            <li key={skill} className="rounded-sm bg-bg-raised px-1.5 py-0.5 text-[11px] text-text-muted">
              {skill}
            </li>
          ))}
          {hiddenCount > 0 && <li className="px-1.5 py-0.5 text-[11px] text-text-faint">+{hiddenCount}</li>}
        </ul>
      )}

      {/* ── Private notes ───────────────────────────────────── */}
      <div className="mt-3">
        <NotesEditor jobId={job.id} initialNotes={interaction.notes} />
      </div>

      <div className="mt-3 flex-1" />

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <UserChip name={job.added_by.name} size="xs" />
          <TimeChip label="Added" isoDate={job.created_at} />
          <TimeChip label="Updated" isoDate={interaction.updated_at} variant="updated" />
        </div>

        <div className="flex items-center gap-3">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-accent"
          >
            View <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isRemoving}
            title="Remove from tracker"
            className="inline-flex items-center gap-1 text-[11px] text-text-faint hover:text-status-rejected disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" aria-hidden />
            {isRemoving ? "Removing…" : "Remove"}
          </button>
        </div>
      </footer>

      {removeError && <p className="mt-1 text-[11px] text-status-rejected">{removeError}</p>}
    </article>
  );
}
