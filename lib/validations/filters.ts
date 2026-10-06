import { z } from "zod";

/** Board feed filters — search box, quick-filter pills, and sort order.
 *  Shared by the client FilterBar (URL search params) and the
 *  getJobsPage server action, which re-validates independently of
 *  whatever the client sent. */
export const jobFiltersSchema = z.object({
  query: z.string().trim().max(200).optional(),
  experience: z.array(z.string().trim().max(40)).max(10).optional(),
  skills: z.array(z.string().trim().max(40)).max(10).optional(),
  company: z.string().trim().max(120).optional(),
  /** "open" hides filled roles (default), "filled" shows only filled
   *  roles, "all" shows everything regardless of fill state. */
  filled: z.enum(["open", "filled", "all"]).optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
});

export type JobFiltersValues = z.infer<typeof jobFiltersSchema>;

export const jobsCursorSchema = z.object({
  createdAt: z.string(),
  id: z.string().uuid(),
});
