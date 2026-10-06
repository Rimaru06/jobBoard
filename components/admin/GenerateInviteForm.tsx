"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { generateInvite } from "@/lib/actions/admin";
import { generateInviteSchema, type GenerateInviteValues } from "@/lib/validations/invite";
import { CopyButton } from "@/components/ui/CopyButton";

/**
 * The generated link is shown exactly once, right here — the server
 * only ever stores its hash, so this is the only chance to copy it.
 */
export function GenerateInviteForm({ onGenerated }: { onGenerated?: () => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<GenerateInviteValues>({
    resolver: zodResolver(generateInviteSchema),
    mode: "onChange",
    defaultValues: { assignedName: "" },
  });

  function onSubmit(values: GenerateInviteValues) {
    setLink(null);
    startTransition(async () => {
      const result = await generateInvite(values.assignedName);
      if (result.error) {
        setError("root", { message: result.error.message });
        return;
      }
      setLink(result.data.link);
      reset();
      onGenerated?.();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-border bg-bg-panel p-4">
      <h2 className="text-sm font-semibold text-text-primary">Invite a friend</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex gap-2">
        <input
          {...register("assignedName")}
          placeholder="Friend's name"
          aria-invalid={Boolean(errors.assignedName)}
          className="flex-1 rounded-sm border border-border bg-bg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-faint focus:border-accent"
        />
        <button
          type="submit"
          disabled={!isValid || isPending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden />
          )}
          Generate Invite Link
        </button>
      </form>

      {(errors.assignedName || errors.root) && (
        <p role="alert" className="text-xs text-status-rejected">
          {errors.assignedName?.message ?? errors.root?.message}
        </p>
      )}

      {link && (
        <div className="flex items-center gap-2 rounded-sm border border-status-offered/30 bg-status-offered/10 px-2.5 py-2">
          <code className="flex-1 truncate font-mono text-[11px] text-text-primary">{link}</code>
          <CopyButton value={link} />
        </div>
      )}
    </div>
  );
}
