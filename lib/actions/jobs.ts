"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { handleServerActionError, type ActionResult } from "@/lib/errors";
import { normalizeJobUrl } from "@/lib/normalizeUrl";
import { jobFiltersSchema, jobsCursorSchema, type JobFiltersValues } from "@/lib/validations/filters";
import { createJobServerSchema } from "@/lib/validations/job";
import type { Job, JobWithContext, User, JobStatus } from "@/types/database";

const PAGE_SIZE = 20;

export type JobFiltersInput = JobFiltersValues;

export interface JobsCursor {
  createdAt: string;
  id: string;
}

export interface JobsPage {
  jobs: JobWithContext[];
  nextCursor: JobsCursor | null;
}

/**
 * Fetch one page of the shared feed, keyset (cursor) paginated on
 * (created_at, id) rather than offset — stays correct and fast even as
 * new jobs get added while someone is scrolling. Never unbounded: every
 * query is capped at PAGE_SIZE (+1 sentinel row to detect "more").
 */
export async function getJobsPage(
  rawFilters: JobFiltersInput,
  cursor: JobsCursor | null
): Promise<ActionResult<JobsPage>> {
  try {
    const viewer = await getCurrentUser();
    if (!viewer) {
      return { data: null, error: { message: "Please sign in to view jobs.", code: "UNAUTHORIZED" } };
    }

    const parsedFilters = jobFiltersSchema.safeParse(rawFilters);
    if (!parsedFilters.success) {
      return { data: null, error: { message: parsedFilters.error.issues[0].message, code: "VALIDATION" } };
    }
    const filters = parsedFilters.data;

    if (cursor) {
      const parsedCursor = jobsCursorSchema.safeParse(cursor);
      if (!parsedCursor.success) {
        return { data: null, error: { message: "Invalid pagination cursor.", code: "VALIDATION" } };
      }
    }

    // FriendBoard uses its own signed session cookie rather than Supabase
    // Auth. Once that session is verified above, server-side reads use the
    // private client so they aren't rejected as anonymous by Supabase RLS.
    const supabase = createAdminClient();

    const sort = filters.sort ?? "newest";
    const ascending = sort === "oldest";

    let query = supabase
      .from("jobs")
      .select("*, added_by:users!added_by_user_id(id, name)")
      .order("created_at", { ascending })
      .order("id", { ascending })
      .limit(PAGE_SIZE + 1); // fetch one extra to know if there's a next page

    const filled = filters.filled ?? "open";
    if (filled === "open") query = query.eq("is_filled", false);
    if (filled === "filled") query = query.eq("is_filled", true);

    if (filters.query?.trim()) {
      const term = filters.query.trim().toLowerCase().replace(/[%_]/g, "\\$&");
      query = query.ilike("search_text", `%${term}%`);
    }

    if (filters.experience?.length) {
      // Free-text `experience` column, so this is a best-effort loose
      // match per selected bucket rather than an exact enum filter.
      const clauses = filters.experience.map((bucket) => `experience.ilike.%${bucket}%`).join(",");
      query = query.or(clauses);
    }

    if (filters.skills?.length) {
      // Overlap against the gin-indexed skills array — job must have
      // at least one of the selected skills.
      query = query.overlaps("skills", filters.skills);
    }

    if (filters.company?.trim()) {
      query = query.ilike("company", `%${filters.company.trim().replace(/[%_]/g, "\\$&")}%`);
    }

    if (cursor) {
      const op = ascending ? "gt" : "lt";
      query = query.or(
        `created_at.${op}.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.${op}.${cursor.id})`
      );
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const hasMore = rows.length > PAGE_SIZE;
    const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    const jobIds = pageRows.map((r) => r.id);

    // Viewer's own interaction state + everyone's connection flags for
    // this page, fetched separately rather than as embedded joins so
    // the "only this viewer's interaction" filter stays a simple .eq.
    const [interactionsRes, connectionsRes] = await Promise.all([
      viewer && jobIds.length
        ? supabase.from("user_job_interactions").select("*").eq("user_id", viewer.id).in("job_id", jobIds)
        : Promise.resolve({ data: [], error: null }),
      jobIds.length
        ? supabase.from("job_connections").select("*, user:users(id, name)").in("job_id", jobIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (interactionsRes.error) throw interactionsRes.error;
    if (connectionsRes.error) throw connectionsRes.error;

    const interactionsByJob = new Map(interactionsRes.data!.map((i) => [i.job_id, i]));
    const connectionsByJob = new Map<string, typeof connectionsRes.data>();
    for (const c of connectionsRes.data ?? []) {
      const list = connectionsByJob.get(c.job_id) ?? [];
      list.push(c);
      connectionsByJob.set(c.job_id, list);
    }

    const jobs: JobWithContext[] = pageRows.map((row) => ({
      ...row,
      added_by: row.added_by as unknown as Pick<User, "id" | "name">,
      viewer_interaction: interactionsByJob.get(row.id) ?? null,
      connections: (connectionsByJob.get(row.id) ?? []) as JobWithContext["connections"],
    }));

    const last = pageRows[pageRows.length - 1];
    const nextCursor = hasMore && last ? { createdAt: last.created_at, id: last.id } : null;

    return { data: { jobs, nextCursor }, error: null };
  } catch (err) {
    return handleServerActionError(err, "getJobsPage");
  }
}

/**
 * Check whether a URL is already posted before creating a job for it.
 * Called on blur/paste from the submission form, ahead of actually
 * submitting, so the user sees the duplicate warning immediately.
 */
export async function checkDuplicateJob(
  url: string
): Promise<ActionResult<{ job: Pick<Job, "id" | "company" | "role">; addedBy: string } | null>> {
  try {
    if (!(await getCurrentUser())) {
      return { data: null, error: { message: "Please sign in to add a job.", code: "UNAUTHORIZED" } };
    }

    const supabase = createAdminClient();
    const normalized = normalizeJobUrl(url);

    const { data, error } = await supabase
      .from("jobs")
      .select("id, company, role, added_by:users!added_by_user_id(name)")
      .eq("url", normalized)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { data: null, error: null };

    return {
      data: {
        job: { id: data.id, company: data.company, role: data.role },
        addedBy: (data.added_by as unknown as { name: string }).name,
      },
      error: null,
    };
  } catch (err) {
    return handleServerActionError(err, "checkDuplicateJob");
  }
}

export interface CreateJobInput {
  url: string;
  company: string;
  role: string;
  experience?: string;
  skills: string[];
  salary?: string;
  /** When true, sets extraction_status = 'done' immediately (user filled
   *  details manually). When false/omitted, starts as 'pending' so
   *  extractJobDetails can fill it in asynchronously. */
  skipExtraction?: boolean;
  initialStatus?: JobStatus;
}

/**
 * Create a job posting. Re-checks for a duplicate URL server-side
 * (the client-side check on blur is a UX nicety, not a guarantee —
 * two people could paste the same link within seconds of each other)
 * and returns a typed DUPLICATE error with the existing job in `meta`
 * if so. The `jobs_url_unique_idx` unique index is the actual
 * guarantee against that race; if it fires (23505) we re-look-up the
 * existing job and return the same typed DUPLICATE shape instead of a
 * generic conflict error.
 */
export async function createJob(input: CreateJobInput): Promise<ActionResult<Job>> {
  try {
    const viewer = await getCurrentUser();
    if (!viewer) {
      return { data: null, error: { message: "Please sign in to add a job.", code: "UNAUTHORIZED" } };
    }

    const parsed = createJobServerSchema.safeParse(input);
    if (!parsed.success) {
      return { data: null, error: { message: parsed.error.issues[0].message, code: "VALIDATION" } };
    }

    const normalizedUrl = normalizeJobUrl(parsed.data.url);
    // The signed session above authorizes the caller. This app does not use
    // Supabase Auth, so the anonymous client has no RLS identity that can
    // authorize this server-side write.
    const supabase = createAdminClient();

    const dup = await checkDuplicateJob(normalizedUrl);
    if (dup.data) {
      return {
        data: null,
        error: {
          message: `This job was already added by ${dup.data.addedBy}. Would you like to track it?`,
          code: "DUPLICATE",
          meta: { jobId: dup.data.job.id },
        },
      };
    }

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        url: normalizedUrl,
        company: parsed.data.company,
        role: parsed.data.role,
        experience: parsed.data.experience?.trim() || null,
        skills: parsed.data.skills,
        salary: parsed.data.salary?.trim() || null,
        added_by_user_id: viewer.id,
        extraction_status: parsed.data.skipExtraction ? "done" : "pending",
      })
      .select()
      .single();

    if (error) {
      // Unique-constraint race: someone else's insert won between our
      // duplicate check and this insert. Surface it as DUPLICATE, not
      // a generic conflict.
      if (error.code === "23505") {
        const raced = await checkDuplicateJob(normalizedUrl);
        if (raced.data) {
          return {
            data: null,
            error: {
              message: `This job was already added by ${raced.data.addedBy}. Would you like to track it?`,
              code: "DUPLICATE",
              meta: { jobId: raced.data.job.id },
            },
          };
        }
      }
      throw error;
    }

    // Immediately log an interaction if the user opted in on submit.
    // We do this after the job insert (needs the job id) and swallow
    // failures — a failed interaction upsert shouldn't block the card
    // from appearing. The user can track it from the board afterward.
    if (parsed.data.initialStatus && data) {
      try {
        const adminSupabase = createAdminClient();
        await adminSupabase
          .from("user_job_interactions")
          .upsert(
            { user_id: viewer.id, job_id: data.id, status: parsed.data.initialStatus },
            { onConflict: "user_id,job_id" }
          );
      } catch {
        // Non-fatal: card is already created, tracker upsert is best-effort
      }
    }

    return { data, error: null };
  } catch (err) {
    return handleServerActionError(err, "createJob");
  }
}

/**
 * "Track it" from the duplicate-job prompt: instead of creating a new
 * job, just upsert a Draft interaction for the viewer on the existing
 * one, so it shows up on their personal tracker (Part 3).
 */
export async function trackExistingJob(jobId: string): Promise<ActionResult<{ jobId: string }>> {
  try {
    const viewer = await getCurrentUser();
    if (!viewer) {
      return { data: null, error: { message: "Please sign in to track a job.", code: "UNAUTHORIZED" } };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("user_job_interactions")
      .upsert({ user_id: viewer.id, job_id: jobId, status: "Draft" }, { onConflict: "user_id,job_id" });

    if (error) throw error;
    return { data: { jobId }, error: null };
  } catch (err) {
    return handleServerActionError(err, "trackExistingJob");
  }
}
