import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = join(process.cwd(), "src", "app");

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

describe("tidak ada rute registrasi publik", () => {
  it("tidak ada berkas rute sign-up/register di src/app", () => {
    const forbidden = /(^|[\\/])(sign-up|signup|register|daftar)([\\/]|\.|$)/i;
    const offenders = walk(APP_DIR).filter((file) => forbidden.test(file));
    expect(offenders).toEqual([]);
  });
});
