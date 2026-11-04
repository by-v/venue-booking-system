import { db } from "@/lib/db";
import {
  facility,
  packageFacility,
  packageTable,
  venue,
} from "@/lib/db/schema";
import { describeDatabaseTarget } from "@/modules/auth/describe-database-target";
import { buildVenueSeed, type VenueSeed } from "./seed-data";

/**
 * Penulisan seed venue, terpisah dari I/O prompt agar dapat diuji tanpa
 * terminal (pola `src/modules/auth/run-seed.ts`). Skrip CLI
 * (`scripts/seed-venue.ts`) menyuntikkan prompt nyata.
 *
 * Idempoten lewat `id` stabil: menjalankan ulang tidak menggandakan venue,
 * paket, atau fasilitas.
 */

export async function applyVenueSeed(seed: VenueSeed): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(venue)
      .values(seed.venue)
      .onConflictDoUpdate({
        target: venue.id,
        set: {
          name: seed.venue.name,
          address: seed.venue.address,
          capacityMin: seed.venue.capacityMin,
          capacityMax: seed.venue.capacityMax,
          description: seed.venue.description,
          adminWhatsapp: seed.venue.adminWhatsapp,
          contact: seed.venue.contact,
          email: seed.venue.email,
          instagramUrl: seed.venue.instagramUrl,
          mapUrl: seed.venue.mapUrl,
          updatedAt: new Date(),
        },
      });

    for (const pkg of seed.packages) {
      await tx
        .insert(packageTable)
        .values(pkg)
        .onConflictDoUpdate({
          target: packageTable.id,
          set: {
            name: pkg.name,
            priceRupiah: pkg.priceRupiah,
            durationHours: pkg.durationHours,
            sessionCount: pkg.sessionCount,
            setupDaysBefore: pkg.setupDaysBefore,
            active: pkg.active,
            sortOrder: pkg.sortOrder,
            updatedAt: new Date(),
          },
        });
    }

    for (const item of seed.facilities) {
      await tx
        .insert(facility)
        .values(item)
        .onConflictDoUpdate({
          target: facility.id,
          set: {
            name: item.name,
            description: item.description,
            active: item.active,
            sortOrder: item.sortOrder,
          },
        });
    }

    for (const link of seed.packageFacilities) {
      await tx.insert(packageFacility).values(link).onConflictDoNothing();
    }
  });
}

export interface RunVenueSeedOptions {
  databaseUrl: string | undefined;
  confirm(message: string): Promise<boolean>;
  log?: (message: string) => void;
}

export interface VenueSeedResult {
  status: "seeded" | "cancelled";
}

export async function runVenueSeed({
  databaseUrl,
  confirm,
  log = console.log,
}: RunVenueSeedOptions): Promise<VenueSeedResult> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tidak diset");
  }

  log(`Target database: ${describeDatabaseTarget(databaseUrl)}`);

  const proceed = await confirm("Lanjutkan menulis data venue?");
  if (!proceed) {
    log("Dibatalkan. Tidak ada data yang ditulis.");
    return { status: "cancelled" };
  }

  await applyVenueSeed(buildVenueSeed());

  log("Data venue berhasil ditulis.");
  return { status: "seeded" };
}
