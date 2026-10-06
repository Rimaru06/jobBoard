import { describe, expect, it } from "vitest";
import { normalizeJobUrl } from "@/lib/normalizeUrl";

describe("normalizeJobUrl", () => {
  it("lowercases the hostname", () => {
    expect(normalizeJobUrl("https://ExAmple.COM/jobs/1")).toBe("https://example.com/jobs/1");
  });

  it("strips tracking params", () => {
    expect(normalizeJobUrl("https://example.com/jobs/1?utm_source=slack&ref=abc&foo=bar")).toBe(
      "https://example.com/jobs/1?foo=bar"
    );
  });

  it("drops a trailing slash (but not the root path)", () => {
    expect(normalizeJobUrl("https://example.com/jobs/1/")).toBe("https://example.com/jobs/1");
    expect(normalizeJobUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("drops the hash fragment", () => {
    expect(normalizeJobUrl("https://example.com/jobs/1#apply")).toBe("https://example.com/jobs/1");
  });

  it("treats equivalent URLs as identical after normalization", () => {
    const a = normalizeJobUrl("https://Example.com/jobs/1/?utm_source=slack#apply");
    const b = normalizeJobUrl("https://example.com/jobs/1");
    expect(a).toBe(b);
  });

  it("returns invalid input trimmed but otherwise unchanged", () => {
    expect(normalizeJobUrl("  not a url  ")).toBe("not a url");
  });
});
