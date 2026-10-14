import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSafeRedirect } from "./resolve-safe-redirect";

export async function requireAdminSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    const headerList = await headers();
    const pathname = headerList.get("x-original-pathname") || "/";
    const safePath = resolveSafeRedirect(pathname);
    redirect(`/login?redirect=${safePath}`);
  }

  return session;
}

export async function getAdminSessionOrNull() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session ?? null;
}
