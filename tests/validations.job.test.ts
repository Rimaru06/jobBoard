import { describe, expect, it } from "vitest";
import { createJobFormSchema, createJobServerSchema, jobEditServerSchema } from "@/lib/validations/job";

describe("createJobFormSchema", () => {
  it("requires a valid URL", () => {
    const result = createJobFormSchema.safeParse({ url: "not-a-url", mode: "paste-go" });
    expect(result.success).toBe(false);
  });

  it("allows paste-go mode with only a URL", () => {
    const result = createJobFormSchema.safeParse({ url: "https://example.com/job/1", mode: "paste-go" });
    expect(result.success).toBe(true);
  });

  it("requires company and role in manual mode", () => {
    const result = createJobFormSchema.safeParse({ url: "https://example.com/job/1", mode: "manual" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("company");
      expect(paths).toContain("role");
    }
  });

  it("passes manual mode once company and role are filled in", () => {
    const result = createJobFormSchema.safeParse({
      url: "https://example.com/job/1",
      mode: "manual",
      company: "Acme",
      role: "Engineer",
    });
    expect(result.success).toBe(true);
  });
});

describe("createJobServerSchema", () => {
  it("rejects an empty skills array beyond the max", () => {
    const tooMany = Array.from({ length: 31 }, (_, i) => `skill-${i}`);
    const result = createJobServerSchema.safeParse({
      url: "https://example.com/job/1",
      company: "Acme",
      role: "Engineer",
      skills: tooMany,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed payload", () => {
    const result = createJobServerSchema.safeParse({
      url: "https://example.com/job/1",
      company: "Acme",
      role: "Engineer",
      skills: ["TypeScript", "React"],
    });
    expect(result.success).toBe(true);
  });
});

describe("jobEditServerSchema", () => {
  it("requires non-empty company and role", () => {
    expect(jobEditServerSchema.safeParse({ company: "", role: "", skills: [] }).success).toBe(false);
  });

  it("accepts a minimal valid edit", () => {
    expect(jobEditServerSchema.safeParse({ company: "Acme", role: "Engineer", skills: [] }).success).toBe(
      true
    );
  });
});
