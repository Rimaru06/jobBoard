"use client";

import { useState } from "react";
import { Briefcase, DollarSign, ExternalLink } from "lucide-react";
import type { JobWithContext } from "@/types/database";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserChip } from "@/components/ui/UserChip";
import { TimeChip } from "@/components/ui/TimeChip";
import { ExtractionBanner } from "@/components/jobs/ExtractionBanner";
import { CardActions } from "@/components/jobs/CardActions";
import { cn } from "@/lib/cn";

const MAX_VISIBLE_SKILLS = 4;
const EDITED_THRESHOLD_MS = 60_000;

function wasEdited(job: JobWithContext) {
  return new Date(job.updated_at).getTime() - new Date(job.created_at).getTime() > EDITED_THRESHOLD_MS;
}

/**
 * JobCard is now a client component so it can own optimistic state
 * that flows from CardActions (edit saves, connection toggles) without
 * needing a full page refetch.
 *
 * "use client" boundary is at this level — everything below that
 * doesn't need interactivity (ExtractionBanner, chips) remains
 * server-renderable if used in isolation, but inside this tree
 * they'll just hydrate as static HTML.
 */
export function JobCard({
  job: initialJob,
  viewerId,
  viewerRole,
}: {
  job: JobWithContext;
  viewerId: string | null;
  viewerRole: string | null;
}) {
  const [job, setJob] = useState(initialJob);

  function handleJobUpdated(updated: Partial<JobWithContext>) {
    setJob((prev) => ({ ...prev, ...updated }));
  }

  const isExtracting = job.extraction_status === "pending";
  const viewerNotified = viewerId ? job.whatsapp_notified_by.includes(viewerId) : false;

  const visibleSkills = job.skills.slice(0, MAX_VISIBLE_SKILLS);
  const hiddenSkillCount = job.skills.length - visibleSkills.length;

  return (
    <article
      className={cn(
        "group flex flex-col rounded border border-border bg-bg-panel p-4 transition-all duration-200",
        "hover:border-border-hover hover:shadow-glow-sm",
        job.is_filled && "opacity-50",
        viewerNotified && "opacity-70"
      )}
      style={{ "--glow-color": "rgba(91,141,239,0.25)" } as React.CSSProperties}
    >
      {/* Header: role + company + status badge */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={cn(
              "truncate text-sm font-semibold transition-colors",
              isExtracting ? "text-text-muted" : "text-text-primary"
            )}
          >
            {job.role}
          </h3>
          <p className="truncate text-xs text-text-muted">{job.company}</p>
        </div>
        {job.viewer_interaction && (
          <StatusBadge status={job.viewer_interaction.status} className="shrink-0" />
        )}
      </header>

      {/* Extraction lifecycle banner */}
      {job.extraction_status !== "done" && (
        <div className="mt-3">
          <ExtractionBanner jobId={job.id} status={job.extraction_status} onExtracted={handleJobUpdated} />
        </div>
      )}

      {/* Meta: experience + salary */}
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

      {/* Skills */}
      {visibleSkills.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {visibleSkills.map((skill) => (
            <li key={skill} className="rounded-sm bg-bg-raised px-1.5 py-0.5 text-[11px] text-text-muted">
              {skill}
            </li>
          ))}
          {hiddenSkillCount > 0 && (
            <li className="rounded-sm px-1.5 py-0.5 text-[11px] text-text-faint">+{hiddenSkillCount}</li>
          )}
        </ul>
      )}

      <div className="mt-3 flex-1" />

      {/* Card actions: connections, WhatsApp, edit */}
      <div className="mt-3">
        <CardActions job={job} viewerId={viewerId} viewerRole={viewerRole} onJobUpdated={handleJobUpdated} />
      </div>

      {/* Footer: creator chip + timestamps + view link */}
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <UserChip name={job.added_by.name} size="xs" />
          <TimeChip label="Added" isoDate={job.created_at} />
          {wasEdited(job) && <TimeChip label="Updated" isoDate={job.updated_at} variant="updated" />}
        </div>
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-accent"
        >
          View <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </footer>
    </article>
  );
}
