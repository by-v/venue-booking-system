import { unstable_doesMiddlewareMatch } from "next/dist/experimental/testing/server/middleware-testing-utils";
import { describe, expect, it } from "vitest";
import { config } from "@/proxy";

function proxyRunsFor(pathname: string) {
  return unstable_doesMiddlewareMatch({ config, url: pathname });
}

describe("proxy hanya berjalan untuk /admin", () => {
  it("/login tidak diproteksi proxy", () => {
    expect(proxyRunsFor("/login")).toBe(false);
    expect(proxyRunsFor("/login?redirect=%2Fadmin")).toBe(false);
  });

  it("/api/auth/* tidak diproteksi proxy", () => {
    expect(proxyRunsFor("/api/auth/sign-in/email")).toBe(false);
    expect(proxyRunsFor("/api/auth/get-session")).toBe(false);
  });

  it("/admin dan semua subpath diproteksi proxy", () => {
    expect(proxyRunsFor("/admin")).toBe(true);
    expect(proxyRunsFor("/admin/settings")).toBe(true);
  });
});
