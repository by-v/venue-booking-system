import { db } from "@/lib/db";
import { galleryItem } from "@/lib/db/schema";
import { describeDatabaseTarget } from "@/modules/auth/describe-database-target";

import { buildGallerySeed, type GallerySeedItem } from "./gallery-seed-data";

/**
 * Penulisan seed galeri, terpisah dari I/O prompt agar dapat diuji tanpa
 * terminal (pola `run-seed.ts`). Idempoten lewat `id` stabil: menjalankan
 * ulang tidak menggandakan item.
 */
export async function applyGallerySeed(
  items: GallerySeedItem[] = buildGallerySeed(),
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .insert(galleryItem)
        .values(item)
        .onConflictDoUpdate({
          target: galleryItem.id,
          set: {
            title: item.title,
            category: item.category,
            imagePath: item.imagePath,
            caption: item.caption,
            sortOrder: item.sortOrder,
            active: item.active,
            updatedAt: new Date(),
          },
        });
    }
  });
}

export interface RunGallerySeedOptions {
  databaseUrl: string | undefined;
  confirm(message: string): Promise<boolean>;
  log?: (message: string) => void;
}

export interface GallerySeedResult {
  status: "seeded" | "cancelled";
  count?: number;
}

export async function runGallerySeed({
  databaseUrl,
  confirm,
  log = console.log,
}: RunGallerySeedOptions): Promise<GallerySeedResult> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tidak diset");
  }

  log(`Target database: ${describeDatabaseTarget(databaseUrl)}`);

  const proceed = await confirm("Lanjutkan menulis data galeri?");
  if (!proceed) {
    log("Dibatalkan. Tidak ada data yang ditulis.");
    return { status: "cancelled" };
  }

  const items = buildGallerySeed();
  await applyGallerySeed(items);

  log(`${items.length} item galeri berhasil ditulis.`);
  return { status: "seeded", count: items.length };
}
