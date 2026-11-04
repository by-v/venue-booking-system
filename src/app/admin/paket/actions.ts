"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/modules/auth";
import { setPackageActive, upsertPackage } from "@/modules/venue/mutations";
import { packageInputSchema } from "@/modules/venue/schema";

/** Server Action pengelolaan paket (buat, ubah, aktif/nonaktif). */

function revalidatePackages(): void {
  revalidatePath("/admin/paket");
  revalidatePath("/");
  revalidatePath("/fasilitas");
}

export async function savePackage(formData: FormData): Promise<void> {
  await requireAdminSession();

  const parsed = packageInputSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    priceRupiah: formData.get("priceRupiah"),
    durationHours: formData.get("durationHours"),
    sessionCount: formData.get("sessionCount"),
    setupDaysBefore: formData.get("setupDaysBefore"),
    active: formData.get("active"),
    sortOrder: formData.get("sortOrder"),
  });

  await upsertPackage(parsed);
  revalidatePackages();
  redirect("/admin/paket");
}

export async function togglePackage(formData: FormData): Promise<void> {
  await requireAdminSession();

  const id = String(formData.get("id") ?? "");
  if (id.length === 0) {
    throw new Error("ID paket wajib diisi");
  }

  await setPackageActive(id, formData.get("active") === "true");
  revalidatePackages();
}
