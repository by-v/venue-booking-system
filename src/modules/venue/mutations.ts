import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  facility,
  galleryItem,
  packageFacility,
  packageTable,
  venue,
} from "@/lib/db/schema";
import type {
  FacilityInput,
  GalleryItemInput,
  PackageInput,
  VenueContactInput,
  VenueProfileInput,
} from "./schema";

/**
 * Mutasi domain venue (SK-1/SK-2). Berkas ini TIDAK memanggil
 * `requireAdminSession`; proteksi sesi dilakukan di lapisan Server Action
 * pada halaman admin.
 *
 * Data bisnis tidak dihapus: paket dan item galeri memakai status aktif.
 * Fasilitas boleh dihapus, tetapi foreign key `restrict` menolak penghapusan
 * selama masih direferensikan paket.
 */

export async function updateVenueProfile(
  input: VenueProfileInput,
): Promise<void> {
  await db
    .insert(venue)
    .values({
      id: 1,
      name: input.name,
      address: input.address,
      capacityMin: input.capacityMin,
      capacityMax: input.capacityMax,
      description: input.description,
    })
    .onConflictDoUpdate({
      target: venue.id,
      set: {
        name: input.name,
        address: input.address,
        capacityMin: input.capacityMin,
        capacityMax: input.capacityMax,
        description: input.description,
        updatedAt: new Date(),
      },
    });
}

export async function updateVenueContact(
  input: VenueContactInput,
): Promise<void> {
  const updated = await db
    .update(venue)
    .set({
      adminWhatsapp: input.adminWhatsapp ?? null,
      contact: input.contact ?? null,
      email: input.email ?? null,
      instagramUrl: input.instagramUrl ?? null,
      mapUrl: input.mapUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(venue.id, 1))
    .returning({ id: venue.id });

  if (updated.length === 0) {
    throw new Error("Data venue belum diisi");
  }
}

export async function upsertPackage(input: PackageInput): Promise<void> {
  await db
    .insert(packageTable)
    .values({
      id: input.id,
      name: input.name,
      priceRupiah: input.priceRupiah,
      durationHours: input.durationHours,
      sessionCount: input.sessionCount,
      setupDaysBefore: input.setupDaysBefore,
      active: input.active,
      sortOrder: input.sortOrder,
    })
    .onConflictDoUpdate({
      target: packageTable.id,
      set: {
        name: input.name,
        priceRupiah: input.priceRupiah,
        durationHours: input.durationHours,
        sessionCount: input.sessionCount,
        setupDaysBefore: input.setupDaysBefore,
        active: input.active,
        sortOrder: input.sortOrder,
        updatedAt: new Date(),
      },
    });
}

export async function setPackageActive(
  id: string,
  active: boolean,
): Promise<void> {
  await db
    .update(packageTable)
    .set({ active, updatedAt: new Date() })
    .where(eq(packageTable.id, id));
}

export async function upsertFacility(input: FacilityInput): Promise<void> {
  await db
    .insert(facility)
    .values({
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      active: input.active,
      sortOrder: input.sortOrder,
    })
    .onConflictDoUpdate({
      target: facility.id,
      set: {
        name: input.name,
        description: input.description ?? null,
        active: input.active,
        sortOrder: input.sortOrder,
      },
    });
}

export async function deleteFacility(id: string): Promise<void> {
  await db.delete(facility).where(eq(facility.id, id));
}

/** Ganti seluruh relasi fasilitas-ke-paket dalam satu transaksi. */
export async function replaceFacilityPackages(
  facilityId: string,
  packageIds: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(packageFacility)
      .where(eq(packageFacility.facilityId, facilityId));

    if (packageIds.length > 0) {
      await tx
        .insert(packageFacility)
        .values(packageIds.map((packageId) => ({ packageId, facilityId })));
    }
  });
}

/** Ganti seluruh relasi paket-ke-fasilitas dalam satu transaksi. */
export async function replacePackageFacilities(
  packageId: string,
  facilityIds: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(packageFacility)
      .where(eq(packageFacility.packageId, packageId));

    if (facilityIds.length > 0) {
      await tx
        .insert(packageFacility)
        .values(facilityIds.map((facilityId) => ({ packageId, facilityId })));
    }
  });
}

export async function upsertGalleryItem(
  input: GalleryItemInput,
): Promise<void> {
  await db
    .insert(galleryItem)
    .values({
      id: input.id,
      title: input.title,
      category: input.category,
      imagePath: input.imagePath,
      caption: input.caption ?? null,
      sortOrder: input.sortOrder,
      active: input.active,
    })
    .onConflictDoUpdate({
      target: galleryItem.id,
      set: {
        title: input.title,
        category: input.category,
        imagePath: input.imagePath,
        caption: input.caption ?? null,
        sortOrder: input.sortOrder,
        active: input.active,
        updatedAt: new Date(),
      },
    });
}

export async function setGalleryItemActive(
  id: string,
  active: boolean,
): Promise<void> {
  await db
    .update(galleryItem)
    .set({ active, updatedAt: new Date() })
    .where(eq(galleryItem.id, id));
}
