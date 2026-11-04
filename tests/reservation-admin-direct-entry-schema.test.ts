import { describe, expect, it } from "vitest";

import { adminReservationInputSchema } from "@/modules/reservation/schema";

function validInput() {
  return {
    name: "Siti Aminah",
    whatsapp: "081234567890",
    address: "Jl. Pelita II No. 1, Pekalongan",
    eventType: "PERNIKAHAN",
    packageId: "full-service",
    eventDate: "2027-03-20",
    notes: "Mohon konfirmasi siang hari.",
    accept: true,
  };
}

describe("skema input reservasi langsung admin", () => {
  it("menerima input lengkap dan menormalkan nomor WhatsApp", () => {
    const parsed = adminReservationInputSchema.parse({
      ...validInput(),
      whatsapp: "0812-3456-7890",
    });

    expect(parsed.whatsapp).toBe("6281234567890");
    expect(parsed.name).toBe("Siti Aminah");
    expect(parsed.eventType).toBe("PERNIKAHAN");
    expect(parsed.packageId).toBe("full-service");
    expect(parsed.eventDate).toBe("2027-03-20");
    expect(parsed.accept).toBe(true);
  });

  it("memberi nilai default accept=false saat tidak dikirim", () => {
    const input = validInput();
    const parsed = adminReservationInputSchema.parse({
      name: input.name,
      whatsapp: input.whatsapp,
      address: input.address,
      eventType: input.eventType,
      packageId: input.packageId,
      eventDate: input.eventDate,
    });

    expect(parsed.accept).toBe(false);
  });

  it.each([
    ["nama terlalu pendek", { name: "A" }],
    ["alamat terlalu pendek", { address: "Jl." }],
    ["paket kosong", { packageId: "   " }],
    ["tanggal salah format", { eventDate: "20-03-2027" }],
    ["tanggal tidak nyata", { eventDate: "2027-02-30" }],
  ])("menolak %s", (_label, patch) => {
    const result = adminReservationInputSchema.safeParse({
      ...validInput(),
      ...patch,
    });

    expect(result.success).toBe(false);
  });

  it("menolak jenis acara di luar daftar", () => {
    const result = adminReservationInputSchema.safeParse({
      ...validInput(),
      eventType: "PESTA",
    });

    expect(result.success).toBe(false);
  });

  it("menolak nomor WhatsApp yang tidak dapat dinormalkan", () => {
    const result = adminReservationInputSchema.safeParse({
      ...validInput(),
      whatsapp: "abcdef",
    });

    expect(result.success).toBe(false);
  });

  it("mengubah catatan kosong menjadi null", () => {
    const parsed = adminReservationInputSchema.parse({
      ...validInput(),
      notes: "   ",
    });

    expect(parsed.notes).toBeNull();
  });

  it("menolak catatan melebihi 1000 karakter", () => {
    const result = adminReservationInputSchema.safeParse({
      ...validInput(),
      notes: "a".repeat(1001),
    });

    expect(result.success).toBe(false);
  });
});
