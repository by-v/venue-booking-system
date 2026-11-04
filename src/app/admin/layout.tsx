import type { ReactNode } from "react";

import { requireAdminSession } from "@/modules/auth";

import { AdminShell } from "./admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdminSession();

  return <AdminShell userEmail={session.user.email}>{children}</AdminShell>;
}
