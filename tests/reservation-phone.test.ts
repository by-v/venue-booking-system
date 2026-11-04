import { describe, expect, it } from "vitest";

import { normalizeWhatsApp } from "@/modules/reservation/phone";

describe("normalisasi nomor WhatsApp", () => {
  it("mengubah nomor lokal 08 menjadi 62", () => {
    expect(normalizeWhatsApp("0812-3456-7890")).toBe("6281234567890");
  });

  it("menerima format +62 dan 62 tanpa mengubah digit", () => {
    expect(normalizeWhatsApp("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsApp("6281234567890")).toBe("6281234567890");
  });

  it("menambahkan 62 pada nomor yang diawali 8", () => {
    expect(normalizeWhatsApp("812 3456 7890")).toBe("6281234567890");
  });

  it("menolak nomor kosong, terlalu pendek, atau terlalu panjang", () => {
    expect(normalizeWhatsApp("")).toBeNull();
    expect(normalizeWhatsApp("0812")).toBeNull();
    expect(normalizeWhatsApp("08123456789012345")).toBeNull();
  });

  it("menolak nomor yang bukan format Indonesia", () => {
    expect(normalizeWhatsApp("+1 202 555 0100")).toBeNull();
    expect(normalizeWhatsApp("abc")).toBeNull();
  });
});
