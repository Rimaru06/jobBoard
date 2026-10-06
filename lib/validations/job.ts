import { z } from "zod";

/**
 * Shared Zod schema for manual job edits. Used by EditJobModal (client
 * validation) and updateJobManually (server-side the action does its
 * own structural check — Zod here keeps the client honest before the
 * round-trip).
 */
export const jobEditSchema = z.object({
  company: z.string().min(1, "Company is required").max(120, "Too long"),
  role: z.string().min(1, "Role is required").max(120, "Too long"),
  experience: z.string().max(80, "Too long").optional(),
  skills: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  salary: z.string().max(80, "Too long").optional(),
});

export type JobEditFormValues = z.input<typeof jobEditSchema>;
export type JobEditParsed = z.output<typeof jobEditSchema>;

/** Same fields as jobEditSchema, but for server-side re-validation of an
 *  already-parsed JobUpdateInput (skills is an array, not CSV text). */
export const jobEditServerSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(120, "Too long"),
  role: z.string().trim().min(1, "Role is required").max(120, "Too long"),
  experience: z.string().trim().max(80, "Too long").optional(),
  skills: z.array(z.string().trim().min(1)).max(30, "Too many skills"),
  salary: z.string().trim().max(80, "Too long").optional(),
});

// ── Job creation ──────────────────────────────────────────────────

export const jobUrlSchema = z.string().trim().min(1, "A job URL is required.").url("Enter a valid URL.");

const trackAsSchema = z.enum(["none", "Draft", "Applied", "Interviewing"]);

/** SubmitJobForm's raw field values (RHF + zodResolver client-side). */
export const createJobFormSchema = z
  .object({
    url: jobUrlSchema,
    mode: z.enum(["paste-go", "manual"]),
    company: z.string().trim().max(120, "Too long").optional().default(""),
    role: z.string().trim().max(120, "Too long").optional().default(""),
    experience: z.string().trim().max(80, "Too long").optional().default(""),
    skills: z.string().optional().default(""),
    salary: z.string().trim().max(80, "Too long").optional().default(""),
    trackAs: trackAsSchema.default("none"),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "manual") {
      if (!val.company.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Company is required", path: ["company"] });
      }
      if (!val.role.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Role is required", path: ["role"] });
      }
    }
  });

export type CreateJobFormValues = z.input<typeof createJobFormSchema>;
export type CreateJobFormParsed = z.output<typeof createJobFormSchema>;

/** Server-side re-validation of createJob()'s already-parsed input.
 *  Never trust that the client actually ran createJobFormSchema. */
export const createJobServerSchema = z.object({
  url: jobUrlSchema,
  company: z.string().trim().min(1, "Company is required").max(120, "Too long"),
  role: z.string().trim().min(1, "Role is required").max(120, "Too long"),
  experience: z.string().trim().max(80, "Too long").optional(),
  skills: z.array(z.string().trim().min(1)).max(30, "Too many skills"),
  salary: z.string().trim().max(80, "Too long").optional(),
  skipExtraction: z.boolean().optional(),
  initialStatus: z.enum(["Draft", "Applied", "Interviewing", "Offered", "Rejected"]).optional(),
});
