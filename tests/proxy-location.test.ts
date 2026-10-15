import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

const SRC_DIR = path.resolve(import.meta.dirname, "../src");

describe("lokasi dan bentuk berkas proxy", () => {
  it("berkas proxy berada di src/proxy.ts dan middleware.ts tidak ada", () => {
    expect(existsSync(path.join(SRC_DIR, "proxy.ts"))).toBe(true);
    expect(existsSync(path.join(SRC_DIR, "middleware.ts"))).toBe(false);
  });

  it("proxy diekspor sebagai fungsi bernama `proxy`", () => {
    expect(typeof proxy).toBe("function");
  });

  it("config.matcher terbatas pada /admin/:path*", () => {
    expect(config.matcher).toBe("/admin/:path*");
  });
});
