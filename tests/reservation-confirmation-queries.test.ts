import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { dateLock, payment, reservation } from "@/lib/db/schema";
import { lockDatesForEvent } from "@/modules/availability/dates";
import { getReservationConfirmationContext } from "@/modules/reservation/queries";

import { seedReservation } from "./helpers/seed-reservation";

type PaymentStatus = "TERVERIFIKASI";

async function addPayment(
  reservationId: string,
  amountRupiah: number,
  verificationStatus: PaymentStatus,
): Promise<void> {
  await db.insert(payment).values({
    id: `pembayaran-${reservationId}-${verificationStatus}-${amountRupiah}`,
    reservationId,
    amountRupiah,
    verificationStatus,
  });
}

async function statusOf(reservationId: string): Promise<string | undefined> {
  const rows = await db
    .select({ status: reservation.status })
    .from(reservation)
    .where(eq(reservation.id, reservationId));
  return rows[0]?.status;
}

describe("konteks konfirmasi reservasi", () => {
  it("menampilkan reservasi tanggal sama yang memiliki pembayaran", async () => {
    await seedReservation({
      reservationId: "target",
      customerId: "customer-target",
      customerWhatsapp: "6281111111111",
      eventDate: "2027-05-10",
    });
    await seedReservation({
      reservationId: "other",
      customerId: "customer-other",
      customerName: "Budi Santoso",
      customerWhatsapp: "6282222222222",
      eventDate: "2027-05-10",
    });
    await addPayment("other", 6_000_000, "TERVERIFIKASI");

    const context = await getReservationConfirmationContext("target");

    expect(context?.lockDates).toEqual([
      { date: "2027-05-10", kind: "EVENT" },
    ]);
    expect(context?.hasDateConflict).toBe(false);
    expect(context?.conflicts).toHaveLength(1);
    expect(context?.conflicts[0]).toMatchObject({
      id: "other",
      customerName: "Budi Santoso",
      customerWhatsapp: "6282222222222",
      eventDate: "2027-05-10",
      status: "PENDING",
      verifiedPaymentRupiah: 6_000_000,
      occupiedDates: [],
    });
  });

  it("tidak menampilkan reservasi tanggal sama tanpa pembayaran", async () => {
    await seedReservation({
      reservationId: "target",
      customerId: "customer-target",
      eventDate: "2027-05-11",
    });
    await seedReservation({
      reservationId: "other",
      customerId: "customer-other",
      customerWhatsapp: "6282222222222",
      eventDate: "2027-05-11",
    });

    const context = await getReservationConfirmationContext("target");

    expect(context?.hasDateConflict).toBe(false);
    expect(context?.conflicts).toEqual([]);
  });

  it("menampilkan kunci setup milik reservasi lain sebagai konflik", async () => {
    await seedReservation({
      reservationId: "target",
      customerId: "customer-target",
      eventDate: "2027-06-15",
      setupDaysBefore: 2,
    });
    await seedReservation({
      reservationId: "other",
      customerId: "customer-other",
      customerName: "Rina Wati",
      customerWhatsapp: "6283333333333",
      eventDate: "2027-06-20",
    });
    await db.insert(dateLock).values({
      date: "2027-06-13",
      kind: "SETUP",
      reservationId: "other",
    });

    const context = await getReservationConfirmationContext("target");

    expect(context?.lockDates).toEqual([
      { date: "2027-06-13", kind: "SETUP" },
      { date: "2027-06-14", kind: "SETUP" },
      { date: "2027-06-15", kind: "EVENT" },
    ]);
    expect(context?.hasDateConflict).toBe(true);
    expect(context?.conflicts).toHaveLength(1);
    expect(context?.conflicts[0]).toMatchObject({
      id: "other",
      customerName: "Rina Wati",
      eventDate: "2027-06-20",
      status: "PENDING",
      verifiedPaymentRupiah: 0,
      occupiedDates: [{ date: "2027-06-13", kind: "SETUP" }],
    });
  });

  it("kunci manual tanpa reservation_id membuat hasDateConflict benar tanpa baris konflik", async () => {
    await seedReservation({
      reservationId: "target",
      customerId: "customer-target",
      eventDate: "2027-07-01",
    });
    await db.insert(dateLock).values({
      date: "2027-07-01",
      kind: "EVENT",
      reservationId: null,
    });

    const context = await getReservationConfirmationContext("target");

    expect(context?.hasDateConflict).toBe(true);
    expect(context?.conflicts).toEqual([]);
  });

  it("tidak menampilkan reservasi berstatus final walau memiliki pembayaran", async () => {
    await seedReservation({
      reservationId: "target",
      customerId: "customer-target",
      eventDate: "2027-07-05",
    });
    await seedReservation({
      reservationId: "other",
      customerId: "customer-other",
      customerWhatsapp: "6284444444444",
      eventDate: "2027-07-05",
      status: "DIBATALKAN",
    });
    await addPayment("other", 5_000_000, "TERVERIFIKASI");

    const context = await getReservationConfirmationContext("target");

    expect(context?.hasDateConflict).toBe(false);
    expect(context?.conflicts).toEqual([]);
  });

  it("menghitung tanggal target dan hasDateConflict dengan benar", async () => {
    await seedReservation({
      reservationId: "target",
      customerId: "customer-target",
      eventDate: "2027-07-10",
      setupDaysBefore: 1,
    });

    const context = await getReservationConfirmationContext("target");

    expect(context?.lockDates).toEqual(
      lockDatesForEvent({ eventDate: "2027-07-10", setupDaysBefore: 1 }),
    );
    expect(context?.hasDateConflict).toBe(false);
    expect(context?.conflicts).toEqual([]);
  });

  it("tidak mengubah status reservasi lain", async () => {
    await seedReservation({
      reservationId: "target",
      customerId: "customer-target",
      eventDate: "2027-08-01",
    });
    await seedReservation({
      reservationId: "other",
      customerId: "customer-other",
      customerWhatsapp: "6285555555555",
      eventDate: "2027-08-01",
      status: "DITANGGUHKAN",
    });
    await addPayment("other", 3_000_000, "TERVERIFIKASI");

    const context = await getReservationConfirmationContext("target");
    expect(context?.conflicts.map((row) => row.id)).toEqual(["other"]);

    await expect(statusOf("target")).resolves.toBe("PENDING");
    await expect(statusOf("other")).resolves.toBe("DITANGGUHKAN");
  });
});
