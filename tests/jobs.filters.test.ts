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

const { getJobsPage } = await import("@/lib/actions/jobs");

describe("getJobsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: "user-1", name: "Alex", role: "friend" };
    adminClientFactory = createSupabaseMock({
      jobs: { select: { data: [], error: null } },
      user_job_interactions: { select: { data: [], error: null } },
      job_connections: { select: { data: [], error: null } },
    });
  });

  it("requires an authenticated session", async () => {
    currentUser = null;
    const result = await getJobsPage({}, null);
    expect(result.error?.code).toBe("UNAUTHORIZED");
  });

  it("rejects an invalid sort value", async () => {
    // @ts-expect-error intentionally invalid for the test
    const result = await getJobsPage({ sort: "random" }, null);
    expect(result.error?.code).toBe("VALIDATION");
  });

  it("rejects a malformed pagination cursor", async () => {
    const result = await getJobsPage({}, { createdAt: "not-a-date", id: "not-a-uuid" });
    expect(result.error?.code).toBe("VALIDATION");
  });

  it("returns an empty page for valid filters with no matching jobs", async () => {
    const result = await getJobsPage({ query: "engineer", sort: "newest" }, null);
    expect(result.error).toBeNull();
    expect(result.data?.jobs).toEqual([]);
    expect(result.data?.nextCursor).toBeNull();
  });
});
