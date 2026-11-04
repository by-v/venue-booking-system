import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { dateLock, packageTable } from "@/lib/db/schema";
import { GET } from "@/app/api/ketersediaan/route";

const BASE_URL = "http://localhost:3000";
const MONTH = "2099-03";
const LOCKED_SETUP = "2099-03-18";
const LOCKED_EVENT = "2099-03-20";

async function seedAvailability(): Promise<void> {
  await db.insert(packageTable).values({
    id: "full-service",
    name: "Full Service",
    priceRupiah: 20_000_000,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore: 0,
    active: true,
    sortOrder: 1,
  });
  await db.insert(dateLock).values([
    { date: LOCKED_SETUP, kind: "SETUP", reservationId: null },
    { date: LOCKED_EVENT, kind: "EVENT", reservationId: null },
  ]);
}

function availabilityRequest(query: string): Request {
  return new Request(`${BASE_URL}/api/ketersediaan${query}`, {
    method: "GET",
  });
}

describe("GET /api/ketersediaan", () => {
  it("mengembalikan hari beserta status dengan Cache-Control no-store", async () => {
    await seedAvailability();

    const response = await GET(
      availabilityRequest(`?packageId=full-service&bulan=${MONTH}`),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = (await response.json()) as {
      days: Array<{ date: string; status: string }>;
    };
    expect(body.days).toHaveLength(31);
    expect(body.days.find((day) => day.date === LOCKED_SETUP)).toEqual({
      date: LOCKED_SETUP,
      status: "TERISI",
    });
    expect(body.days.find((day) => day.date === LOCKED_EVENT)).toEqual({
      date: LOCKED_EVENT,
      status: "TERISI",
    });
    expect(body.days.find((day) => day.date === "2099-03-21")).toEqual({
      date: "2099-03-21",
      status: "TERSEDIA",
    });

    for (const day of body.days) {
      expect(Object.keys(day).sort()).toEqual(["date", "status"]);
    }

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("SETUP");
    expect(serialized).not.toContain("EVENT");
    expect(serialized).not.toContain("reservationId");
    expect(serialized).not.toContain("setupDaysBefore");
    expect(serialized).not.toContain("reservasi-uji");
  });

  it("menolak parameter yang tidak valid dengan 400", async () => {
    await expect(
      GET(availabilityRequest(`?bulan=${MONTH}`)),
    ).resolves.toMatchObject({ status: 400 });
    await expect(
      GET(availabilityRequest("?packageId=full-service&bulan=2099-13")),
    ).resolves.toMatchObject({ status: 400 });
    await expect(
      GET(availabilityRequest("?packageId=&bulan=2099-03")),
    ).resolves.toMatchObject({ status: 400 });
  });

  it("mengembalikan daftar kosong untuk paket yang tidak tersedia", async () => {
    const response = await GET(
      availabilityRequest(`?packageId=tidak-ada&bulan=${MONTH}`),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ days: [] });
  });
});
