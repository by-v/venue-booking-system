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

describe("proxy proteksi /admin", () => {
  it("tanpa cookie sesi mengalihkan ke /login membawa path asli", () => {
    const res = proxy(makeRequest("/admin"));

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toBeTruthy();

    const url = new URL(location as string);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirect")).toBe("/admin");
  });

  it("tanpa cookie sesi pada subpath membawa subpath pada parameter redirect", () => {
    const res = proxy(makeRequest("/admin/settings"));

    const url = new URL(res.headers.get("location") as string);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirect")).toBe("/admin/settings");
  });

  it("dengan cookie sesi meloloskan request tanpa redirect", () => {
    const res = proxy(makeRequest("/admin", VALID_SESSION_COOKIE));

    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });
});
