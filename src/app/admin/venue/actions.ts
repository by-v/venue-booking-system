"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/modules/auth";
import {
  deleteFacility,
  replaceFacilityPackages,
  updateVenueProfile,
  upsertFacility,
} from "@/modules/venue/mutations";
import {
  facilityInputSchema,
  venueProfileSchema,
} from "@/modules/venue/schema";

/**
 * Server Action pengelolaan Venue dan Fasilitas. Setiap aksi memanggil
 * `requireAdminSession()` lebih dulu; validasi memakai skema Zod modul domain.
 */

function revalidatePublic(): void {
  revalidatePath("/admin/venue");
  revalidatePath("/");
  revalidatePath("/tentang");
  revalidatePath("/fasilitas");
  revalidatePath("/kontak");
}

export async function saveVenueProfile(formData: FormData): Promise<void> {
  await requireAdminSession();

  const parsed = venueProfileSchema.parse({
    name: formData.get("name"),
    address: formData.get("address"),
    capacityMin: formData.get("capacityMin"),
    capacityMax: formData.get("capacityMax"),
    description: formData.get("description"),
  });

  await updateVenueProfile(parsed);
  revalidatePublic();
}

export async function saveFacility(formData: FormData): Promise<void> {
  await requireAdminSession();

  const parsed = facilityInputSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
    active: formData.get("active"),
    sortOrder: formData.get("sortOrder"),
  });

  await upsertFacility(parsed);

  const packageIds = formData
    .getAll("packageIds")
    .map((value) => String(value));
  await replaceFacilityPackages(parsed.id, packageIds);

  revalidatePublic();
  redirect("/admin/venue");
}

export async function removeFacility(formData: FormData): Promise<void> {
  await requireAdminSession();

  const id = String(formData.get("id") ?? "");
  if (id.length === 0) {
    throw new Error("ID fasilitas wajib diisi");
  }

  await deleteFacility(id);
  revalidatePublic();
  redirect("/admin/venue");
}
