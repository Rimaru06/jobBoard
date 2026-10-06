"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Pencil, UserPlus, UserCheck, Users } from "lucide-react";
import { toggleConnection, markWhatsAppNotified } from "@/lib/actions/cardActions";
import { EditJobModal } from "@/components/jobs/EditJobModal";
import { cn } from "@/lib/cn";
import type { ConnectionType, JobWithContext } from "@/types/database";

/**
 * All interactive per-card actions isolated in a single client island:
 *   1. Connection tag toggle (refer / knows someone)
 *   2. WhatsApp share + "Notified" dim state
 *   3. Edit (manual override) — only shown to the job's creator or admin
 *
 * Receives the full job as initial state and manages its own optimistic
 * updates locally, so the surrounding JobCard stays a server component.
 */
export function CardActions({
  job,
  viewerId,
  viewerRole,
  onJobUpdated,
}: {
  job: JobWithContext;
  viewerId: string | null;
  viewerRole: string | null;
  onJobUpdated?: (updated: Partial<JobWithContext>) => void;
}) {
  // ── Local optimistic state ──────────────────────────────────────
  const [connections, setConnections] = useState(job.connections);
  const [notified, setNotified] = useState(viewerId ? job.whatsapp_notified_by.includes(viewerId) : false);
  const [editOpen, setEditOpen] = useState(false);
  const [isTogglingConnection, startConnectionToggle] = useTransition();
  const [isNotifying, startNotify] = useTransition();

  const canEdit = viewerId !== null && (job.added_by_user_id === viewerId || viewerRole === "admin");

  // ── Viewer's current connection on this job ───────────────────
  const viewerConnection = viewerId ? connections.find((c) => c.user_id === viewerId) : null;

  function handleConnectionToggle(type: ConnectionType) {
    if (!viewerId) return;
    startConnectionToggle(async () => {
      // Optimistic update before the round-trip
      const alreadySet = viewerConnection?.type === type;
      setConnections((prev) => {
        if (alreadySet) return prev.filter((c) => c.user_id !== viewerId);
        const withoutViewer = prev.filter((c) => c.user_id !== viewerId);
        return [
          ...withoutViewer,
          { user_id: viewerId, job_id: job.id, type, user: { id: viewerId, name: "" } },
        ];
      });

      const result = await toggleConnection(job.id, type);
      if (result.error) {
        // Roll back on failure
        setConnections(job.connections);
      }
    });
  }

  function handleWhatsApp() {
    const text = buildWhatsAppMessage(job);
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );

    startNotify(async () => {
      setNotified(true); // optimistic
      const result = await markWhatsAppNotified(job.id);
      if (result.error) setNotified(false); // roll back
    });
  }

  function handleSaved(updated: Partial<JobWithContext>) {
    onJobUpdated?.(updated);
  }

  const referralActive = viewerConnection?.type === "referral";
  const knowsActive = viewerConnection?.type === "knows_someone";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Connection counts — always visible */}
        {connections.length > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[11px] text-accent"
            title={connections
              .map((c) => `${c.user.name} (${c.type === "referral" ? "can refer" : "knows someone"})`)
              .join(", ")}
          >
            <Users className="h-3 w-3" aria-hidden />
            {connections.length}
          </span>
        )}

        {/* Connection toggle buttons — only when logged in */}
        {viewerId && (
          <>
            <ConnectionButton
              active={referralActive}
              disabled={isTogglingConnection}
              onClick={() => handleConnectionToggle("referral")}
              icon={referralActive ? UserCheck : UserPlus}
              label="I can refer"
              activeLabel="Referring"
            />
            <ConnectionButton
              active={knowsActive}
              disabled={isTogglingConnection}
              onClick={() => handleConnectionToggle("knows_someone")}
              icon={knowsActive ? UserCheck : UserPlus}
              label="I know someone"
              activeLabel="Knows someone"
            />
          </>
        )}

        {/* WhatsApp */}
        <button
          type="button"
          onClick={handleWhatsApp}
          disabled={isNotifying}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors",
            notified
              ? "border-border text-text-faint opacity-60"
              : "border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10"
          )}
          title={notified ? "Already notified" : "Notify group on WhatsApp"}
        >
          <MessageCircle className="h-3 w-3" aria-hidden />
          {notified ? "Notified" : "WhatsApp"}
        </button>

        {/* Edit — creator or admin only */}
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-[11px] text-text-muted hover:border-border-hover hover:text-text-primary"
            title="Update manually"
          >
            <Pencil className="h-3 w-3" aria-hidden />
            Edit
          </button>
        )}
      </div>

      {canEdit && (
        <EditJobModal job={job} open={editOpen} onClose={() => setEditOpen(false)} onSaved={handleSaved} />
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function ConnectionButton({
  active,
  disabled,
  onClick,
  icon: Icon,
  label,
  activeLabel,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  activeLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border text-text-muted hover:border-border-hover hover:text-text-primary",
        disabled && "opacity-50"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {active ? activeLabel : label}
    </button>
  );
}

// ── WhatsApp message builder ──────────────────────────────────────

function buildWhatsAppMessage(job: JobWithContext): string {
  const lines = [
    `🔗 *${job.role}* at *${job.company}*`,
    job.experience ? `🎯 Exp: ${job.experience}` : null,
    job.salary ? `💰 Salary: ${job.salary}` : null,
    job.skills.length > 0 ? `🛠 Skills: ${job.skills.join(", ")}` : null,
    ``,
    `📎 ${job.url}`,
    ``,
    `— Shared from FriendBoard`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}
