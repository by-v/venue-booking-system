import { createHash, timingSafeEqual } from "node:crypto";

import { runReservationLifecycle } from "@/modules/reservation/mutations";

/**
 * Endpoint job harian BR-17 dan BR-13. Bukan rute admin; perlindungannya
 * adalah `CRON_SECRET` dari header `Authorization: Bearer <secret>`.
 */

const NO_STORE = { "Cache-Control": "no-store" } as const;
const BEARER_PREFIX = "Bearer ";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function isAuthorized(request: Request): boolean {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith(BEARER_PREFIX)) {
    return false;
  }

  const providedSecret = authorization.slice(BEARER_PREFIX.length);
  return timingSafeEqual(digest(expectedSecret), digest(providedSecret));
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const summary = await runReservationLifecycle();
    return json(summary);
  } catch {
    return json({ error: "Job gagal dijalankan." }, 500);
  }
}
