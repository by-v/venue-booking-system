import { z } from "zod";

import { GALLERY_CATEGORIES } from "./types";

/**
 * Skema input admin (SK-2). Dipakai form dan Server Action sehingga validasi
 * sama di klien dan server. Constraint utama tetap ditegakkan di database.
 */

// Checkbox mengirim "on"/"true", atau boolean saat dipanggil dari kode.
const checkbox = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean(),
);

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullish();

const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullish()
  .refine(
    (value) => value == null || /^https?:\/\//.test(value),
    "URL harus diawali http:// atau https://",
  );

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullish()
  .refine(
    (value) => value == null || z.string().email().safeParse(value).success,
    "Email tidak valid",
  );

// Data identitas venue (halaman "Venue dan Fasilitas").
export const venueProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi"),
    address: z.string().trim().min(1, "Alamat wajib diisi"),
    capacityMin: z.coerce.number().int().min(0, "Kapasitas tidak boleh negatif"),
    capacityMax: z.coerce.number().int().min(0, "Kapasitas tidak boleh negatif"),
    description: z.string().trim().min(1, "Deskripsi wajib diisi"),
  })
  .refine((data) => data.capacityMax >= data.capacityMin, {
    message: "Kapasitas maksimum harus lebih besar atau sama dengan minimum",
    path: ["capacityMax"],
  });

// Kontak & pengaturan venue (halaman "Pengaturan").
export const venueContactSchema = z.object({
  adminWhatsapp: optionalText,
  contact: optionalText,
  email: optionalEmail,
  instagramUrl: optionalUrl,
  mapUrl: optionalUrl,
});

export const packageInputSchema = z.object({
  id: z.string().trim().min(1, "ID paket wajib diisi"),
  name: z.string().trim().min(1, "Nama paket wajib diisi"),
  priceRupiah: z.coerce
    .number()
    .int("Harga harus bilangan bulat rupiah")
    .min(0, "Harga tidak boleh negatif"),
  durationHours: z.coerce.number().int().min(1, "Durasi minimal 1 jam"),
  sessionCount: z.coerce.number().int().min(1, "Jumlah sesi minimal 1"),
  setupDaysBefore: z.coerce.number().int().min(0, "Hari setup tidak boleh negatif"),
  active: checkbox,
  sortOrder: z.coerce.number().int().min(0),
});

export const facilityInputSchema = z.object({
  id: z.string().trim().min(1, "ID fasilitas wajib diisi"),
  name: z.string().trim().min(1, "Nama fasilitas wajib diisi"),
  description: optionalText,
  active: checkbox,
  sortOrder: z.coerce.number().int().min(0),
});

export const galleryItemInputSchema = z.object({
  id: z.string().trim().min(1, "ID item wajib diisi"),
  title: z.string().trim().min(1, "Judul wajib diisi"),
  category: z.enum(GALLERY_CATEGORIES, {
    message: "Kategori harus salah satu jenis acara",
  }),
  imagePath: z.string().trim().min(1, "Lokasi gambar wajib diisi"),
  caption: optionalText,
  sortOrder: z.coerce.number().int().min(0),
  active: checkbox,
});

export const packageFacilityInputSchema = z.object({
  packageId: z.string().trim().min(1),
  facilityId: z.string().trim().min(1),
});

export type VenueProfileInput = z.infer<typeof venueProfileSchema>;
export type VenueContactInput = z.infer<typeof venueContactSchema>;
export type PackageInput = z.infer<typeof packageInputSchema>;
export type FacilityInput = z.infer<typeof facilityInputSchema>;
export type GalleryItemInput = z.infer<typeof galleryItemInputSchema>;
export type PackageFacilityInput = z.infer<typeof packageFacilityInputSchema>;
