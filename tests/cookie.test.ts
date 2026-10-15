import { execFileSync } from "node:child_process";
import path from "node:path";
import { getCookies } from "better-auth/cookies";
import { describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { extractCookies, signInRequest } from "./helpers/auth-http";
import { createTestUser } from "./helpers/create-user";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

describe("atribut cookie sesi", () => {
  it("respons login nyata: HttpOnly, SameSite=Lax, Path=/ (tanpa Secure pada http)", async () => {
    const creds = await createTestUser();
    const res = await signInRequest(creds.email, creds.password);

    const setCookies = res.headers.getSetCookie();
    const sessionCookie = setCookies.find((value) =>
      value.startsWith("better-auth.session_token="),
    );
    expect(sessionCookie).toBeDefined();

    expect(sessionCookie).toMatch(/HttpOnly/i);
    expect(sessionCookie).toMatch(/SameSite=Lax/i);
    expect(sessionCookie).toMatch(/Path=\//i);
    expect(sessionCookie).not.toMatch(/;\s*Secure/i);
    expect(extractCookies(res)).toContain("session_token");
  }, 30000);

  it("instance production (base URL https) menandai cookie Secure + prefiks __Secure-", () => {
    const cookies = getCookies({
      ...auth.options,
      baseURL: "https://venue.example.test",
    });

    expect(cookies.sessionToken.attributes.secure).toBe(true);
    expect(cookies.sessionToken.name.startsWith("__Secure-")).toBe(true);
  });

  /**
   * `isProduction` di `@better-auth/core/env` dihitung sekali saat modul dimuat
   * dan modul `better-auth` berada di `node_modules` (di-externalize Vite),
   * sehingga `vi.resetModules()` tidak dapat memuat ulang cache ESM aslinya.
   * Karena itu nilai default berbasis `NODE_ENV=production` diverifikasi dengan
   * menjalankan proses node baru bertanda `NODE_ENV=production`.
   */
  it("NODE_ENV=production menandai cookie Secure + prefiks __Secure- (default Better Auth)", () => {
    const script = [
      'import("better-auth/cookies").then((m) => {',
      "  const c = m.getCookies({ secret: 'test-secret-min-32-chars-long-xyz' });",
      "  process.stdout.write(JSON.stringify({",
      "    name: c.sessionToken.name,",
      "    secure: c.sessionToken.attributes.secure,",
      "  }));",
      "});",
    ].join("\n");

    const output = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        cwd: PROJECT_ROOT,
        env: { ...process.env, NODE_ENV: "production" },
        encoding: "utf8",
      },
    );

    const parsed = JSON.parse(output) as { name: string; secure: boolean };
    expect(parsed.secure).toBe(true);
    expect(parsed.name.startsWith("__Secure-")).toBe(true);
  }, 30000);
});
