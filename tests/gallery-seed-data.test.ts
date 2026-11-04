import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildGallerySeed } from "@/modules/venue/gallery-seed-data";
import { GALLERY_CATEGORIES } from "@/modules/venue/types";

const publicDir = fileURLToPath(new URL("../public", import.meta.url));

describe("seed data galeri venue", () => {
  it("memuat 17 foto venue dengan id dan urutan unik", () => {
    const items = buildGallerySeed();

    expect(items).toHaveLength(17);

    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(items.length);

    const sortOrders = items.map((item) => item.sortOrder);
    expect(new Set(sortOrders).size).toBe(items.length);
    expect([...sortOrders].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 17 }, (_, index) => index + 1),
    );
  });

  it("memakai kategori kanonik dan hanya item aktif", () => {
    const items = buildGallerySeed();

    for (const item of items) {
      expect(GALLERY_CATEGORIES).toContain(item.category);
      expect(item.title.trim().length).toBeGreaterThan(0);
      expect(item.active).toBe(true);
    }
  });

  it("merujuk berkas gambar yang benar-benar ada di public/galeri", () => {
    const items = buildGallerySeed();

    for (const item of items) {
      expect(item.imagePath.startsWith("/galeri/")).toBe(true);
      expect(existsSync(publicDir + item.imagePath)).toBe(true);
    }
  });

  it("tidak memuat data customer atau demo", () => {
    const serialized = JSON.stringify(buildGallerySeed()).toLowerCase();

    for (const forbidden of ["demo", "customer", "reservasi"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
