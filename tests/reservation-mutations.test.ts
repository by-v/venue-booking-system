import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  customer,
  dateLock,
  packageTable,
  reservation,
  reservationActivity,
  reservationStatusHistory,
  user,
} from "@/lib/db/schema";
import { addDays, todayInJakarta } from "@/modules/availability/dates";
import { addFollowUpNote, submitReservation } from "@/modules/reservation/mutations";
import {
  reservationSubmissionSchema,
  type ReservationSubmissionInput,
} from "@/modules/reservation/schema";
import { createTestUser } from "./helpers/create-user";

interface SeedPackageOptions {
  setupDaysBefore?: number;
  active?: boolean;
  priceRupiah?: number;
}

async function seedPackage({
  setupDaysBefore = 0,
  active = true,
  priceRupiah = 20_000_000,
}: SeedPackageOptions = {}): Promise<void> {
  await db.insert(packageTable).values({
    id: "full-service",
    name: "Full Service",
    priceRupiah,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore,
    active,
    sortOrder: 1,
  });
}

function submissionInput(
  overrides: Partial<ReservationSubmissionInput> = {},
): ReservationSubmissionInput {
  return reservationSubmissionSchema.parse({
    name: "Siti Aminah",
    whatsapp: "0812-3456-7890",
    address: "Jl. Pelita II No. 1, Pekalongan",
    eventType: "PERNIKAHAN",
    packageId: "full-service",
    eventDate: "2027-03-20",
    notes: "",
    ...overrides,
  });
}

