import { GET, POST } from "@/app/api/auth/[...all]/route";

/**
 * Helper HTTP untuk memanggil route handler Better Auth seperti permintaan
 * nyata (`POST(new Request(...))`). Dipakai tes login, sesi, dan rate limit.
 */
export const AUTH_BASE_URL = "http://localhost:3000";

export function authRequest(path: string, init: RequestInit = {}) {
  return new Request(`${AUTH_BASE_URL}/api/auth${path}`, init);
}

const JSON_HEADERS = { "content-type": "application/json", origin: AUTH_BASE_URL };

export function signInRequest(
  email: string,
  password: string,
  headers: Record<string, string> = {},
) {
  return POST(
    authRequest("/sign-in/email", {
      method: "POST",
      headers: { ...JSON_HEADERS, ...headers },
      body: JSON.stringify({ email, password }),
    }),
  );
}

export function signUpRequest(
  email: string,
  password: string,
  headers: Record<string, string> = {},
) {
  return POST(
    authRequest("/sign-up/email", {
      method: "POST",
      headers: { ...JSON_HEADERS, ...headers },
      body: JSON.stringify({ name: email, email, password }),
    }),
  );
}

export function signOutRequest(cookie: string) {
  return POST(
    authRequest("/sign-out", {
      method: "POST",
      headers: { ...JSON_HEADERS, cookie },
    }),
  );
}

export function getSessionRequest(cookie: string) {
  return GET(
    authRequest("/get-session", {
      method: "GET",
      headers: { cookie },
    }),
  );
}

/** Gabungkan seluruh pasangan `name=value` dari header `Set-Cookie`. */
export function extractCookies(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

/** Ambil token mentah dari cookie sesi (`<name>=<token>.<signature>`). */
export function sessionTokenFromCookie(cookie: string): string {
  const value = cookie.slice(cookie.indexOf("=") + 1);
  return value.split(".")[0] ?? "";
}
