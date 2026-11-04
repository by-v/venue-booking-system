import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET } from "@/app/api/cron/reservasi/route";
import { db } from "@/lib/db";
import {
  reservation,
  reservationActivity,
  reservationStatusHistory,
} from "@/lib/db/schema";
import { addDays, todayInJakarta } from "@/modules/availability/dates";

import { seedReservation } from "./helpers/seed-reservation";

const CRON_SECRET = "rahasia-cron-uji-yang-tidak-boleh-bocor";
const originalSecret = process.env.CRON_SECRET;

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/cron/reservasi", {
    method: "GET",
    headers,
  });
}

async function seedInactive(): Promise<void> {
  const today = todayInJakarta();
  await seedReservation({
    reservationId: "res-cron-uji",
    customerId: "customer-cron-uji",
    status: "PENDING",
    eventDate: addDays(today, 30),
  });
  await db
    .update(reservation)
    .set({ createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) })
    .where(eq(reservation.id, "res-cron-uji"));
}

async function readState(): Promise<{
  status: string;
  flagged: boolean;
  history: number;
  activities: number;
}> {
  const rows = await db
    .select()
    .from(reservation)
    .where(eq(reservation.id, "res-cron-uji"));
  const row = rows[0];
  if (!row) {
    throw new Error("Reservasi uji tidak ditemukan");
  }

  const [history, activities] = await Promise.all([
    db
      .select({ id: reservationStatusHistory.id })
      .from(reservationStatusHistory)
      .where(eq(reservationStatusHistory.reservationId, "res-cron-uji")),
    db
      .select({ id: reservationActivity.id })
      .from(reservationActivity)
      .where(eq(reservationActivity.reservationId, "res-cron-uji")),
  ]);

  return {
    status: row.status,
    flagged: row.perluPemeriksaanAdmin,
    history: history.length,
    activities: activities.length,
  };
}

beforeEach(async () => {
  process.env.CRON_SECRET = CRON_SECRET;
  await seedInactive();
});

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalSecret;
  }
});

describe("GET /api/cron/reservasi", () => {
  it("menjalankan job dengan secret yang benar dan membalas ringkasan", async () => {
    const response = await GET(
      request({ authorization: `Bearer ${CRON_SECRET}` }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      cancelled: 1,
      flagged: 0,
      completed: 0,
    });
    expect(Object.keys(body).sort()).toEqual([
      "cancelled",
      "completed",
      "flagged",
      "today",
    ]);
    expect(JSON.stringify(body)).not.toContain(CRON_SECRET);
    expect((await readState()).status).toBe("AUTO_CANCELLED");
  });

  it("menolak secret yang salah tanpa mengubah data", async () => {
    const before = await readState();

    const response = await GET(
      request({ authorization: "Bearer rahasia-yang-salah" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
    });
    expect(await readState()).toEqual(before);
  });

  it("menolak permintaan tanpa header Authorization tanpa mengubah data", async () => {
    const before = await readState();

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await readState()).toEqual(before);
  });

  it("menolak permintaan bila CRON_SECRET server tidak tersedia", async () => {
    delete process.env.CRON_SECRET;
    const before = await readState();

    const response = await GET(
      request({ authorization: `Bearer ${CRON_SECRET}` }),
    );

    expect(response.status).toBe(401);
    expect(await readState()).toEqual(before);
  });

  it("tidak membocorkan secret pada respons gagal", async () => {
    const response = await GET(
      request({ authorization: `Bearer ${CRON_SECRET}-salah` }),
    );

    const text = await response.text();
    expect(response.status).toBe(401);
    expect(text).not.toContain(CRON_SECRET);
  });
});
