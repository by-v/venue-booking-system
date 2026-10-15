import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({ headerStore: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => mockState.headerStore,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string): never => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { requireAdminSession } from "@/modules/auth";
import { runSeed } from "@/modules/auth/run-seed";
import {
  extractCookies,
  getSessionRequest,
  signInRequest,
} from "./helpers/auth-http";
import {
  makeSeedPrompts,
  SEED_TEST_DATABASE_URL,
  SEED_TEST_EMAIL,
  SEED_TEST_PASSWORD,
} from "./helpers/seed-prompts";

beforeEach(() => {
  mockState.headerStore = new Headers();
});

describe("seed admin - akun hasil seed dapat login", () => {
  it("membuat akun lewat runSeed, login berhasil, dan memiliki akses Admin", async () => {
    const result = await runSeed({
      databaseUrl: SEED_TEST_DATABASE_URL,
      prompts: makeSeedPrompts(),
      log: () => {},
    });
    expect(result).toEqual({ status: "created" });

    const res = await signInRequest(SEED_TEST_EMAIL, SEED_TEST_PASSWORD);
    expect(res.status).toBe(200);

    const cookies = extractCookies(res);
    const sessionRes = await getSessionRequest(cookies);
    const body = (await sessionRes.json()) as { user?: { email?: string } };
    expect(body.user?.email).toBe(SEED_TEST_EMAIL);

    // Akses Admin: helper server tidak mengalihkan sesi valid.
    mockState.headerStore = new Headers({ cookie: cookies });
    const session = await requireAdminSession();
    expect(session.user.email).toBe(SEED_TEST_EMAIL);
  }, 30000);
});
