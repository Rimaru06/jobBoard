"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { jobEditSchema, type JobEditFormValues } from "@/lib/validations/job";
import { updateJobManually } from "@/lib/actions/cardActions";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { JobWithContext } from "@/types/database";

interface EditJobModalProps {
  job: JobWithContext;
  open: boolean;
  onClose: () => void;
  /** Called with the updated fields on successful save so the
   *  parent can optimistically update without a full page refresh. */
  onSaved: (updated: Partial<JobWithContext>) => void;
}

/**
 * Manual override modal. Uses React Hook Form + Zod so validation
 * happens client-side on every field blur/submit before any server
 * round-trip, with per-field inline error messages.
 */
export function EditJobModal({ job, open, onClose, onSaved }: EditJobModalProps) {
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<JobEditFormValues>({
    resolver: zodResolver(jobEditSchema),
    defaultValues: {
      company: job.company,
      role: job.role,
      experience: job.experience ?? "",
      skills: job.skills.join(", "),
      salary: job.salary ?? "",
    },
  });

  // Sync form defaults when job prop changes (e.g. after extraction populates fields)
  useEffect(() => {
    reset({
      company: job.company,
      role: job.role,
      experience: job.experience ?? "",
      skills: job.skills.join(", "),
      salary: job.salary ?? "",
    });
  }, [job, reset]);

  async function onSubmit(values: JobEditFormValues) {
    const result = await updateJobManually(job.id, {
      company: values.company,
      role: values.role,
      experience: values.experience,
      skills: values.skills as unknown as string[], // transformed by Zod schema
      salary: values.salary,
    });

    if (result.error) {
      setError("root", { message: result.error.message });
      return;
    }

    onSaved({
      company: result.data.company,
      role: result.data.role,
      experience: result.data.experience,
      skills: result.data.skills,
      salary: result.data.salary,
      updated_at: result.data.updated_at,
      extraction_status: result.data.extraction_status,
    });
    showToast("Job details updated.");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Update job details">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Company" error={errors.company?.message}>
            <input {...register("company")} className={inputClass(!!errors.company)} />
          </Field>
          <Field label="Role" error={errors.role?.message}>
            <input {...register("role")} className={inputClass(!!errors.role)} />
          </Field>
          <Field label="Experience" error={errors.experience?.message}>
            <input
              {...register("experience")}
              placeholder="e.g. Mid (2-4 yrs)"
              className={inputClass(!!errors.experience)}
            />
          </Field>
          <Field label="Salary" error={errors.salary?.message}>
            <input
              {...register("salary")}
              placeholder="e.g. $120k-$140k"
              className={inputClass(!!errors.salary)}
            />
          </Field>
        </div>

        <Field label="Skills (comma separated)" error={errors.skills?.message}>
          <input
            {...register("skills")}
            placeholder="React, TypeScript, Postgres"
            className={inputClass(!!errors.skills)}
          />
        </Field>

        {errors.root && <p className="text-xs text-status-rejected">{errors.root.message}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-sm border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-text-muted">
      {label}
      {children}
      {error && <span className="text-[11px] text-status-rejected">{error}</span>}
    </label>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "w-full rounded-sm border bg-bg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-faint focus:outline-none",
    hasError ? "border-status-rejected focus:border-status-rejected" : "border-border focus:border-accent"
  );
}
