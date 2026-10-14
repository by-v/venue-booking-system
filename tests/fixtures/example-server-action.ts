"use server";

import { requireAdminSession } from "@/modules/auth";

export async function exampleAction() {
  await requireAdminSession();
}
