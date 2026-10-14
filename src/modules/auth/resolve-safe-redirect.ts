export function resolveSafeRedirect(
  redirectUrl: string | null | undefined,
): string {
  if (!redirectUrl || typeof redirectUrl !== "string") {
    return "/admin";
  }

  if (
    redirectUrl.startsWith("//") ||
    redirectUrl.startsWith("/\\") ||
    /[\s\t]/.test(redirectUrl)
  ) {
    return "/admin";
  }

  if (!redirectUrl.startsWith("/")) {
    return "/admin";
  }

  try {
    const parsed = new URL(redirectUrl, "http://localhost");

    if (parsed.origin !== "http://localhost") {
      return "/admin";
    }

    const pathname = parsed.pathname;

    if (
      pathname.includes("%2f") ||
      pathname.includes("%2F") ||
      pathname.includes("%5c") ||
      pathname.includes("%5C") ||
      pathname.includes("%2e%2e") ||
      pathname.includes("%2E%2E") ||
      pathname.includes("..") ||
      pathname.includes("\\")
    ) {
      return "/admin";
    }

    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return pathname + parsed.search + parsed.hash;
    }

    return "/admin";
  } catch {
    return "/admin";
  }
}