describe("mutasi pengajuan reservasi", () => {
  it("membuat customer CALON, reservasi PENDING, riwayat, dan aktivitas pertama", async () => {
    await seedPackage();

    const created = await submitReservation(submissionInput());

    const customers = await db.select().from(customer);
    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({
      name: "Siti Aminah",
      whatsapp: "6281234567890",
      status: "CALON",
    });

    const reservations = await db.select().from(reservation);
    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({
      id: created.id,
      packageName: "Full Service",
      packagePriceRupiah: 20_000_000,
      packageDurationHours: 5,
      packageSessionCount: 1,
      eventDate: "2027-03-20",
      eventType: "PERNIKAHAN",
      status: "PENDING",
    });

    const history = await db.select().from(reservationStatusHistory);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      reservationId: created.id,
      fromStatus: null,
      toStatus: "PENDING",
      actorType: "CUSTOMER",
    });

    const activities = await db.select().from(reservationActivity);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      reservationId: created.id,
      type: "SUBMISSION",
      actorType: "CUSTOMER",
      isSubstantive: true,
    });

    expect(await db.select().from(dateLock)).toHaveLength(0);
  });

  it("menormalisasi nomor WhatsApp sehingga pengajuan ulang memakai satu customer", async () => {
    await seedPackage();

    await submitReservation(
      submissionInput({ whatsapp: "0812-3456-7890" }),
    );
    await submitReservation(
      submissionInput({
        whatsapp: "+62 812 3456 7890",
        eventDate: "2027-03-21",
      }),
    );

    const customers = await db.select().from(customer);
    const reservations = await db.select().from(reservation);
    expect(customers).toHaveLength(1);
    expect(customers[0]?.whatsapp).toBe("6281234567890");
    expect(reservations).toHaveLength(2);
    expect(reservations.map((row) => row.customerId)).toEqual([
      customers[0]?.id,
      customers[0]?.id,
    ]);
  });

  it("pengajuan ulang membuat reservasi baru dengan id berbeda", async () => {
    await seedPackage();

    const first = await submitReservation(submissionInput());
    const second = await submitReservation(
      submissionInput({ eventDate: "2027-03-22" }),
    );

    expect(second.id).not.toBe(first.id);
    const reservations = await db.select().from(reservation);
    expect(reservations).toHaveLength(2);
    expect(reservations.every((row) => row.status === "PENDING")).toBe(true);
  });

  it("mempertahankan snapshot harga setelah paket diubah", async () => {
    await seedPackage();
    const created = await submitReservation(submissionInput());

    await db
      .update(packageTable)
      .set({ priceRupiah: 25_000_000, name: "Full Service Baru" })
      .where(eq(packageTable.id, "full-service"));

    const rows = await db.select().from(reservation);
    expect(rows[0]).toMatchObject({
      id: created.id,
      packageName: "Full Service",
      packagePriceRupiah: 20_000_000,
    });
  });

  it("menolak tanggal acara yang sudah terkunci", async () => {
    await seedPackage();
    await db.insert(dateLock).values({
      date: "2027-03-20",
      kind: "EVENT",
      reservationId: null,
    });

    await expect(submitReservation(submissionInput())).rejects.toMatchObject({
      code: "DATE_NOT_BOOKABLE",
    });
    expect(await db.select().from(reservation)).toHaveLength(0);
  });

  it("menolak tanggal yang bentrok dengan jendela setup paket", async () => {
    await seedPackage({ setupDaysBefore: 2 });
    await db.insert(dateLock).values({
      date: "2027-03-18",
      kind: "SETUP",
      reservationId: null,
    });

    await expect(submitReservation(submissionInput())).rejects.toMatchObject({
      code: "DATE_NOT_BOOKABLE",
    });
  });

  it("menolak tanggal hari ini dan tanggal lampau", async () => {
    await seedPackage();
    const today = todayInJakarta();

    await expect(
      submitReservation(submissionInput({ eventDate: today })),
    ).rejects.toMatchObject({ code: "DATE_NOT_BOOKABLE" });

    await expect(
      submitReservation(submissionInput({ eventDate: addDays(today, -1) })),
    ).rejects.toMatchObject({ code: "DATE_NOT_BOOKABLE" });
  });

  it("menolak paket nonaktif", async () => {
    await seedPackage({ active: false });

    await expect(submitReservation(submissionInput())).rejects.toMatchObject({
      code: "PACKAGE_UNAVAILABLE",
    });
  });

  it("menyimpan dua PENDING pada tanggal yang sama tanpa mengunci tanggal", async () => {
    await seedPackage();

    await submitReservation(submissionInput({ whatsapp: "0812-3456-7890" }));
    await submitReservation(submissionInput({ whatsapp: "0812-3456-7891" }));

    const reservations = await db.select().from(reservation);
    expect(reservations).toHaveLength(2);
    expect(await db.select().from(dateLock)).toHaveLength(0);
  });

  it("mencatat catatan tindak lanjut sebagai aktivitas admin", async () => {
    await seedPackage();
    const created = await submitReservation(submissionInput());
    const credentials = await createTestUser();
    const users = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, credentials.email));
    const actorUserId = users[0]?.id;
    expect(actorUserId).toBeTruthy();

    await addFollowUpNote({
      reservationId: created.id,
      note: "Sudah dihubungi via WhatsApp.",
      actorUserId: actorUserId as string,
    });

    const activities = await db.select().from(reservationActivity);
    const followUp = activities.find(
      (activity) => activity.type === "FOLLOW_UP_NOTE",
    );
    expect(followUp).toMatchObject({
      note: "Sudah dihubungi via WhatsApp.",
      actorType: "ADMIN",
      actorUserId,
      isSubstantive: true,
    });
  });

  it("menerima catatan tindak lanjut untuk reservasi DITANGGUHKAN", async () => {
    await seedPackage();
    const created = await submitReservation(submissionInput());
    const credentials = await createTestUser();
    const users = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, credentials.email));
    const actorUserId = users[0]?.id as string;

    await db
      .update(reservation)
      .set({ status: "DITANGGUHKAN" })
      .where(eq(reservation.id, created.id));

    await addFollowUpNote({
      reservationId: created.id,
      note: "Menunggu konfirmasi ulang customer.",
      actorUserId,
    });

    const activities = await db.select().from(reservationActivity);
    const followUp = activities.find(
      (activity) => activity.type === "FOLLOW_UP_NOTE",
    );
    expect(followUp).toMatchObject({
      reservationId: created.id,
      note: "Menunggu konfirmasi ulang customer.",
      actorType: "ADMIN",
      actorUserId,
      isSubstantive: true,
    });
  });

  it("menolak catatan untuk reservasi yang tidak ada atau bukan PENDING", async () => {
    await seedPackage();
    const created = await submitReservation(submissionInput());
    const credentials = await createTestUser();
    const users = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, credentials.email));
    const actorUserId = users[0]?.id as string;

    await expect(
      addFollowUpNote({
        reservationId: "tidak-ada",
        note: "Catatan",
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "RESERVATION_NOT_FOUND" });

    await db
      .update(reservation)
      .set({ status: "DITERIMA", bookingNumber: "HADCC-2026-0001" })
      .where(eq(reservation.id, created.id));

    await expect(
      addFollowUpNote({
        reservationId: created.id,
        note: "Catatan",
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});
