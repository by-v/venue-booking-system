import { describe, expect, it } from "vitest";
import { resolveSafeRedirect } from "@/modules/auth/resolve-safe-redirect";

describe("resolveSafeRedirect - accept", () => {
  it("accepts /admin", () => {
    expect(resolveSafeRedirect("/admin")).toBe("/admin");
  });

  it("accepts /admin/settings", () => {
    expect(resolveSafeRedirect("/admin/settings")).toBe("/admin/settings");
  });
});
