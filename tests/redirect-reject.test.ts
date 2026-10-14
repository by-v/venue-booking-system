import { describe, expect, it } from "vitest";
import { resolveSafeRedirect } from "@/modules/auth/resolve-safe-redirect";

describe("resolveSafeRedirect - reject", () => {
  it("rejects external protocol", () => {
    expect(resolveSafeRedirect("https://evil.com/admin")).toBe("/admin");
  });

  it("rejects external with //", () => {
    expect(resolveSafeRedirect("//evil.com")).toBe("/admin");
  });

  it("rejects backslash escape", () => {
    expect(resolveSafeRedirect("/\\evil.com")).toBe("/admin");
  });

  it("rejects encoded slash", () => {
    expect(resolveSafeRedirect("/%2F/evil.com")).toBe("/admin");
  });

  it("rejects whitespace/tab", () => {
    expect(resolveSafeRedirect("/admin\tsettings")).toBe("/admin");
  });

  it("rejects non-admin path", () => {
    expect(resolveSafeRedirect("/administrator")).toBe("/admin");
  });

  it("rejects path traversal ../", () => {
    expect(resolveSafeRedirect("/admin/../login")).toBe("/admin");
  });

  it("rejects encoded traversal", () => {
    expect(resolveSafeRedirect("/admin%2F..")).toBe("/admin");
  });

  it("rejects backslash traversal", () => {
    expect(resolveSafeRedirect("/admin%5C..")).toBe("/admin");
  });

  it("rejects double dot encoded", () => {
    expect(resolveSafeRedirect("/admin/%2e%2e/login")).toBe("/admin");
  });
});
