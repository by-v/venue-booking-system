import { describe, expect, it } from "vitest";

import {
  latePaymentCancellationSchema,
  paymentActionSchema,
  reservationCancellationSchema,
  reservationItemInputSchema,
  reservationSuspensionSchema,
} from "@/modules/reservation/schema";

describe("skema input item biaya", () => {
  it("menerima deskripsi dan nominal bulat positif", () => {
    const parsed = reservationItemInputSchema.parse({
      reservationId: "reservasi-1",
      description: "Sewa tenda tambahan",
      amountRupiah: "1500000",
    });

    expect(parsed).toEqual({
      reservationId: "reservasi-1",
      description: "Sewa tenda tambahan",
      amountRupiah: 1_500_000,
    });
  });

  it("menolak deskripsi kosong", () => {
    const result = reservationItemInputSchema.safeParse({
      reservationId: "reservasi-1",
      description: "   ",
      amountRupiah: "1500000",
    });

    expect(result.success).toBe(false);
  });

  it.each(["0", "-1", "1.5", "abc", "2147483648"])(
    "menolak nominal item %s",
    (amountRupiah) => {
      const result = reservationItemInputSchema.safeParse({
        reservationId: "reservasi-1",
        description: "Biaya tambahan",
        amountRupiah,
      });

      expect(result.success).toBe(false);
    },
  );
});

describe("skema aksi pembayaran", () => {
  it("menerima id reservasi yang terisi", () => {
    expect(
      paymentActionSchema.parse({ reservationId: "reservasi-1" }),
    ).toEqual({ reservationId: "reservasi-1" });
  });

  it("menolak id reservasi kosong", () => {
    expect(
      paymentActionSchema.safeParse({ reservationId: "   " }).success,
    ).toBe(false);
  });
});

describe("skema pembatalan karena pelunasan terlambat", () => {
  it("menerima alasan bebas dan keputusan DP", () => {
    const parsed = latePaymentCancellationSchema.parse({
      reservationId: "reservasi-1",
      reason: "Belum melunasi sampai batas",
      dpDecision: "HANGUS",
    });

    expect(parsed.reason).toBe("Belum melunasi sampai batas");
    expect(parsed.dpDecision).toBe("HANGUS");
  });

  it("menolak alasan kosong", () => {
    const result = latePaymentCancellationSchema.safeParse({
      reservationId: "reservasi-1",
      reason: "   ",
      dpDecision: "TIDAK_HANGUS",
    });

    expect(result.success).toBe(false);
  });

  it("menolak keputusan DP di luar pilihan", () => {
    const result = latePaymentCancellationSchema.safeParse({
      reservationId: "reservasi-1",
      reason: "Alasan",
      dpDecision: "LAINNYA",
    });

    expect(result.success).toBe(false);
  });
});

describe("skema penangguhan dan pembatalan reservasi", () => {
  it("mewajibkan alasan penangguhan", () => {
    expect(
      reservationSuspensionSchema.safeParse({
        reservationId: "reservasi-1",
        reason: "",
      }).success,
    ).toBe(false);

    expect(
      reservationSuspensionSchema.parse({
        reservationId: "reservasi-1",
        reason: "Menunggu kelengkapan berkas",
      }).reason,
    ).toBe("Menunggu kelengkapan berkas");
  });

  it("menerima hanya kode alasan pembatalan yang sah", () => {
    for (const reasonCode of ["MUNDUR_CUSTOMER", "DITOLAK_VENUE"]) {
      expect(
        reservationCancellationSchema.parse({
          reservationId: "reservasi-1",
          reason: "Alasan pembatalan",
          reasonCode,
        }).reasonCode,
      ).toBe(reasonCode);
    }

    expect(
      reservationCancellationSchema.safeParse({
        reservationId: "reservasi-1",
        reason: "Alasan pembatalan",
        reasonCode: "LAINNYA",
      }).success,
    ).toBe(false);
  });

  it("mewajibkan alasan dan kode alasan pembatalan", () => {
    expect(
      reservationCancellationSchema.safeParse({
        reservationId: "reservasi-1",
        reason: "   ",
        reasonCode: "MUNDUR_CUSTOMER",
      }).success,
    ).toBe(false);

    expect(
      reservationCancellationSchema.safeParse({
        reservationId: "reservasi-1",
        reason: "Alasan pembatalan",
      }).success,
    ).toBe(false);
  });
});
