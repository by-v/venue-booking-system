"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/modules/auth";
import {
  setGalleryItemActive,
  upsertGalleryItem,
} from "@/modules/venue/mutations";
import { galleryItemInputSchema } from "@/modules/venue/schema";

/**
 * Server Action pengelolaan metadata galeri. Tidak ada unggah berkas; gambar
 * diisi sebagai path `public/` atau URL (TDR D7).
 */

function revalidateGallery(): void {
  revalidatePath("/admin/galeri");
  revalidatePath("/galeri");
}

export async function saveGalleryItem(formData: FormData): Promise<void> {
  await requireAdminSession();

  const parsed = galleryItemInputSchema.parse({
    id: formData.get("id"),
    title: formData.get("title"),
    category: formData.get("category"),
    imagePath: formData.get("imagePath"),
    caption: formData.get("caption"),
    sortOrder: formData.get("sortOrder"),
    active: formData.get("active"),
  });

  await upsertGalleryItem(parsed);
  revalidateGallery();
  redirect("/admin/galeri");
}

export async function toggleGalleryItem(formData: FormData): Promise<void> {
  await requireAdminSession();

  const id = String(formData.get("id") ?? "");
  if (id.length === 0) {
    throw new Error("ID item galeri wajib diisi");
  }

  await setGalleryItemActive(id, formData.get("active") === "true");
  revalidateGallery();
}
