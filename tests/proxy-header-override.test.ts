import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

const BASE_URL = "http://localhost:3000";
const VALID_SESSION_COOKIE = "better-auth.session_token=token.signature";

function makeRequest(
  pathname: string,
  cookie?: string,
  extraHeaders: Record<string, string> = {},
) {
  const headers = new Headers(extraHeaders);
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(new URL(pathname, BASE_URL), { headers });
}

describe("proxy menimpa header x-original-pathname", () => {
  it("nilai dari klien ditimpa dengan pathname request sebenarnya", () => {
    const res = proxy(
      makeRequest("/admin/settings", VALID_SESSION_COOKIE, {
        "x-original-pathname": "/evil-from-client",
      }),
    );

    const overrides = (res.headers.get("x-middleware-override-headers") ?? "")
      .split(",")
      .map((value) => value.trim());
    expect(overrides).toContain("x-original-pathname");

    expect(res.headers.get("x-middleware-request-x-original-pathname")).toBe(
      "/admin/settings",
    );
  });

  it("header x-original-pathname selalu ditulis oleh proxy walau klien tidak mengirim", () => {
    const res = proxy(makeRequest("/admin", VALID_SESSION_COOKIE));

    expect(res.headers.get("x-middleware-request-x-original-pathname")).toBe(
      "/admin",
    );
  });
});
