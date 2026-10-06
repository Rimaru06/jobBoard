"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Zap } from "lucide-react";
import { createJob, checkDuplicateJob, trackExistingJob } from "@/lib/actions/jobs";
import { extractJobDetails } from "@/lib/actions/extract";
import { DuplicateNotice } from "@/components/jobs/DuplicateNotice";
import { createJobFormSchema, type CreateJobFormValues } from "@/lib/validations/job";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

interface DuplicateState {
  jobId: string;
  addedBy: string;
}

const defaultValues: CreateJobFormValues = {
  url: "",
  mode: "paste-go",
  company: "",
  role: "",
  experience: "",
  skills: "",
  salary: "",
  trackAs: "none",
};

// Quick-track options shown inline on the form. "None" means don't
// create an interaction row — just post the job to the board.
const TRACK_OPTIONS: { value: CreateJobFormValues["trackAs"]; label: string }[] = [
  { value: "none", label: "Don't track" },
  { value: "Draft", label: "Save as Draft" },
  { value: "Applied", label: "Already applied" },
  { value: "Interviewing", label: "Interviewing" },
];

export function SubmitJobForm({ onJobCreated }: { onJobCreated?: () => void }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateState | null>(null);
  const [isCheckingUrl, setIsCheckingUrl] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [isSubmitting, startSubmit] = useTransition();
  const lastCheckedUrl = useRef("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobFormSchema),
    mode: "onChange",
    defaultValues,
  });

  const mode = watch("mode");
  const url = watch("url");
  const trackAs = watch("trackAs");

  const urlField = register("url");

  async function handleUrlBlur(e: React.FocusEvent<HTMLInputElement>) {
    urlField.onBlur(e);
    const value = e.target.value.trim();
    if (!value || value === lastCheckedUrl.current) return;
    lastCheckedUrl.current = value;
    setIsCheckingUrl(true);
    const result = await checkDuplicateJob(value);
    setIsCheckingUrl(false);
    if (result.data) setDuplicate({ jobId: result.data.job.id, addedBy: result.data.addedBy });
  }

  async function handleTrack() {
    if (!duplicate) return;
    setIsTracking(true);
    const result = await trackExistingJob(duplicate.jobId);
    setIsTracking(false);
    if (!result.error) setTracked(true);
  }

  function onSubmit(values: CreateJobFormValues) {
    if (duplicate) return;

    startSubmit(async () => {
      const isPasteGo = values.mode === "paste-go";
      const skills = (values.skills ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const result = await createJob({
        url: values.url,
        company: isPasteGo ? "Loading…" : (values.company ?? ""),
        role: isPasteGo ? "Loading…" : (values.role ?? ""),
        experience: values.experience || undefined,
        skills,
        salary: values.salary || undefined,
        skipExtraction: !isPasteGo,
        // Only pass initialStatus when the user opted in — "none" means
        // don't create an interaction row at all.
        initialStatus: values.trackAs !== "none" ? values.trackAs : undefined,
      });

      if (result.error) {
        if (result.error.code === "DUPLICATE") {
          const jobId = result.error.meta?.jobId as string | undefined;
          if (jobId) {
            const nameMatch = result.error.message.match(/added by (.+)\. Would/);
            setDuplicate({ jobId, addedBy: nameMatch?.[1] ?? "someone" });
          }
        } else {
          setError("root", { message: result.error.message });
        }
        return;
      }

      // Close immediately — Paste & Go UX
      resetAndClose();
      onJobCreated?.();
      showToast(isPasteGo ? "Job added — extracting details…" : "Job added.");

      if (isPasteGo) {
        extractJobDetails(result.data.id, values.url).catch(() => {});
      }
    });
  }

  function resetAndClose() {
    reset(defaultValues);
    setDuplicate(null);
    setTracked(false);
    lastCheckedUrl.current = "";
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 self-start rounded-sm border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Add a job
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-3 rounded border border-border bg-bg-panel p-4"
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Add a job</h2>
          {mode === "paste-go" && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
              <Zap className="h-2.5 w-2.5" aria-hidden />
              Paste & Go
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={resetAndClose}
          className="text-xs text-text-faint hover:text-text-muted"
        >
          Cancel
        </button>
      </div>

      {/* ── URL ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <label htmlFor="job-url" className="text-[11px] text-text-muted">
          Job URL
          {mode === "paste-go" && (
            <span className="ml-1 text-text-faint">(paste the link — we&apos;ll extract the rest)</span>
          )}
        </label>
        <input
          id="job-url"
          type="url"
          placeholder="https://…"
          autoFocus
          aria-invalid={Boolean(errors.url)}
          aria-describedby={errors.url ? "job-url-error" : undefined}
          className={inputClass}
          {...urlField}
          onChange={(e) => {
            urlField.onChange(e);
            setDuplicate(null);
            setTracked(false);
          }}
          onBlur={handleUrlBlur}
        />
        {isCheckingUrl && <p className="text-[11px] text-text-faint">Checking for duplicates…</p>}
        {errors.url && (
          <p id="job-url-error" role="alert" className="text-[11px] text-status-rejected">
            {errors.url.message}
          </p>
        )}
      </div>

      {/* ── Duplicate warning ────────────────────────────────── */}
      {duplicate && (
        <DuplicateNotice
          addedBy={duplicate.addedBy}
          onTrack={handleTrack}
          isTracking={isTracking}
          tracked={tracked}
        />
      )}

      {/* ── Manual fields (opt-in) ───────────────────────────── */}
      {mode === "manual" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Company" error={errors.company?.message}>
              <input {...register("company")} className={inputClass} />
            </Field>
            <Field label="Role" error={errors.role?.message}>
              <input {...register("role")} className={inputClass} />
            </Field>
            <Field label="Experience">
              <input {...register("experience")} placeholder="e.g. Mid (2-4 yrs)" className={inputClass} />
            </Field>
            <Field label="Salary">
              <input {...register("salary")} placeholder="e.g. $120k-140k" className={inputClass} />
            </Field>
          </div>
          <Field label="Skills (comma separated)">
            <input {...register("skills")} placeholder="React, TypeScript, Postgres" className={inputClass} />
          </Field>
        </div>
      )}

      {/* ── Track on submit ──────────────────────────────────── */}
      {/*
        Shown whenever a URL is present and no duplicate was found.
        This is the "instant tracking" requirement: the user chooses
        their initial status right in the submission form rather than
        having to navigate to the tracker afterward.
      */}
      {url && !duplicate && (
        <div className="rounded-sm border border-border bg-bg p-2.5">
          <p className="mb-2 text-[11px] font-medium text-text-muted">Add to your tracker?</p>
          <div className="flex flex-wrap gap-1.5">
            {TRACK_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue("trackAs", value, { shouldValidate: true })}
                aria-pressed={trackAs === value}
                className={cn(
                  "rounded-sm border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  trackAs === value
                    ? value === "none"
                      ? "border-border-hover bg-bg-raised text-text-primary"
                      : "border-accent/40 bg-accent/10 text-accent"
                    : "border-border text-text-faint hover:border-border-hover hover:text-text-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {trackAs !== "none" && (
            <p className="mt-2 text-[11px] text-text-faint">
              Will appear in your tracker as <span className="text-text-muted">{trackAs}</span>.
            </p>
          )}
        </div>
      )}

      {errors.root && (
        <p role="alert" className="text-xs text-status-rejected">
          {errors.root.message}
        </p>
      )}

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() =>
            setValue("mode", mode === "paste-go" ? "manual" : "paste-go", { shouldValidate: true })
          }
          className="text-[11px] text-text-faint hover:text-text-muted"
        >
          {mode === "paste-go" ? "Fill in manually instead →" : "← Use Paste & Go"}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || Boolean(duplicate) || !isValid}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-sm border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20",
            (isSubmitting || duplicate || !isValid) && "opacity-50"
          )}
        >
          {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {mode === "paste-go" ? "Add & Extract" : "Add job"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-sm border border-border bg-bg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-faint focus:border-accent focus:outline-none";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-text-muted">
      {label}
      {children}
      {error && (
        <span role="alert" className="text-[11px] text-status-rejected">
          {error}
        </span>
      )}
    </label>
  );
}
