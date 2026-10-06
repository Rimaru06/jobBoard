import { describe, expect, it } from "vitest";
import { extractedJobSchema } from "@/lib/validations/extraction";

describe("extractedJobSchema", () => {
  it("accepts a fully-populated, well-formed Gemini response", () => {
    const result = extractedJobSchema.safeParse({
      company: "Acme Corp",
      role: "Senior Backend Engineer",
      location: "Remote (US)",
      employmentType: "Full-time",
      experience: "5+ years",
      skills: ["Go", "PostgreSQL", "Kubernetes"],
      salary: "$150,000 - $190,000",
      descriptionSummary: "Build and scale Acme's core payments platform.",
      confidence: "high",
    });
    expect(result.success).toBe(true);
  });

  it("requires company and role", () => {
    const result = extractedJobSchema.safeParse({
      company: "",
      role: "",
      location: null,
      employmentType: null,
      experience: null,
      skills: [],
      salary: null,
      descriptionSummary: null,
      confidence: "medium",
    });
    expect(result.success).toBe(false);
  });

  it("falls back to safe defaults for a malformed confidence/skills shape rather than throwing", () => {
    const result = extractedJobSchema.safeParse({
      company: "Acme",
      role: "Engineer",
      location: null,
      employmentType: null,
      experience: null,
      skills: "not-an-array", // malformed — should be coerced to [] via .catch
      salary: null,
      descriptionSummary: null,
      confidence: "extremely-confident", // malformed — should fall back to "medium"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toEqual([]);
      expect(result.data.confidence).toBe("medium");
    }
  });

  it("rejects a non-object payload", () => {
    expect(extractedJobSchema.safeParse("just a string").success).toBe(false);
    expect(extractedJobSchema.safeParse(null).success).toBe(false);
  });
});
