"use server";

import { requireAdminSession } from "@/modules/auth";

export async function goodAction() {
  await requireAdminSession();
}
