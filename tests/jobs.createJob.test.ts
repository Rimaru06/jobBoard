import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "./helpers/supabaseMock";

let currentUser: { id: string; name: string; role: "admin" | "friend" } | null = null;
vi.mock("@/lib/auth", () => ({
  getCurrentUser: async () => currentUser,
}));

let adminClientFactory: () => unknown;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminClientFactory(),
}));

const { createJob } = await import("@/lib/actions/jobs");

describe("createJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: "user-1", name: "Alex", role: "friend" };
  });

  it("requires an authenticated session", async () => {
    currentUser = null;
    const result = await createJob({
      url: "https://example.com/job/1",
      company: "Acme",
      role: "Engineer",
      skills: [],
      skipExtraction: true,
    });
    expect(result.error?.code).toBe("UNAUTHORIZED");
  });

  it("rejects an invalid URL before any database call", async () => {
    adminClientFactory = () => {
      throw new Error("should not be called for invalid input");
    };
    const result = await createJob({
      url: "not-a-url",
      company: "Acme",
      role: "Engineer",
      skills: [],
      skipExtraction: true,
    });
    expect(result.error?.code).toBe("VALIDATION");
  });

  it("returns a typed DUPLICATE result when the URL already exists", async () => {
    adminClientFactory = createSupabaseMock({
      jobs: {
        select: {
          data: { id: "job-1", company: "Acme", role: "Engineer", added_by: { name: "Sam" } },
          error: null,
        },
      },
    });

    const result = await createJob({
      url: "https://example.com/job/1",
      company: "Acme",
      role: "Engineer",
      skills: [],
      skipExtraction: true,
    });

    expect(result.error?.code).toBe("DUPLICATE");
    expect(result.error?.meta?.jobId).toBe("job-1");
  });

  it("creates the job when the URL is new", async () => {
    adminClientFactory = createSupabaseMock({
      jobs: {
        select: { data: null, error: null }, // no existing duplicate
        insert: {
          data: { id: "job-2", url: "https://example.com/job/2", company: "Acme", role: "Engineer" },
          error: null,
        },
      },
    });

    const result = await createJob({
      url: "https://example.com/job/2",
      company: "Acme",
      role: "Engineer",
      skills: ["TypeScript"],
      skipExtraction: true,
    });

    expect(result.error).toBeNull();
    expect(result.data?.id).toBe("job-2");
  });
});
