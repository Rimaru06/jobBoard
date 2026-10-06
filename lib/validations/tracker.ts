import { z } from "zod";

export const jobStatusSchema = z.enum(["Draft", "Applied", "Interviewing", "Offered", "Rejected"]);

/** Tracker status change / notes autosave — used by StatusMenu and NotesEditor. */
export const upsertInteractionSchema = z
  .object({
    status: jobStatusSchema.optional(),
    notes: z.string().max(4000, "Notes are too long (max 4000 characters).").nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.notes !== undefined, { message: "Nothing to update." });

export type UpsertInteractionValues = z.infer<typeof upsertInteractionSchema>;

/** Tracker filter bar — status pills, search, and sort. */
export const trackerFiltersSchema = z.object({
  statuses: z.array(jobStatusSchema).max(5).optional(),
  query: z.string().trim().max(200).optional(),
  sort: z.enum(["updated_at_desc", "added_at_desc", "status_asc", "status_desc"]).optional(),
});

export type TrackerFiltersValues = z.infer<typeof trackerFiltersSchema>;
