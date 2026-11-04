/**
 * Tipe domain venue. Modul ini tidak mengimpor dari `src/app` (NFR-MNT-01).
 */

export const GALLERY_CATEGORIES = [
  "PERNIKAHAN",
  "WALIMAH_RESEPSI",
  "SEMINAR",
  "KONSER",
  "ACARA_MALAM",
  "ACARA_OUTDOOR",
  "LAINNYA",
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export const GALLERY_CATEGORY_LABELS: Record<GalleryCategory, string> = {
  PERNIKAHAN: "Pernikahan",
  WALIMAH_RESEPSI: "Walimah & Resepsi",
  SEMINAR: "Seminar",
  KONSER: "Konser",
  ACARA_MALAM: "Acara Malam",
  ACARA_OUTDOOR: "Acara Outdoor",
  LAINNYA: "Lainnya",
};

export interface Venue {
  id: number;
  name: string;
  address: string;
  capacityMin: number;
  capacityMax: number;
  description: string;
  adminWhatsapp: string | null;
  contact: string | null;
  email: string | null;
  instagramUrl: string | null;
  mapUrl: string | null;
}

export interface Package {
  id: string;
  name: string;
  priceRupiah: number;
  durationHours: number;
  sessionCount: number;
  setupDaysBefore: number;
  active: boolean;
  sortOrder: number;
}

/** Data paket yang aman dikirim ke form publik (tanpa setup days, T-16). */
export interface PackageSummary {
  id: string;
  name: string;
  priceRupiah: number;
  durationHours: number;
  sessionCount: number;
}

export interface Facility {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
}

export interface FacilityWithPackages extends Facility {
  packageIds: string[];
}

export interface GalleryItem {
  id: string;
  title: string;
  category: GalleryCategory;
  imagePath: string;
  caption: string | null;
  sortOrder: number;
  active: boolean;
}
