import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  customer,
  dateLock,
  packageTable,
  reservation,
} from "@/lib/db/schema";

async function seedReservation(): Promise<void> {
  await db.insert(packageTable).values({
    id: "paket-uji",
    name: "Paket Uji",
    priceRupiah: 20_000_000,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore: 0,
    sortOrder: 1,
  });
  await db.insert(customer).values({
    id: "customer-uji",
    name: "Customer Uji",
    whatsapp: "6281234567890",
  });
  await db.insert(reservation).values({
    id: "reservasi-uji",
    customerId: "customer-uji",
    packageId: "paket-uji",
    packageName: "Paket Uji",
    packagePriceRupiah: 20_000_000,
    packageDurationHours: 5,
    packageSessionCount: 1,
    eventDate: "2027-03-20",
    eventType: "PERNIKAHAN",
    address: "Jl. Uji No. 1, Pekalongan",
  });
}

describe("constraint skema date_lock", () => {
  it("menolak kunci kedua pada tanggal yang sama", async () => {
    await seedReservation();
    await db.insert(dateLock).values({
      date: "2027-03-20",
      kind: "EVENT",
      reservationId: "reservasi-uji",
    });

    await expect(
      db.insert(dateLock).values({
        date: "2027-03-20",
        kind: "SETUP",
        reservationId: "reservasi-uji",
      }),
    ).rejects.toThrow();
  });

  it("menolak jenis kunci di luar EVENT dan SETUP", async () => {
    await expect(
      db.insert(dateLock).values({ date: "2027-03-21", kind: "MANUAL" }),
    ).rejects.toThrow();
  });

  it("paket dua sesi hanya menyimpan satu tanggal acara", async () => {
    await seedReservation();
    await db.insert(dateLock).values({
      date: "2027-03-20",
      kind: "EVENT",
      reservationId: "reservasi-uji",
    });

    await expect(
      db.insert(dateLock).values({
        date: "2027-03-20",
        kind: "EVENT",
        reservationId: "reservasi-uji",
      }),
    ).rejects.toThrow();

    const rows = await db.select().from(dateLock);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.date).toBe("2027-03-20");
  });

  it("menerima kunci acara dan setup pada tanggal berbeda", async () => {
    await seedReservation();
    await db.insert(dateLock).values([
      { date: "2027-03-19", kind: "SETUP", reservationId: "reservasi-uji" },
      { date: "2027-03-20", kind: "EVENT", reservationId: "reservasi-uji" },
    ]);

    const rows = await db.select().from(dateLock);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.kind).sort()).toEqual(["EVENT", "SETUP"]);
  });

  it("mengizinkan kunci manual tanpa reservasi", async () => {
    await db.insert(dateLock).values({
      date: "2027-03-22",
      kind: "SETUP",
      reservationId: null,
    });

    const rows = await db.select().from(dateLock);
    expect(rows[0]?.reservationId).toBeNull();
  });

  it("menolak reservation_id yang tidak menunjuk reservasi", async () => {
    await expect(
      db.insert(dateLock).values({
        date: "2027-03-23",
        kind: "SETUP",
        reservationId: "reservasi-tidak-ada",
      }),
    ).rejects.toThrow();
  });

  it("FK restrict menolak hapus reservasi yang masih memiliki kunci", async () => {
    await seedReservation();
    await db.insert(dateLock).values({
      date: "2027-03-24",
      kind: "EVENT",
      reservationId: "reservasi-uji",
    });

    await expect(
      db.delete(reservation).where(eq(reservation.id, "reservasi-uji")),
    ).rejects.toThrow();
  });
});
