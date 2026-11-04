import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  dateLock,
  payment,
  reservation,
  reservationActivity,
  reservationStatusHistory,
  setupNote,
} from "@/lib/db/schema";
import { saveSetupNote } from "@/modules/reservation/mutations";

import { seedReservation } from "./helpers/seed-reservation";

interface ReservationState {
  status: string;
  eventDate: string;
  bookingNumber: string | null;
  locks: Array<{ date: string; kind: string }>;
  payments: Array<{ amountRupiah: number; verificationStatus: string }>;
  activityCount: number;
  statusHistoryCount: number;
}

async function readState(reservationId: string): Promise<ReservationState> {
  const rows = await db
    .select()
    .from(reservation)
    .where(eq(reservation.id, reservationId));
  const row = rows[0];
  if (!row) {
    throw new Error("Reservasi uji tidak ditemukan");
  }

  const locks = await db
    .select({ date: dateLock.date, kind: dateLock.kind })
    .from(dateLock)
    .where(eq(dateLock.reservationId, reservationId));
  const payments = await db
    .select({
      amountRupiah: payment.amountRupiah,
      verificationStatus: payment.verificationStatus,
    })
    .from(payment)
    .where(eq(payment.reservationId, reservationId));
  const activities = await db
    .select({ id: reservationActivity.id })
    .from(reservationActivity)
    .where(eq(reservationActivity.reservationId, reservationId));
  const statusHistory = await db
    .select({ id: reservationStatusHistory.id })
    .from(reservationStatusHistory)
    .where(eq(reservationStatusHistory.reservationId, reservationId));

  return {
    status: row.status,
    eventDate: row.eventDate,
    bookingNumber: row.bookingNumber,
    locks: locks
      .map((lock) => ({ date: lock.date, kind: lock.kind }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    payments: payments.sort((a, b) => a.amountRupiah - b.amountRupiah),
    activityCount: activities.length,
    statusHistoryCount: statusHistory.length,
  };
}

describe("mutasi catatan setup", () => {
  it("membuat catatan tanpa mengubah data operasional reservasi", async () => {
    const seeded = await seedReservation({
      reservationId: "reservasi-setup-baru",
      customerId: "customer-setup-baru",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
      setupDaysBefore: 2,
      createDateLocks: true,
      payments: [{ amountRupiah: 5_000_000, verificationStatus: "TERVERIFIKASI" }],
    });
    const before = await readState(seeded.reservationId);

    await saveSetupNote({
      reservationId: seeded.reservationId,
      note: "  Meja registrasi di lobi utama.  ",
      actorUserId: seeded.actorUserId,
    });

    const after = await readState(seeded.reservationId);
    expect(after).toEqual(before);

    const notes = await db
      .select()
      .from(setupNote)
      .where(eq(setupNote.reservationId, seeded.reservationId));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      reservationId: seeded.reservationId,
      note: "Meja registrasi di lobi utama.",
      updatedByUserId: seeded.actorUserId,
    });
  });

  it("memperbarui catatan tanpa menambah baris atau aktivitas", async () => {
    const seeded = await seedReservation({
      reservationId: "reservasi-setup-update",
      customerId: "customer-setup-update",
      status: "PENDING",
    });

    await saveSetupNote({
      reservationId: seeded.reservationId,
      note: "Catatan awal.",
      actorUserId: seeded.actorUserId,
    });
    const first = await db
      .select()
      .from(setupNote)
      .where(eq(setupNote.reservationId, seeded.reservationId));

    await saveSetupNote({
      reservationId: seeded.reservationId,
      note: "Catatan baru.",
      actorUserId: seeded.actorUserId,
    });

    const second = await db
      .select()
      .from(setupNote)
      .where(eq(setupNote.reservationId, seeded.reservationId));

    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      id: first[0]?.id,
      note: "Catatan baru.",
      updatedByUserId: seeded.actorUserId,
    });
    expect(second[0]?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      first[0]?.updatedAt.getTime() ?? 0,
    );

    const state = await readState(seeded.reservationId);
    expect(state.status).toBe("PENDING");
    expect(state.activityCount).toBe(0);
    expect(state.statusHistoryCount).toBe(0);
  });

  it("menolak catatan kosong atau lebih dari 1.000 karakter", async () => {
    const seeded = await seedReservation({
      reservationId: "reservasi-setup-invalid",
      customerId: "customer-setup-invalid",
    });

    for (const note of ["   ", "a".repeat(1_001)]) {
      await expect(
        saveSetupNote({
          reservationId: seeded.reservationId,
          note,
          actorUserId: seeded.actorUserId,
        }),
      ).rejects.toMatchObject({ code: "INVALID_SETUP_NOTE" });
    }

    const notes = await db.select().from(setupNote);
    expect(notes).toHaveLength(0);
  });

  it("menolak reservasi yang tidak ada", async () => {
    const seeded = await seedReservation({
      reservationId: "reservasi-setup-ada",
      customerId: "customer-setup-ada",
    });

    await expect(
      saveSetupNote({
        reservationId: "reservasi-tidak-ada",
        note: "Catatan yatim.",
        actorUserId: seeded.actorUserId,
      }),
    ).rejects.toMatchObject({ code: "RESERVATION_NOT_FOUND" });

    expect(await db.select().from(setupNote)).toHaveLength(0);
  });

  it("mengizinkan catatan pada reservasi berstatus akhir", async () => {
    const seeded = await seedReservation({
      reservationId: "reservasi-setup-selesai",
      customerId: "customer-setup-selesai",
      status: "SELESAI",
    });

    await saveSetupNote({
      reservationId: seeded.reservationId,
      note: "Catatan arsip setup.",
      actorUserId: seeded.actorUserId,
    });

    const notes = await db
      .select()
      .from(setupNote)
      .where(eq(setupNote.reservationId, seeded.reservationId));
    expect(notes).toHaveLength(1);
    expect(notes[0]?.note).toBe("Catatan arsip setup.");
  });

  it("menghasilkan satu baris saat dua penyimpanan bersamaan", async () => {
    const seeded = await seedReservation({
      reservationId: "reservasi-setup-bersamaan",
      customerId: "customer-setup-bersamaan",
    });

    await Promise.all([
      saveSetupNote({
        reservationId: seeded.reservationId,
        note: "Catatan pertama.",
        actorUserId: seeded.actorUserId,
      }),
      saveSetupNote({
        reservationId: seeded.reservationId,
        note: "Catatan kedua.",
        actorUserId: seeded.actorUserId,
      }),
    ]);

    const notes = await db
      .select()
      .from(setupNote)
      .where(eq(setupNote.reservationId, seeded.reservationId));
    expect(notes).toHaveLength(1);
    expect(["Catatan pertama.", "Catatan kedua."]).toContain(notes[0]?.note);
  });
});
