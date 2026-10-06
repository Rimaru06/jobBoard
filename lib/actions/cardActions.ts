"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { handleServerActionError, type ActionResult } from "@/lib/errors";
import { jobEditServerSchema } from "@/lib/validations/job";
import type { ConnectionType, Job } from "@/types/database";

// ── Connection toggle ─────────────────────────────────────────────

/**
 * Toggle a connection tag (referral / knows_someone) on a job card.
 * If the user already has the same type on this job, removes it —
 * clicking again un-tags. If they had the other type, replaces it.
 */
export async function toggleConnection(
  jobId: string,
  type: ConnectionType
): Promise<ActionResult<{ active: boolean }>> {
  try {
    const viewer = await getCurrentUser();
    if (!viewer) return { data: null, error: { message: "Sign in first.", code: "UNAUTHORIZED" } };

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("job_connections")
      .select("type")
      .eq("user_id", viewer.id)
      .eq("job_id", jobId)
      .maybeSingle();

    // Same type already set → remove (toggle off)
    if (existing?.type === type) {
      await supabase.from("job_connections").delete().eq("user_id", viewer.id).eq("job_id", jobId);
      return { data: { active: false }, error: null };
    }

    // No tag or different type → upsert
    const { error } = await supabase
      .from("job_connections")
      .upsert({ user_id: viewer.id, job_id: jobId, type }, { onConflict: "user_id,job_id" });

    if (error) throw error;
    return { data: { active: true }, error: null };
  } catch (err) {
    return handleServerActionError(err, "toggleConnection");
  }
}

// ── WhatsApp notification tracking ───────────────────────────────

/**
 * Record that the current viewer clicked "Notify on WhatsApp" for
 * this job. The card visually dims for that user once this succeeds.
 * Uses Postgres's array append idiom to avoid a read-modify-write race.
 */
export async function markWhatsAppNotified(jobId: string): Promise<ActionResult<null>> {
  try {
    const viewer = await getCurrentUser();
    if (!viewer) return { data: null, error: { message: "Sign in first.", code: "UNAUTHORIZED" } };

    const supabase = createAdminClient();

    // array_append only if not already present — idempotent
    const { error } = await supabase.rpc("append_whatsapp_notifier", {
      p_job_id: jobId,
      p_user_id: viewer.id,
    });

    if (error) {
      // RPC may not exist yet if running locally before migration;
      // fall back to a read-modify-write for development convenience.
      const { data: job } = await supabase
        .from("jobs")
        .select("whatsapp_notified_by")
        .eq("id", jobId)
        .single();

      const current: string[] = job?.whatsapp_notified_by ?? [];
      if (!current.includes(viewer.id)) {
        await supabase
          .from("jobs")
          .update({ whatsapp_notified_by: [...current, viewer.id] })
          .eq("id", jobId);
      }
    }

    return { data: null, error: null };
  } catch (err) {
    return handleServerActionError(err, "markWhatsAppNotified");
  }
}

// ── Manual job update (override) ─────────────────────────────────

export interface JobUpdateInput {
  company: string;
  role: string;
  experience?: string;
  skills: string[];
  salary?: string;
}

/**
 * Permanent manual override — only available to the job's creator or
 * an admin. Sets extraction_status = 'done' so the extracting banner
 * clears even if Gemini never succeeded.
 */
export async function updateJobManually(
  jobId: string,
  input: JobUpdateInput
): Promise<
  ActionResult<
    Pick<
      Job,
      "id" | "company" | "role" | "experience" | "skills" | "salary" | "updated_at" | "extraction_status"
    >
  >
> {
  try {
    const viewer = await getCurrentUser();
    if (!viewer) return { data: null, error: { message: "Sign in first.", code: "UNAUTHORIZED" } };

    const parsed = jobEditServerSchema.safeParse(input);
    if (!parsed.success) {
      return { data: null, error: { message: parsed.error.issues[0].message, code: "VALIDATION" } };
    }

    const supabase = createAdminClient();

    // Auth check: only the job's creator or an admin may edit
    const { data: job } = await supabase.from("jobs").select("added_by_user_id").eq("id", jobId).single();

    if (!job) return { data: null, error: { message: "Job not found.", code: "NOT_FOUND" } };
    if (job.added_by_user_id !== viewer.id && viewer.role !== "admin") {
      return {
        data: null,
        error: { message: "Only the creator or an admin can edit this job.", code: "UNAUTHORIZED" },
      };
    }

    const { data, error } = await supabase
      .from("jobs")
      .update({
        company: parsed.data.company,
        role: parsed.data.role,
        experience: parsed.data.experience?.trim() || null,
        skills: parsed.data.skills,
        salary: parsed.data.salary?.trim() || null,
        extraction_status: "done", // manual override always clears the pending/failed banner
      })
      .eq("id", jobId)
      .select("id, company, role, experience, skills, salary, updated_at, extraction_status")
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return handleServerActionError(err, "updateJobManually");
  }
}
