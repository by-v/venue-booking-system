import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanProtectedFiles } from "./helpers/static-scanner";

const FIXTURES = path.resolve(import.meta.dirname, "fixtures/static");
const SRC = path.resolve(import.meta.dirname, "../src");

describe("pemindai statis penegakan helper", () => {
  it("tidak melaporkan pelanggaran pada fixture good", () => {
    expect(scanProtectedFiles(path.join(FIXTURES, "good"))).toEqual([]);
  });

  it("melaporkan pelanggaran pemanggilan helper pada fixture bad", () => {
    const violations = scanProtectedFiles(path.join(FIXTURES, "bad"));
    const byPath = new Map(violations.map((item) => [item.relativePath, item]));

    // page: impor helper tanpa memanggil -> tetap pelanggaran.
    expect(byPath.get("app/admin/page.tsx")).toMatchObject({
      kind: "admin-page",
      expectedHelper: "requireAdminSession",
    });
    // route: tidak memanggil helper.
    expect(byPath.get("app/admin/api/route.ts")).toMatchObject({
      kind: "admin-route",
      expectedHelper: "getAdminSessionOrNull",
    });
    // 'use server': tidak memanggil helper.
    expect(byPath.get("app/admin/actions.ts")).toMatchObject({
      kind: "use-server",
      expectedHelper: "requireAdminSession",
    });

    expect(violations).toHaveLength(3);
  });

  it("daftar pengecualian kosong secara default", () => {
    expect(
      scanProtectedFiles(path.join(FIXTURES, "bad"), { exceptions: [] }),
    ).toHaveLength(3);
  });

  it("menghormati pengecualian eksplisit", () => {
    const violations = scanProtectedFiles(path.join(FIXTURES, "bad"), {
      exceptions: ["app/admin/page.tsx"],
    });

    expect(violations.map((item) => item.relativePath)).not.toContain(
      "app/admin/page.tsx",
    );
    expect(violations).toHaveLength(2);
  });

  it("tidak melaporkan pelanggaran saat dijalankan terhadap src/", () => {
    expect(scanProtectedFiles(SRC)).toEqual([]);
  });
});
