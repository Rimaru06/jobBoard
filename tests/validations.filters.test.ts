import { describe, expect, it } from "vitest";
import { jobFiltersSchema, jobsCursorSchema } from "@/lib/validations/filters";

describe("jobFiltersSchema", () => {
  it("accepts an empty filter set", () => {
    expect(jobFiltersSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the full filter set", () => {
    const result = jobFiltersSchema.safeParse({
      query: "engineer",
      experience: ["Senior", "Staff+"],
      skills: ["React", "TypeScript"],
      company: "Acme",
      filled: "open",
      sort: "newest",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid `filled` value", () => {
    expect(jobFiltersSchema.safeParse({ filled: "sometimes" }).success).toBe(false);
  });

  it("rejects an invalid `sort` value", () => {
    expect(jobFiltersSchema.safeParse({ sort: "random" }).success).toBe(false);
  });

  it("caps the number of skills/experience entries", () => {
    const many = Array.from({ length: 11 }, (_, i) => `x${i}`);
    expect(jobFiltersSchema.safeParse({ skills: many }).success).toBe(false);
    expect(jobFiltersSchema.safeParse({ experience: many }).success).toBe(false);
  });
});

describe("jobsCursorSchema", () => {
  it("requires a uuid id", () => {
    expect(
      jobsCursorSchema.safeParse({ createdAt: new Date().toISOString(), id: "not-a-uuid" }).success
    ).toBe(false);
  });

  it("accepts a well-formed cursor", () => {
    expect(
      jobsCursorSchema.safeParse({
        createdAt: new Date().toISOString(),
        id: "123e4567-e89b-12d3-a456-426614174000",
      }).success
    ).toBe(true);
  });
});
