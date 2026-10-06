import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "./helpers/supabaseMock";

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: () => cookieStore,
}));

vi.mock("@/lib/session", () => ({
  SESSION_COOKIE: "fb_session",
  UID_COOKIE: "fb_uid",
  sessionCookieOptions: {},
  uidCookieOptions: {},
  createSessionToken: vi.fn(async () => "fake-session-token"),
}));

let adminClientFactory: () => unknown;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminClientFactory(),
}));

const { redeemInvite } = await import("@/lib/actions/auth");

describe("redeemInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a PIN that isn't exactly 6 digits before touching the database", async () => {
    adminClientFactory = () => {
      throw new Error("should not be called for invalid PIN input");
    };

    const result = await redeemInvite("some-token", "123");
    expect(result.error?.code).toBe("VALIDATION");
  });

  it("returns NOT_FOUND when the invite token is already used or unknown", async () => {
    adminClientFactory = createSupabaseMock({
      invite_tokens: { update: { data: null, error: null } }, // claim matched zero rows
    });

    const result = await redeemInvite("used-token", "123456");
    expect(result.error?.code).toBe("NOT_FOUND");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("claims the invite, creates the user, and establishes a session on success", async () => {
    adminClientFactory = createSupabaseMock({
      invite_tokens: {
        update: { data: { id: "invite-1", assigned_name: "Alex" }, error: null },
      },
      users: {
        insert: { data: { id: "user-1", name: "Alex", role: "friend" }, error: null },
      },
    });

    const result = await redeemInvite("fresh-token", "123456");
    expect(result.error).toBeNull();
    expect(cookieStore.set).toHaveBeenCalledWith("fb_session", "fake-session-token", {});
    expect(cookieStore.set).toHaveBeenCalledWith("fb_uid", "user-1", {});
  });
});
