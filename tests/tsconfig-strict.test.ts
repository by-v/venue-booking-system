import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const tsconfigPath = path.resolve(import.meta.dirname, "../tsconfig.json");

describe("tsconfig strict mode", () => {
  it('memuat "strict": true', () => {
    const raw = readFileSync(tsconfigPath, "utf8");
    const config = JSON.parse(raw) as {
      compilerOptions?: { strict?: boolean };
    };

    expect(config.compilerOptions?.strict).toBe(true);
  });
});
