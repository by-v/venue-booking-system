import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  findForbiddenAppImports,
  isForbiddenAppSpecifier,
} from "./helpers/module-boundary";

const SRC = path.resolve(import.meta.dirname, "../src");
const FIXTURES = path.resolve(import.meta.dirname, "fixtures/module-boundary");

describe("arah ketergantungan modul", () => {
  it("tidak melaporkan impor terlarang pada fixture good", () => {
    expect(
      findForbiddenAppImports(
        path.join(FIXTURES, "good", "modules"),
        path.join(FIXTURES, "good", "app"),
      ),
    ).toEqual([]);
  });

  it("melaporkan modul yang mengimpor dari app pada fixture bad", () => {
    const violations = findForbiddenAppImports(
      path.join(FIXTURES, "bad", "modules"),
      path.join(FIXTURES, "bad", "app"),
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      relativePath: "bad-import.ts",
      specifier: "../app/data",
    });
  });

  it("mengenali impor alias @/app dan path relatif ke app sebagai terlarang", () => {
    const moduleFile = path.join(SRC, "modules", "contoh.ts");
    const appDir = path.join(SRC, "app");

    expect(isForbiddenAppSpecifier(moduleFile, "@/app/page", appDir)).toBe(true);
    expect(isForbiddenAppSpecifier(moduleFile, "../app/page", appDir)).toBe(true);

    expect(isForbiddenAppSpecifier(moduleFile, "@/lib/db", appDir)).toBe(false);
    expect(isForbiddenAppSpecifier(moduleFile, "./sibling", appDir)).toBe(false);
  });

  it("src/modules tidak mengimpor dari src/app", () => {
    expect(
      findForbiddenAppImports(path.join(SRC, "modules"), path.join(SRC, "app")),
    ).toEqual([]);
  });
});
