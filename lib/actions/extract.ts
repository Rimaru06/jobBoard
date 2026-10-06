"use server";

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { handleServerActionError, type ActionResult } from "@/lib/errors";
import { extractedJobSchema, type ExtractedJobData } from "@/lib/validations/extraction";
import type { Json } from "@/types/database";

// ── Gemini client ─────────────────────────────────────────────────

// gemini-2.5-flash-lite is Google's current lowest-cost model suitable
// for structured extraction (cheaper/faster than the -flash and -pro
// tiers, at some quality cost this task doesn't need). If Google
// retires it, check https://ai.google.dev/gemini-api/docs/models for
// the current "flash-lite" tier and swap the string below — nothing
// else in this module depends on a specific model.
const MODEL_NAME = "gemini-2.5-flash-lite";

function geminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(key).getGenerativeModel({
    model: MODEL_NAME,
    // Conservative safety settings — job listings don't need to be
    // unlocked in any category, and keeping defaults prevents surprise
    // blocks on salary ranges or recruiter-speak.
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  });
}

// ── Extraction prompt ─────────────────────────────────────────────
// Compact by design — every extra sentence here is extra input tokens
// on every single extraction call. `responseMimeType: "application/json"`
// (set below) already constrains Gemini to valid JSON, so the prompt
// only needs to describe the *shape*, not repeat "return only JSON".

const PROMPT = `Extract structured fields from this job posting. Use null for anything not stated — never guess.

Return JSON:
{
  "company": string,
  "role": string,
  "location": string | null,
  "employmentType": string | null (e.g. "Full-time", "Contract", "Internship"),
  "experience": string | null (e.g. "3-5 years", "Senior", "Entry level"),
  "skills": string[] (specific tools/languages/frameworks only, no soft skills),
  "salary": string | null (preserve original currency/format),
  "descriptionSummary": string | null (max 2 sentences),
  "confidence": "high" | "medium" | "low" (your confidence in this extraction overall)
}`;

const MAX_INPUT_CHARS = 12_000; // ~9k tokens — aggressive cap, this is a cost-sensitive background job

// ── URL fetching ──────────────────────────────────────────────────

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      // Appear as a real browser; many ATS/job board platforms block
      // bare fetch() user-agent strings outright.
      "User-Agent": "Mozilla/5.0 (compatible; FriendBoard/1.0; +https://friendboard.app)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

  const html = await res.text();
  // Strip tags and non-content chrome — Gemini doesn't need HTML
  // structure or site navigation/footers, and sending them wastes
  // tokens + dilutes the actual posting content.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, MAX_INPUT_CHARS);
}

// ── Core extraction ───────────────────────────────────────────────

async function extractFromText(pageText: string): Promise<ExtractedJobData> {
  const model = geminiClient();
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `${PROMPT}\n\n---\n\n${pageText}` }] }],
    generationConfig: {
      temperature: 0.1, // low — we want deterministic structured output, not creativity
      maxOutputTokens: 512,
      responseMimeType: "application/json", // ask Gemini to constrain output to valid JSON directly
    },
  });

  const raw = result.response.text().trim();
  // Gemini occasionally wraps JSON in markdown fences despite
  // responseMimeType — strip them defensively.
  const jsonText = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gemini returned non-JSON output (first 200 chars): ${raw.slice(0, 200)}`);
  }

  const result2 = extractedJobSchema.safeParse(parsed);
  if (!result2.success) {
    throw new Error(`Gemini output failed validation: ${result2.error.issues[0].message}`);
  }
  return result2.data;
}

// ── Public Server Actions ─────────────────────────────────────────

/**
 * Shared extraction runner used by both the initial post-create call
 * and the manual retry button. Always records an attempt (timestamp +
 * incremented retry count) before running, so "how many times has this
 * been tried" is accurate even if the attempt itself throws.
 *
 * Extraction failure NEVER blocks or hides the job itself — the job
 * row already exists by the time this runs; on failure we only flip
 * extraction_status to 'failed' with a safe, human-readable reason so
 * the card offers "Retry" / "Edit manually" instead of a stuck spinner.
 */
async function runExtraction(jobId: string, url: string): Promise<ActionResult<ExtractedJobData>> {
  const supabase = createAdminClient();

  const { data: current } = await supabase
    .from("jobs")
    .select("extraction_retry_count")
    .eq("id", jobId)
    .maybeSingle();

  await supabase
    .from("jobs")
    .update({
      extraction_attempted_at: new Date().toISOString(),
      extraction_retry_count: (current?.extraction_retry_count ?? 0) + 1,
    })
    .eq("id", jobId);

  try {
    const pageText = await fetchPageText(url);
    const extracted = await extractFromText(pageText);

    const { error } = await supabase
      .from("jobs")
      .update({
        company: extracted.company,
        role: extracted.role,
        experience: extracted.experience,
        skills: extracted.skills,
        salary: extracted.salary,
        extraction_status: "done",
        extraction_failure_reason: null,
        extraction_raw: extracted as unknown as Json,
      })
      .eq("id", jobId);

    if (error) throw error;
    return { data: extracted, error: null };
  } catch (err) {
    // Safe, truncated failure reason — never store a raw stack trace
    // or the fetched page content, only a short diagnostic message.
    const reason = err instanceof Error ? err.message.slice(0, 300) : "Unknown extraction error";
    await supabase
      .from("jobs")
      .update({ extraction_status: "failed", extraction_failure_reason: reason })
      .eq("id", jobId);
    return handleServerActionError(err, "extractJobDetails");
  }
}

/**
 * Background extraction action. Called immediately after createJob
 * returns (fire-and-forget from the client), so the card appears
 * instantly with "Extracting details…" while this runs behind the
 * scenes. No auth check here beyond the job existing — this is only
 * ever invoked right after a job this same session just created.
 */
export async function extractJobDetails(jobId: string, url: string): Promise<ActionResult<ExtractedJobData>> {
  return runExtraction(jobId, url);
}

/**
 * Explicit retry for a job whose extraction previously failed.
 * Unlike the initial call, this is user-triggered from an existing
 * card, so it re-verifies the session and re-derives the URL from the
 * database rather than trusting a client-supplied one.
 */
export async function retryExtraction(jobId: string): Promise<ActionResult<ExtractedJobData>> {
  try {
    const viewer = await getCurrentUser();
    if (!viewer) {
      return { data: null, error: { message: "Sign in first.", code: "UNAUTHORIZED" } };
    }

    const supabase = createAdminClient();
    const { data: job, error } = await supabase
      .from("jobs")
      .select("url, added_by_user_id")
      .eq("id", jobId)
      .maybeSingle();

    if (error) throw error;
    if (!job) return { data: null, error: { message: "Job not found.", code: "NOT_FOUND" } };
    if (job.added_by_user_id !== viewer.id && viewer.role !== "admin") {
      return {
        data: null,
        error: { message: "Only the creator or an admin can retry extraction.", code: "UNAUTHORIZED" },
      };
    }

    return runExtraction(jobId, job.url);
  } catch (err) {
    return handleServerActionError(err, "retryExtraction");
  }
}
