import { z } from "zod";

/**
 * Structured shape requested from Gemini and validated before ever
 * touching the database. Unknown/absent fields come back null rather
 * than guessed — a wrong guess is worse than an honest "unknown" the
 * UI can prompt a human to fill in.
 */
export const extractedJobSchema = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  location: z.string().trim().max(150).nullable().catch(null),
  employmentType: z.string().trim().max(60).nullable().catch(null),
  experience: z.string().trim().max(120).nullable().catch(null),
  skills: z.array(z.string().trim().min(1).max(60)).max(40).catch([]),
  salary: z.string().trim().max(120).nullable().catch(null),
  descriptionSummary: z.string().trim().max(500).nullable().catch(null),
  /** Gemini's own confidence in this extraction — surfaced later for a
   *  "double check this one" UI treatment if it comes back "low". */
  confidence: z.enum(["high", "medium", "low"]).catch("medium"),
});

export type ExtractedJobData = z.infer<typeof extractedJobSchema>;
