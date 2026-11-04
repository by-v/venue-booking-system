import { describe, expect, it } from "vitest";

import {
  acceptedReservationCancellationSchema,
  reservationConfirmationSchema,
} from "@/modules/reservation/schema";

describe("skema konfirmasi reservasi", () => {
  it("menerima id reservasi yang terisi", () => {
    expect(
      reservationConfirmationSchema.parse({ reservationId: "reservasi-1" }),
    ).toEqual({ reservationId: "reservasi-1" });
  });

  it.each([{}, { reservationId: "" }, { reservationId: "   " }])(
    "menolak id reservasi kosong: %j",
    (input) => {
      expect(reservationConfirmationSchema.safeParse(input).success).toBe(
        false,
      );
    },
  );
});

describe("skema pembatalan reservasi DITERIMA", () => {
  it("menerima pembatalan oleh customer dengan alasan", () => {
    expect(
      acceptedReservationCancellationSchema.parse({
        reservationId: "reservasi-1",
        reason: "Acara dibatalkan oleh keluarga",
        reasonCode: "MUNDUR_CUSTOMER",
      }),
    ).toEqual({
      reservationId: "reservasi-1",
      reason: "Acara dibatalkan oleh keluarga",
      reasonCode: "MUNDUR_CUSTOMER",
    });
  });

  it.each(["DITOLAK_VENUE", "LAINNYA", ""])(
    "menolak kode alasan selain MUNDUR_CUSTOMER: %s",
    (reasonCode) => {
      expect(
        acceptedReservationCancellationSchema.safeParse({
          reservationId: "reservasi-1",
          reason: "Alasan pembatalan",
          reasonCode,
        }).success,
      ).toBe(false);
    },
  );

  it("mewajibkan alasan pembatalan", () => {
    expect(
      acceptedReservationCancellationSchema.safeParse({
        reservationId: "reservasi-1",
        reason: "   ",
        reasonCode: "MUNDUR_CUSTOMER",
      }).success,
    ).toBe(false);
  });

  it("mewajibkan id reservasi", () => {
    expect(
      acceptedReservationCancellationSchema.safeParse({
        reservationId: " ",
        reason: "Alasan pembatalan",
        reasonCode: "MUNDUR_CUSTOMER",
      }).success,
    ).toBe(false);
  });
});
