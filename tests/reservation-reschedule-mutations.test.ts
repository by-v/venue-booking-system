import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  dateLock,
  reservation,
  reservationActivity,
  reservationStatusHistory,
  rescheduleHistory,
} from "@/lib/db/schema";
import { addDays, todayInJakarta } from "@/modules/availability/dates";
import { rescheduleReservation } from "@/modules/reservation/mutations";
import { rescheduleDeadline } from "@/modules/reservation/reschedule";

import { seedReservation } from "./helpers/seed-reservation";

interface ReservationState {
  status: string;
  eventDate: string;
  bookingNumber: string | null;
  rescheduleCount: number;
  locks: Array<{ date: string; kind: string }>;
  rescheduleHistoryCount: number;
  statusHistoryCount: number;
  activityCount: number;
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
    .select({
      date: dateLock.date,
      kind: dateLock.kind,
    })
    .from(dateLock)
    .where(eq(dateLock.reservationId, reservationId));
  const reschedules = await db
    .select({ id: rescheduleHistory.id })
    .from(rescheduleHistory)
    .where(eq(rescheduleHistory.reservationId, reservationId));
  const statuses = await db
    .select({ id: reservationStatusHistory.id })
    .from(reservationStatusHistory)
    .where(eq(reservationStatusHistory.reservationId, reservationId));
  const activities = await db
    .select({ id: reservationActivity.id })
    .from(reservationActivity)
    .where(eq(reservationActivity.reservationId, reservationId));

