import { describe, expect, it } from "vitest";

import {
  buildReservationWhatsAppMessage,
  buildWhatsAppLink,
  WHATSAPP_MESSAGE_TEMPLATE,
} from "@/modules/venue/whatsapp";

describe("tautan WhatsApp", () => {
  it("memakai nomor dan pesan templat ter-encode pada wa.me", () => {
    const link = buildWhatsAppLink("6281234567890");

    expect(link).toBe(
      `https://wa.me/6281234567890?text=${encodeURIComponent(
        WHATSAPP_MESSAGE_TEMPLATE,
      )}`,
    );
  });

  it("meng-encode pesan yang diberikan", () => {
    const link = buildWhatsAppLink("6281234567890", "Halo, mau tanya harga & jadwal?");

    expect(link).toBe(
      `https://wa.me/6281234567890?text=${encodeURIComponent(
        "Halo, mau tanya harga & jadwal?",
      )}`,
    );
  });

  it("menormalisasi nomor lokal 08... ke 62...", () => {
    expect(buildWhatsAppLink("0812-3456-7890")).toBe(
      `https://wa.me/6281234567890?text=${encodeURIComponent(
        WHATSAPP_MESSAGE_TEMPLATE,
      )}`,
    );
  });

  it("tidak membuka tautan saat nomor kosong atau tidak ada", () => {
    expect(buildWhatsAppLink("")).toBeNull();
    expect(buildWhatsAppLink(null)).toBeNull();
    expect(buildWhatsAppLink(undefined)).toBeNull();
    expect(buildWhatsAppLink("   ")).toBeNull();
  });

  it("menyusun pesan reservasi per baris sesuai kolom formulir", () => {
    const message = buildReservationWhatsAppMessage({
      name: "Siti Aminah",
      whatsapp: "0812-3456-7890",
      address: "Jl. Pelita II No. 1, Pekalongan",
      eventType: "PERNIKAHAN",
      packageName: "Full Service",
      eventDate: "2026-10-25",
      notes: "Resepsi keluarga",
    });

    expect(message.split("\n")).toEqual([
      "Halo Admin H.A. Djunaid Convention Center,",
      "",
      "Saya ingin mengajukan reservasi dengan data berikut:",
      "Nama lengkap: Siti Aminah",
      "Nomor WhatsApp: 0812-3456-7890",
      "Alamat: Jl. Pelita II No. 1, Pekalongan",
      "Jenis acara: Pernikahan",
      "Paket: Full Service",
      "Tanggal acara: 25 Oktober 2026",
      "Catatan: Resepsi keluarga",
      "",
      "Mohon dibantu untuk proses selanjutnya. Terima kasih.",
    ]);
  });

  it("memakai tanda '-' pada pesan reservasi saat catatan kosong", () => {
    const message = buildReservationWhatsAppMessage({
      name: "Siti Aminah",
      whatsapp: "0812-3456-7890",
      address: "Jl. Pelita II No. 1, Pekalongan",
      eventType: "SEMINAR",
      packageName: "Full Service",
      eventDate: "2026-10-25",
      notes: null,
    });

    expect(message).toContain("Catatan: -");
    expect(message).toContain("Jenis acara: Seminar");
  });
});
