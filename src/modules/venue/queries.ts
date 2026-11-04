import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  facility,
  galleryItem,
  packageFacility,
  packageTable,
  venue,
} from "@/lib/db/schema";
import type {
  Facility,
  FacilityWithPackages,
  GalleryCategory,
  GalleryItem,
  Package,
  PackageSummary,
  Venue,
} from "./types";

/**
 * Akses data domain venue (SK-2). Baca publik dan baca admin dipisah jelas;
 * aturan UI tidak tinggal di sini.
 */

function toVenue(row: typeof venue.$inferSelect): Venue {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    capacityMin: row.capacityMin,
    capacityMax: row.capacityMax,
    description: row.description,
    adminWhatsapp: row.adminWhatsapp,
    contact: row.contact,
    email: row.email,
    instagramUrl: row.instagramUrl,
    mapUrl: row.mapUrl,
  };
}

function toPackage(row: typeof packageTable.$inferSelect): Package {
  return {
    id: row.id,
    name: row.name,
    priceRupiah: row.priceRupiah,
    durationHours: row.durationHours,
    sessionCount: row.sessionCount,
    setupDaysBefore: row.setupDaysBefore,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

function toFacility(row: typeof facility.$inferSelect): Facility {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

function toGalleryItem(row: typeof galleryItem.$inferSelect): GalleryItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category as GalleryCategory,
    imagePath: row.imagePath,
    caption: row.caption,
    sortOrder: row.sortOrder,
    active: row.active,
  };
}

export async function getPublicVenue(): Promise<Venue | null> {
  const rows = await db.select().from(venue).limit(1);
  const row = rows[0];
  return row ? toVenue(row) : null;
}

export async function listActivePackages(): Promise<Package[]> {
  const rows = await db
    .select()
    .from(packageTable)
    .where(eq(packageTable.active, true))
    .orderBy(asc(packageTable.sortOrder), asc(packageTable.id));
  return rows.map(toPackage);
}

/**
 * Paket aktif untuk form publik. `setupDaysBefore` sengaja tidak dipilih agar
 * data yang diserialisasi ke komponen klien tidak membocorkan hari setup
 * (T-16, ui-spec penyesuaian 14).
 */
export async function listActivePackageSummaries(): Promise<PackageSummary[]> {
  const rows = await db
    .select({
      id: packageTable.id,
      name: packageTable.name,
      priceRupiah: packageTable.priceRupiah,
      durationHours: packageTable.durationHours,
      sessionCount: packageTable.sessionCount,
    })
    .from(packageTable)
    .where(eq(packageTable.active, true))
    .orderBy(asc(packageTable.sortOrder), asc(packageTable.id));

  return rows;
}

export async function listAllPackages(): Promise<Package[]> {
  const rows = await db
    .select()
    .from(packageTable)
    .orderBy(asc(packageTable.sortOrder), asc(packageTable.id));
  return rows.map(toPackage);
}

async function loadFacilities(
  activeOnly: boolean,
): Promise<FacilityWithPackages[]> {
  const facilityRows = activeOnly
    ? await db
        .select()
        .from(facility)
        .where(eq(facility.active, true))
        .orderBy(asc(facility.sortOrder), asc(facility.id))
    : await db
        .select()
        .from(facility)
        .orderBy(asc(facility.sortOrder), asc(facility.id));

  const links = await db.select().from(packageFacility);
  const packageIdsByFacility = new Map<string, string[]>();
  for (const link of links) {
    const list = packageIdsByFacility.get(link.facilityId) ?? [];
    list.push(link.packageId);
    packageIdsByFacility.set(link.facilityId, list);
  }

  return facilityRows.map((row) => ({
    ...toFacility(row),
    packageIds: packageIdsByFacility.get(row.id) ?? [],
  }));
}

/** Fasilitas aktif beserta relasi paket (halaman publik). */
export async function listFacilitiesWithPackages(): Promise<
  FacilityWithPackages[]
> {
  return loadFacilities(true);
}

/** Semua fasilitas beserta relasi paket (halaman admin). */
export async function listAllFacilitiesWithPackages(): Promise<
  FacilityWithPackages[]
> {
  return loadFacilities(false);
}

export async function listActiveGallery(): Promise<GalleryItem[]> {
  const rows = await db
    .select()
    .from(galleryItem)
    .where(eq(galleryItem.active, true))
    .orderBy(asc(galleryItem.sortOrder), asc(galleryItem.id));
  return rows.map(toGalleryItem);
}

export async function listAllGallery(): Promise<GalleryItem[]> {
  const rows = await db
    .select()
    .from(galleryItem)
    .orderBy(asc(galleryItem.sortOrder), asc(galleryItem.id));
  return rows.map(toGalleryItem);
}
