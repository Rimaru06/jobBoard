import { describe, expect, it } from "vitest";
import { pinSchema, setPinSchema, loginPinSchema } from "@/lib/validations/pin";

describe("pinSchema", () => {
  it("accepts exactly 6 digits", () => {
    expect(pinSchema.safeParse("123456").success).toBe(true);
  });

  it.each(["12345", "1234567", "12345a", "", "  123456  "])(
    "rejects %s unless it's exactly 6 digits",
    (value) => {
      const result = pinSchema.safeParse(value.trim());
      expect(result.success).toBe(value.trim().length === 6 && /^\d+$/.test(value.trim()));
    }
  );
});

describe("setPinSchema", () => {
  it("passes when pin and confirmPin match", () => {
    expect(setPinSchema.safeParse({ pin: "123456", confirmPin: "123456" }).success).toBe(true);
  });

  it("fails when pin and confirmPin differ", () => {
    const result = setPinSchema.safeParse({ pin: "123456", confirmPin: "654321" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirmPin"]);
    }
  });
});

describe("loginPinSchema", () => {
  it("requires a valid 6-digit pin", () => {
    expect(loginPinSchema.safeParse({ pin: "000000" }).success).toBe(true);
    expect(loginPinSchema.safeParse({ pin: "" }).success).toBe(false);
  });
});
