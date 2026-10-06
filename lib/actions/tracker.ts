"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { handleServerActionError, type ActionResult } from "@/lib/errors";
import { trackerFiltersSchema, upsertInteractionSchema } from "@/lib/validations/tracker";
import type { JobStatus, JobWithContext, UserJobInteraction, User } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────

export type TrackerSort =
  | "updated_at_desc" // most recently touched — default
  | "added_at_desc" // when the job was first posted
  | "status_asc" // Draft → Applied → Interviewing → Offered / Rejected
  | "status_desc";

// Status ordering for status_asc / status_desc sorts. Postgres doesn't
// know our semantic ordering (Draft < Applied < Interviewing < Offered,
// with Rejected at the end) so we map it here for the ORDER BY.
const STATUS_RANK: Record<JobStatus, number> = {
  Draft: 0,
  Applied: 1,
  Interviewing: 2,
  Offered: 3,
  Rejected: 4,
};

export interface TrackerRow {
  interaction: UserJobInteraction;
  job: JobWithContext;
}

export interface TrackerFilters {
  statuses?: JobStatus[]; // empty = all
  query?: string; // searches company + role, same ilike as feed
  sort?: TrackerSort;
}

// ── Queries ───────────────────────────────────────────────────────

/**
 * Fetch all jobs a specific user has interacted with, enriched with
 * the full JobWithContext shape so TrackerCard reuses the same card
 * atoms as the board.
 *
 * Authorization: only the session user may read their own tracker.
 * The userId param is checked against the session, not trusted directly,
 * so someone can't enumerate /tracker/[otherId] to see private notes.
 */
export async function getTrackerRows(
  userId: string,
  filters: TrackerFilters = {}
): Promise<ActionResult<TrackerRow[]>> {
  try {
    const viewer = await getCurrentUser();
    if (!viewer) {
      return { data: null, error: { message: "Sign in to view your tracker.", code: "UNAUTHORIZED" } };
    }
    // Strict ownership check — no cross-user reads even for admins.
    // An admin viewing someone else's tracker is an explicit non-goal:
    // the private notes field is personal and shouldn't be surfaced
    // anywhere outside the owner's session.
    if (viewer.id !== userId) {
      return { data: null, error: { message: "You can only view your own tracker.", code: "UNAUTHORIZED" } };
    }

    const parsedFilters = trackerFiltersSchema.safeParse(filters);
    if (!parsedFilters.success) {
      return { data: null, error: { message: parsedFilters.error.issues[0].message, code: "VALIDATION" } };
    }

    const supabase = createAdminClient();

    // Fetch interactions + the full job in one query via join.
    // We select everything on jobs so we can build JobWithContext.
    const { data: rows, error } = await supabase
      .from("user_job_interactions")
      .select(
        `
        *,
        job:jobs(
          *,
          added_by:users!added_by_user_id(id, name),
          connections:job_connections(*, user:users(id, name))
        )
      `
      )
      .eq("user_id", userId);

    if (error) throw error;

    // Build TrackerRow[], applying filters + sort in JS rather than
    // adding complexity to the Supabase query. The tracker is bounded
    // by definition (one user's interactions, not the whole jobs table)
    // so in-memory filtering is fine even at 200+ tracked jobs.
    let results: TrackerRow[] = (rows ?? [])
      .filter((r) => r.job !== null)
      .map((r) => {
        const job = r.job as unknown as JobWithContext & {
          added_by: Pick<User, "id" | "name">;
          connections: JobWithContext["connections"];
        };
        return {
          interaction: {
            user_id: r.user_id,
            job_id: r.job_id,
            status: r.status as JobStatus,
            notes: r.notes,
            updated_at: r.updated_at,
          },
          job: {
            ...job,
            viewer_interaction: {
              user_id: r.user_id,
              job_id: r.job_id,
              status: r.status as JobStatus,
              notes: r.notes,
              updated_at: r.updated_at,
            },
          },
        };
      });

    // Status filter
    if (filters.statuses?.length) {
      results = results.filter((r) => filters.statuses!.includes(r.interaction.status));
    }

    // Text filter — same ilike approach as the board, but against the
    // already-fetched data (company + role on job).
    if (filters.query?.trim()) {
      const q = filters.query.trim().toLowerCase();
      results = results.filter(
        (r) =>
          r.job.company.toLowerCase().includes(q) ||
          r.job.role.toLowerCase().includes(q) ||
          r.job.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Sort
    const sort = filters.sort ?? "updated_at_desc";
    results.sort((a, b) => {
      if (sort === "updated_at_desc") {
        return new Date(b.interaction.updated_at).getTime() - new Date(a.interaction.updated_at).getTime();
      }
      if (sort === "added_at_desc") {
        return new Date(b.job.created_at).getTime() - new Date(a.job.created_at).getTime();
      }
      if (sort === "status_asc") {
        return STATUS_RANK[a.interaction.status] - STATUS_RANK[b.interaction.status];
      }
      // status_desc
      return STATUS_RANK[b.interaction.status] - STATUS_RANK[a.interaction.status];
    });

    return { data: results, error: null };
  } catch (err) {
    return handleServerActionError(err, "getTrackerRows");
  }
}

// ── Mutations ─────────────────────────────────────────────────────

/**
 * Upsert an interaction row. Used for:
 *   - "track on submit" initial creation (status = 'Applied' or 'Draft')
 *   - status change dropdown on the tracker card
 *   - notes save from the notes editor
 *
 * All three update paths go through here rather than having separate
 * actions, because they're the same DB operation with different fields.
 */
export async function upsertInteraction(
  jobId: string,
  patch: { status?: JobStatus; notes?: string | null }
): Promise<ActionResult<UserJobInteraction>> {
  try {
    const viewer = await getCurrentUser();
    if (!viewer) {
      return { data: null, error: { message: "Sign in first.", code: "UNAUTHORIZED" } };
    }

    const parsed = upsertInteractionSchema.safeParse(patch);
    if (!parsed.success) {
      return { data: null, error: { message: parsed.error.issues[0].message, code: "VALIDATION" } };
    }

    const supabase = createAdminClient();

    // Read the current row first so we can preserve fields we're not
    // patching. upsert with partial columns would zero out the rest.
    const { data: existing } = await supabase
      .from("user_job_interactions")
      .select("status, notes")
      .eq("user_id", viewer.id)
      .eq("job_id", jobId)
      .maybeSingle();

    const payload = {
      user_id: viewer.id,
      job_id: jobId,
      status: patch.status ?? (existing?.status as JobStatus) ?? "Draft",
      notes: patch.notes !== undefined ? patch.notes : (existing?.notes ?? null),
    };

    const { data, error } = await supabase
      .from("user_job_interactions")
      .upsert(payload, { onConflict: "user_id,job_id" })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return handleServerActionError(err, "upsertInteraction");
  }
}

/**
 * Remove a job from the user's tracker entirely (delete the interaction
 * row). Does not affect the job itself on the shared board or anyone
 * else's tracking state.
 */
export async function removeFromTracker(jobId: string): Promise<ActionResult<null>> {
  try {
    const viewer = await getCurrentUser();
    if (!viewer) {
      return { data: null, error: { message: "Sign in first.", code: "UNAUTHORIZED" } };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("user_job_interactions")
      .delete()
      .eq("user_id", viewer.id)
      .eq("job_id", jobId);

    if (error) throw error;
    return { data: null, error: null };
  } catch (err) {
    return handleServerActionError(err, "removeFromTracker");
  }
}
