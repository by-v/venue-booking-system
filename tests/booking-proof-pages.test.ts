import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.resolve(import.meta.dirname, "../src/app");

const PUBLIC_PAGES = [
  "cek-status/page.tsx",
  "bukti-booking/[nomor]/page.tsx",
] as const;

const FORBIDDEN_PATTERNS = [
  /requireAdminSession/,
  /getAdminSessionOrNull/,
  /@\/modules\/auth/,
  /@\/app\/admin/,
  /from\s+["']\.\.\/admin/,
] as const;

describe("batas halaman publik booking-proof", () => {
  it.each(PUBLIC_PAGES)(
    "%s tidak memakai sesi atau modul admin",
    (relativePath) => {
      const source = readFileSync(path.join(APP, relativePath), "utf8");

      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(source).not.toMatch(pattern);
      }
    },
  );
});
