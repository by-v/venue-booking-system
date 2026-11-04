import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { setupNote } from "@/lib/db/schema";
import { getReservationDetail } from "@/modules/reservation/queries";

import { seedReservation } from "./helpers/seed-reservation";

describe("query catatan setup", () => {
  it("memuat catatan setup pada detail reservasi admin", async () => {
    const seeded = await seedReservation({
      reservationId: "reservasi-setup-query",
      customerId: "customer-setup-query",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0020",
    });

    await db.insert(setupNote).values({
      id: "setup-note-query",
      reservationId: seeded.reservationId,
      note: "Meja registrasi di lobi utama.",
      updatedByUserId: seeded.actorUserId,
    });

    const detail = await getReservationDetail(seeded.reservationId);
    expect(detail?.setupNote).toMatchObject({
      reservationId: seeded.reservationId,
      note: "Meja registrasi di lobi utama.",
      updatedByUserId: seeded.actorUserId,
    });
    expect(detail?.setupNote?.createdAt).toBeInstanceOf(Date);
    expect(detail?.setupNote?.updatedAt).toBeInstanceOf(Date);
  });

  it("mengembalikan null bila reservasi belum memiliki catatan setup", async () => {
    const seeded = await seedReservation({
      reservationId: "reservasi-setup-kosong",
      customerId: "customer-setup-kosong",
    });

    const detail = await getReservationDetail(seeded.reservationId);
    expect(detail?.setupNote).toBeNull();
  });
});
