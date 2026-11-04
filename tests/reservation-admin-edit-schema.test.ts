import { describe, expect, it } from "vitest";

import {
  paymentDueDateUpdateSchema,
  reservationDataUpdateSchema,
} from "@/modules/reservation/schema";

const baseInput = {
  reservationId: "res-1",
  name: "Siti Aminah",
  whatsapp: "0812-3456-7890",
  address: "Jl. Pelita II No. 1, Pekalongan",
  eventType: "PERNIKAHAN",
  packageId: "full-service",
  eventDate: "2027-03-20",
  notes: "",
};

describe("skema koreksi data reservasi", () => {
  it("menormalisasi WhatsApp dan catatan kosong", () => {
    const parsed = reservationDataUpdateSchema.parse(baseInput);

    expect(parsed.whatsapp).toBe("6281234567890");
    expect(parsed.notes).toBe("");
  });

  it("menolak tanggal tidak valid", () => {
    expect(() =>
      reservationDataUpdateSchema.parse({
        ...baseInput,
        eventDate: "2027-02-30",
      }),
    ).toThrow();
  });
});

describe("skema batas pelunasan manual", () => {
  it("mengubah string kosong menjadi null", () => {
    const parsed = paymentDueDateUpdateSchema.parse({
      reservationId: "res-1",
      paymentDueDate: "",
    });

    expect(parsed.paymentDueDate).toBeNull();
  });

  it("menerima tanggal valid", () => {
    const parsed = paymentDueDateUpdateSchema.parse({
      reservationId: "res-1",
      paymentDueDate: "2027-03-25",
    });

    expect(parsed.paymentDueDate).toBe("2027-03-25");
  });

  it("menolak tanggal tidak valid", () => {
    expect(() =>
      paymentDueDateUpdateSchema.parse({
        reservationId: "res-1",
        paymentDueDate: "2027-02-30",
      }),
    ).toThrow();
  });
});
