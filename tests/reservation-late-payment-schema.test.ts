import { describe, expect, it } from "vitest";

import { latePaymentCancellationSchema } from "@/modules/reservation/schema";

describe("skema pembatalan karena pelunasan terlambat", () => {
  it("menerima alasan dan keputusan DP hangus", () => {
    expect(
      latePaymentCancellationSchema.parse({
        reservationId: "reservasi-1",
        reason: "Pelunasan terlambat",
        dpDecision: "HANGUS",
      }),
    ).toEqual({
      reservationId: "reservasi-1",
      reason: "Pelunasan terlambat",
      dpDecision: "HANGUS",
    });
  });

  it("menerima keputusan DP tidak hangus", () => {
    expect(
      latePaymentCancellationSchema.parse({
        reservationId: "reservasi-1",
        reason: "Pelunasan terlambat",
        dpDecision: "TIDAK_HANGUS",
      }),
    ).toEqual({
      reservationId: "reservasi-1",
      reason: "Pelunasan terlambat",
      dpDecision: "TIDAK_HANGUS",
    });
  });

  it.each([undefined, "", "LAINNYA"])(
    "mewajibkan keputusan DP yang valid: %s",
    (dpDecision) => {
      expect(
        latePaymentCancellationSchema.safeParse({
          reservationId: "reservasi-1",
          reason: "Pelunasan terlambat",
          dpDecision,
        }).success,
      ).toBe(false);
    },
  );

  it("mewajibkan alasan dan id reservasi", () => {
    expect(
      latePaymentCancellationSchema.safeParse({
        reservationId: " ",
        reason: "   ",
        dpDecision: "HANGUS",
      }).success,
    ).toBe(false);
  });
});
