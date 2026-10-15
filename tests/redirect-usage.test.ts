import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = path.resolve(import.meta.dirname, "../src");

function readSource(relativePath: string): string {
  return readFileSync(path.join(SRC_DIR, relativePath), "utf8");
}

describe("resolveSafeRedirect dipakai di semua titik redirect", () => {
  it("halaman login memakai resolveSafeRedirect saat membaca parameter redirect", () => {
    const source = readSource("app/login/page.tsx");
    expect(source).toContain("resolveSafeRedirect");
    expect(source).toContain('searchParams.get("redirect")');
  });

  it("helper requireAdminSession memakai resolveSafeRedirect saat membuat parameter", () => {
    const source = readSource("modules/auth/helpers.ts");
    expect(source).toContain("resolveSafeRedirect");
  });

  it("proxy memakai resolveSafeRedirect saat membuat parameter", () => {
    const source = readSource("proxy.ts");
    expect(source).toContain("resolveSafeRedirect");
  });
});
