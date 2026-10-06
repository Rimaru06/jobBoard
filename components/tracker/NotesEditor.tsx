"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { upsertInteraction } from "@/lib/actions/tracker";
import { cn } from "@/lib/cn";

const AUTOSAVE_DELAY_MS = 900;

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Inline notes textarea that auto-saves after the user stops typing.
 * Debounced at 900ms — long enough to not spam the DB mid-sentence,
 * short enough to feel immediate. Shows a transient "Saved" tick that
 * fades after 2s.
 */
export function NotesEditor({ jobId, initialNotes }: { jobId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [expanded, setExpanded] = useState(Boolean(initialNotes));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save
  useEffect(() => {
    // Don't auto-save when the component first mounts with the initial value
    if (notes === (initialNotes ?? "")) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState("idle");

    timerRef.current = setTimeout(async () => {
      setSaveState("saving");
      const result = await upsertInteraction(jobId, { notes: notes || null });

      if (result.error) {
        setSaveState("error");
        return;
      }

      setSaveState("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, jobId]);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-[11px] text-text-faint hover:text-text-muted"
      >
        + Add note
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-faint">Private notes</span>
        <span className={cn("text-[11px] transition-opacity", saveState === "idle" && "opacity-0")}>
          {saveState === "saving" && (
            <span className="inline-flex items-center gap-1 text-text-faint">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Saving…
            </span>
          )}
          {saveState === "saved" && (
            <span className="inline-flex items-center gap-1 text-status-offered">
              <Check className="h-3 w-3" aria-hidden />
              Saved
            </span>
          )}
          {saveState === "error" && <span className="text-status-rejected">Save failed</span>}
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. Waiting on HR call. Referred by Alex."
        rows={3}
        className={cn(
          "w-full resize-none rounded-sm border border-border bg-bg px-2.5 py-2 text-xs text-text-primary",
          "placeholder:text-text-faint focus:border-accent focus:outline-none",
          "transition-colors"
        )}
      />
    </div>
  );
}