  return {
    status: row.status,
    eventDate: row.eventDate,
    bookingNumber: row.bookingNumber,
    rescheduleCount: row.rescheduleCount,
    locks: locks
      .map((lock) => ({ date: lock.date, kind: lock.kind }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    rescheduleHistoryCount: reschedules.length,
    statusHistoryCount: statuses.length,
    activityCount: activities.length,
  };
}

async function expectUnchanged({
  reservationId,
  newEventDate,
  actorUserId,
  code,
}: {
  reservationId: string;
  newEventDate: string;
  actorUserId: string;
  code: string;
}): Promise<void> {
  const before = await readState(reservationId);

  await expect(
    rescheduleReservation({ reservationId, newEventDate, actorUserId }),
  ).rejects.toMatchObject({ code });

  expect(await readState(reservationId)).toEqual(before);
}

describe("mutasi reschedule", () => {
  it("memindahkan kunci tanggal dan menyimpan riwayat", async () => {
    const today = todayInJakarta();
    const oldDate = addDays(today, 90);
    const newDate = addDays(today, 120);
    const seeded = await seedReservation({
      reservationId: "reservasi-reschedule-berhasil",
      customerId: "customer-reschedule-berhasil",
      customerWhatsapp: "6281234500001",
      eventDate: oldDate,
      setupDaysBefore: 1,
      packageId: "paket-reschedule-berhasil",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
      createDateLocks: true,
    });

    await rescheduleReservation({
      reservationId: seeded.reservationId,
      newEventDate: newDate,
      actorUserId: seeded.actorUserId,
    });

    const state = await readState(seeded.reservationId);
    expect(state).toMatchObject({
      status: "DITERIMA",
      eventDate: newDate,
      bookingNumber: "HADCC-2026-0001",
      rescheduleCount: 1,
      rescheduleHistoryCount: 1,
      statusHistoryCount: 1,
      activityCount: 1,
    });
    expect(state.locks).toEqual([
      { date: addDays(newDate, -1), kind: "SETUP" },
      { date: newDate, kind: "EVENT" },
    ]);

    const histories = await db
      .select()
      .from(rescheduleHistory)
      .where(eq(rescheduleHistory.reservationId, seeded.reservationId));
    expect(histories[0]).toMatchObject({
      oldEventDate: oldDate,
      newEventDate: newDate,
      actorUserId: seeded.actorUserId,
    });
    expect(histories[0]?.createdAt).toBeInstanceOf(Date);

    const statuses = await db
      .select()
      .from(reservationStatusHistory)
      .where(
        eq(reservationStatusHistory.reservationId, seeded.reservationId),
      );
    expect(statuses[0]).toMatchObject({
      fromStatus: "DITERIMA",
      toStatus: "DITERIMA",
      actorType: "ADMIN",
      actorUserId: seeded.actorUserId,
    });

    const activities = await db
      .select()
      .from(reservationActivity)
      .where(eq(reservationActivity.reservationId, seeded.reservationId));
    expect(activities[0]).toMatchObject({
      type: "STATUS_CHANGE",
      actorType: "ADMIN",
      isSubstantive: true,
    });
    expect(activities[0]?.note).toContain("Reschedule");
  });

  it("menolak status selain DITERIMA tanpa mengubah data", async () => {
    const today = todayInJakarta();
    const newDate = addDays(today, 120);
    const statuses = [
      "PENDING",
      "DITANGGUHKAN",
      "DIBATALKAN",
      "AUTO_CANCELLED",
      "SELESAI",
    ] as const;

    for (const [index, status] of statuses.entries()) {
      const seeded = await seedReservation({
        reservationId: `reservasi-status-${index}`,
        customerId: `customer-status-${index}`,
        customerWhatsapp: `62812345001${index}0`,
        eventDate: addDays(today, 90),
        status,
      });

      await expectUnchanged({
        reservationId: seeded.reservationId,
        newEventDate: newDate,
        actorUserId: seeded.actorUserId,
        code: "INVALID_STATE",
      });
    }
  });

  it("menolak saat jatah reschedule sudah habis", async () => {
    const today = todayInJakarta();
    const seeded = await seedReservation({
      reservationId: "reservasi-jatah-habis",
      customerId: "customer-jatah-habis",
      customerWhatsapp: "6281234500020",
      eventDate: addDays(today, 90),
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
      rescheduleCount: 1,
      createDateLocks: true,
    });

    await expectUnchanged({
      reservationId: seeded.reservationId,
      newEventDate: addDays(today, 120),
      actorUserId: seeded.actorUserId,
      code: "RESCHEDULE_LIMIT_REACHED",
    });
  });

  it("menolak permintaan setelah batas satu bulan kalender", async () => {
    const today = todayInJakarta();
    const oldDate = addDays(today, 10);
    expect(rescheduleDeadline(oldDate) < today).toBe(true);

    const seeded = await seedReservation({
      reservationId: "reservasi-batas-lewat",
      customerId: "customer-batas-lewat",
      customerWhatsapp: "6281234500021",
      eventDate: oldDate,
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
      createDateLocks: true,
    });

    await expectUnchanged({
      reservationId: seeded.reservationId,
      newEventDate: addDays(today, 120),
      actorUserId: seeded.actorUserId,
      code: "RESCHEDULE_DEADLINE_PASSED",
    });
  });

  it("menolak tanggal baru yang lewat, hari ini, atau sama", async () => {
    const today = todayInJakarta();
    const oldDate = addDays(today, 90);
    const seeded = await seedReservation({
      reservationId: "reservasi-tanggal-invalid",
      customerId: "customer-tanggal-invalid",
      customerWhatsapp: "6281234500022",
      eventDate: oldDate,
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
      createDateLocks: true,
    });

    for (const newEventDate of [addDays(today, -1), today, oldDate]) {
      await expectUnchanged({
        reservationId: seeded.reservationId,
        newEventDate,
        actorUserId: seeded.actorUserId,
        code: "DATE_NOT_BOOKABLE",
      });
    }
  });

  it("menolak tanggal acara baru yang sudah terkunci", async () => {
    const today = todayInJakarta();
    const oldDate = addDays(today, 90);
    const newDate = addDays(today, 120);
    const first = await seedReservation({
      reservationId: "reservasi-konflik-acara",
      customerId: "customer-konflik-acara",
      customerWhatsapp: "6281234500023",
      eventDate: oldDate,
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
      packageId: "paket-konflik-acara-1",
      createDateLocks: true,
    });
    await seedReservation({
      reservationId: "reservasi-pemilik-tanggal",
      customerId: "customer-pemilik-tanggal",
      customerWhatsapp: "6281234500024",
      eventDate: newDate,
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0002",
      packageId: "paket-konflik-acara-2",
      createDateLocks: true,
    });

    await expectUnchanged({
      reservationId: first.reservationId,
      newEventDate: newDate,
      actorUserId: first.actorUserId,
      code: "DATE_CONFLICT",
    });
  });

  it("menolak tanggal setup baru yang sudah terkunci", async () => {
    const today = todayInJakarta();
    const oldDate = addDays(today, 90);
    const newDate = addDays(today, 120);
    const first = await seedReservation({
      reservationId: "reservasi-konflik-setup",
      customerId: "customer-konflik-setup",
      customerWhatsapp: "6281234500025",
      eventDate: oldDate,
      setupDaysBefore: 1,
      packageId: "paket-konflik-setup-1",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
      createDateLocks: true,
    });
    await seedReservation({
      reservationId: "reservasi-pemilik-setup",
      customerId: "customer-pemilik-setup",
      customerWhatsapp: "6281234500026",
      eventDate: addDays(newDate, -1),
      packageId: "paket-konflik-setup-2",
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0002",
      createDateLocks: true,
    });

    await expectUnchanged({
      reservationId: first.reservationId,
      newEventDate: newDate,
      actorUserId: first.actorUserId,
      code: "DATE_CONFLICT",
    });
  });
});
