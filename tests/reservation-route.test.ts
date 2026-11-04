import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/reservasi/route";
import { db } from "@/lib/db";
import {
  dateLock,
  packageTable,
  reservation,
} from "@/lib/db/schema";
import { todayInJakarta } from "@/modules/availability/dates";
import { reservationSubmissionSchema } from "@/modules/reservation/schema";

const BASE_URL = "http://localhost:3000";
const EVENT_DATE = "2099-03-20";
const SOURCE_IP = "203.0.113.10";

async function seedPackage(active = true): Promise<void> {
  await db.insert(packageTable).values({
    id: "full-service",
    name: "Full Service",
    priceRupiah: 20_000_000,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore: 0,
    active,
    sortOrder: 1,
  });
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Siti Aminah",
    whatsapp: "0812-3456-7890",
    address: "Jl. Pelita II No. 1, Pekalongan",
    eventType: "PERNIKAHAN",
    packageId: "full-service",
    eventDate: EVENT_DATE,
    notes: "",
    ...overrides,
  };
}

function reservationRequest(
  payload: unknown,
  ip = SOURCE_IP,
): Request {
  return new Request(`${BASE_URL}/api/reservasi`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(payload),
  });
}

function rawReservationRequest(body: string, ip = SOURCE_IP): Request {
  return new Request(`${BASE_URL}/api/reservasi`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body,
  });
}

describe("POST /api/reservasi", () => {
  it("menyimpan pengajuan valid dan membalas 201 tanpa id atau kode", async () => {
    await seedPackage();

    const response = await POST(reservationRequest(validPayload()));

    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ ok: true });
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("bookingNumber");
    expect(body).not.toHaveProperty("kode");

    const reservations = await db.select().from(reservation);
    expect(reservations).toHaveLength(1);
    expect(await db.select().from(dateLock)).toHaveLength(0);
  });

  it("menerima payload hasil parse klien dengan catatan kosong bernilai null", async () => {
    await seedPackage();

    const parsed = reservationSubmissionSchema.parse(validPayload());
    expect(parsed.notes).toBeNull();

    const response = await POST(reservationRequest(parsed));
    expect(response.status).toBe(201);

    const reservations = await db.select().from(reservation);
    expect(reservations).toHaveLength(1);
    expect(reservations[0]?.notes).toBeNull();
  });

  it("menolak body bukan JSON dan payload yang tidak valid dengan 400", async () => {
    await seedPackage();

    const malformed = await POST(rawReservationRequest("{bukan json"));
    expect(malformed.status).toBe(400);

    const missingName = await POST(
      reservationRequest(validPayload({ name: "" })),
    );
    expect(missingName.status).toBe(400);

    const invalidDate = await POST(
      reservationRequest(validPayload({ eventDate: "2099-02-30" })),
    );
    expect(invalidDate.status).toBe(400);

    expect(await db.select().from(reservation)).toHaveLength(0);
  });

  it("menolak tanggal terkunci dan hari ini dengan pesan generik", async () => {
    await seedPackage();
    await db.insert(dateLock).values({
      date: EVENT_DATE,
      kind: "EVENT",
      reservationId: null,
    });

    const locked = await POST(reservationRequest(validPayload()));
    expect(locked.status).toBe(400);
    const lockedBody = await locked.json();
    expect(lockedBody).toEqual({
      error: "Tanggal atau paket tidak tersedia.",
    });
    const lockedText = JSON.stringify(lockedBody);
    expect(lockedText).not.toContain("EVENT");
    expect(lockedText).not.toContain("SETUP");
    expect(lockedText).not.toContain("reservasi-lain");
    expect(lockedText).not.toContain("terkunci");

    const today = await POST(
      reservationRequest(validPayload({ eventDate: todayInJakarta() })),
    );
    expect(today.status).toBe(400);
    await expect(today.json()).resolves.toEqual({
      error: "Tanggal atau paket tidak tersedia.",
    });

    expect(await db.select().from(reservation)).toHaveLength(0);
  });

  it("membalas 429 pada permintaan keenam dari sumber yang sama", async () => {
    await seedPackage();

    for (let index = 0; index < 5; index += 1) {
      const response = await POST(reservationRequest(validPayload()));
      expect(response.status).toBe(201);
    }

    const sixth = await POST(reservationRequest(validPayload()));
    expect(sixth.status).toBe(429);
    await expect(sixth.json()).resolves.toEqual({
      error: "Terlalu banyak percobaan. Coba lagi nanti.",
    });

    expect(await db.select().from(reservation)).toHaveLength(5);
  });
});
