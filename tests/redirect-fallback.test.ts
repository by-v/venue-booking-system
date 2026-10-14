import { describe, expect, it } from "vitest";
import { resolveSafeRedirect } from "@/modules/auth/resolve-safe-redirect";

describe("resolveSafeRedirect - fallback", () => {
  it("returns /admin for empty", () => {
    expect(resolveSafeRedirect("")).toBe("/admin");
  });

  it("returns /admin for null/undefined", () => {
    expect(resolveSafeRedirect(null)).toBe("/admin");
    expect(resolveSafeRedirect(undefined)).toBe("/admin");
  });
});
