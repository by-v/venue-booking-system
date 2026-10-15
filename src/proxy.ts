import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { resolveSafeRedirect } from "@/modules/auth/resolve-safe-redirect";

export function proxy(request: NextRequest) {
  // Pengecekan optimistis: cukup keberadaan cookie sesi (nama cookie tidak
  // ditulis literal; `getSessionCookie` menangani prefiks `__Secure-`).
  const sessionCookie = getSessionCookie(request);

  const pathname = request.nextUrl.pathname;
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", resolveSafeRedirect(pathname));
    return NextResponse.redirect(url);
  }

  // Timpa header path asli pada REQUEST headers dengan pathname sebenarnya.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-original-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: "/admin/:path*",
};
