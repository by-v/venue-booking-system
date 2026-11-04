"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/modules/auth";
import { updateVenueContact } from "@/modules/venue/mutations";
import { venueContactSchema } from "@/modules/venue/schema";

/** Server Action pengaturan kontak venue (nomor WhatsApp admin, kontak). */
export async function saveVenueContact(formData: FormData): Promise<void> {
  await requireAdminSession();

  const parsed = venueContactSchema.parse({
    adminWhatsapp: formData.get("adminWhatsapp"),
    contact: formData.get("contact"),
    email: formData.get("email"),
    instagramUrl: formData.get("instagramUrl"),
    mapUrl: formData.get("mapUrl"),
  });

  await updateVenueContact(parsed);

  revalidatePath("/admin/pengaturan");
  revalidatePath("/");
  revalidatePath("/tentang");
  revalidatePath("/fasilitas");
  revalidatePath("/kontak");
}
