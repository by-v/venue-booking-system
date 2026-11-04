import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  payment,
  reservation,
  reservationActivity,
  reservationStatusHistory,
} from "@/lib/db/schema";
import { runReservationLifecycle } from "@/modules/reservation/mutations";
import type { ReservationStatus } from "@/modules/reservation/types";

import { seedReservation } from "./helpers/seed-reservation";

interface ReservationState {
  status: ReservationStatus;
  perluPemeriksaanAdmin: boolean;
  history: Array<{
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    reasonCode: string | null;
    actorType: string;
  }>;
  payments: number;
  activities: number;
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

  const [history, payments, activities] = await Promise.all([
    db
      .select({
        fromStatus: reservationStatusHistory.fromStatus,
        toStatus: reservationStatusHistory.toStatus,
        reason: reservationStatusHistory.reason,
        reasonCode: reservationStatusHistory.reasonCode,
        actorType: reservationStatusHistory.actorType,
      })
      .from(reservationStatusHistory)
      .where(eq(reservationStatusHistory.reservationId, reservationId)),
    db
      .select({ id: payment.id })
      .from(payment)
      .where(eq(payment.reservationId, reservationId)),
    db
      .select({ id: reservationActivity.id })
      .from(reservationActivity)
      .where(eq(reservationActivity.reservationId, reservationId)),
  ]);

  return {
    status: row.status as ReservationStatus,
    perluPemeriksaanAdmin: row.perluPemeriksaanAdmin,
    history,
    payments: payments.length,
    activities: activities.length,
  };
}

async function setCreatedAt(
  reservationId: string,
  createdAt: Date,
): Promise<void> {
  await db
    .update(reservation)
    .set({ createdAt })
    .where(eq(reservation.id, reservationId));
}

async function seedInactiveReservation(options: {
  reservationId: string;
  status?: ReservationStatus;
  eventDate?: string;
  payments?: Array<{
    amountRupiah: number;
    verificationStatus?: "TERVERIFIKASI";
  }>;
}): Promise<void> {
  await seedReservation({
    reservationId: options.reservationId,
    customerId: `customer-${options.reservationId}`,
    customerWhatsapp: `62812${options.reservationId.replace(/\D/g, "").padStart(8, "0").slice(-8)}`,
    status: options.status ?? "PENDING",
    eventDate: options.eventDate ?? "2027-03-20",
    payments: options.payments,
  });
  await setCreatedAt(
    options.reservationId,
    new Date("2026-01-01T03:00:00Z"),
  );
}

describe("auto-cancel lifecycle", () => {
  it("membatalkan PENDING tanpa pembayaran karena tidak ada aktivitas tiga bulan", async () => {
    await seedInactiveReservation({ reservationId: "res-inactivity" });

    const summary = await runReservationLifecycle({ today: "2026-04-01" });

    expect(summary).toMatchObject({
      today: "2026-04-01",
      cancelled: 1,
      flagged: 0,
      completed: 0,
    });

    const state = await readState("res-inactivity");
    expect(state.status).toBe("AUTO_CANCELLED");
    expect(state.perluPemeriksaanAdmin).toBe(false);
    expect(state.history).toEqual([
      expect.objectContaining({
        fromStatus: "PENDING",
        toStatus: "AUTO_CANCELLED",
        reasonCode: "INACTIVITY_3M",
        actorType: "SYSTEM",
      }),
    ]);
    expect(state.activities).toBe(0);
  });

  it("membatalkan DITANGGUHKAN pada hari setelah tanggal acara", async () => {
    await seedInactiveReservation({
      reservationId: "res-event-passed",
      status: "DITANGGUHKAN",
      eventDate: "2026-05-30",
    });
    await setCreatedAt(
      "res-event-passed",
      new Date("2026-05-01T03:00:00Z"),
    );

    await runReservationLifecycle({ today: "2026-05-30" });
    expect((await readState("res-event-passed")).status).toBe(
      "DITANGGUHKAN",
    );

    await runReservationLifecycle({ today: "2026-05-31" });

    const state = await readState("res-event-passed");
    expect(state.status).toBe("AUTO_CANCELLED");
    expect(state.history).toEqual([
      expect.objectContaining({
        fromStatus: "DITANGGUHKAN",
        toStatus: "AUTO_CANCELLED",
        reasonCode: "EVENT_DATE_PASSED",
        actorType: "SYSTEM",
      }),
    ]);
  });

  it("menahan pembatalan bila ada pembayaran TERVERIFIKASI", async () => {
    await seedInactiveReservation({
      reservationId: "res-terverifikasi",
      status: "DITANGGUHKAN",
      eventDate: "2026-05-30",
      payments: [
        { amountRupiah: 5_000_000, verificationStatus: "TERVERIFIKASI" },
      ],
    });
    await setCreatedAt(
      "res-terverifikasi",
      new Date("2026-05-01T03:00:00Z"),
    );

    await runReservationLifecycle({ today: "2026-05-31" });

    const state = await readState("res-terverifikasi");
    expect(state.status).toBe("DITANGGUHKAN");
    expect(state.perluPemeriksaanAdmin).toBe(true);
    expect(state.history).toEqual([]);
    expect(state.payments).toBe(1);
    expect(state.activities).toBe(0);
  });

  it("memakai aktivitas substantif terakhir sebagai dasar batas tiga bulan", async () => {
    await seedInactiveReservation({ reservationId: "res-follow-up" });
    await db.insert(reservationActivity).values({
      id: "res-follow-up-note",
      reservationId: "res-follow-up",
      type: "FOLLOW_UP_NOTE",
      note: "Sudah dihubungi customer.",
      actorType: "ADMIN",
      isSubstantive: true,
      createdAt: new Date("2026-02-20T03:00:00Z"),
    });

    await runReservationLifecycle({ today: "2026-05-19" });
    expect((await readState("res-follow-up")).status).toBe("PENDING");

    await runReservationLifecycle({ today: "2026-05-20" });
    const state = await readState("res-follow-up");
    expect(state.status).toBe("AUTO_CANCELLED");
    expect(state.history).toEqual([
      expect.objectContaining({ reasonCode: "INACTIVITY_3M" }),
    ]);
  });

  it("tidak menyentuh reservasi yang belum menjadi kandidat", async () => {
    await seedInactiveReservation({
      reservationId: "res-belum-kandidat",
      eventDate: "2027-03-20",
    });

    const before = await readState("res-belum-kandidat");
    const summary = await runReservationLifecycle({ today: "2026-03-31" });

    expect(summary).toMatchObject({ cancelled: 0, flagged: 0, completed: 0 });
    expect(await readState("res-belum-kandidat")).toEqual(before);
  });
});
