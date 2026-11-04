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
import { createAdminReservation } from "@/modules/reservation/mutations";
import {
  adminReservationInputSchema,
  type AdminReservationInput,
} from "@/modules/reservation/schema";
import { createTestUser } from "./helpers/create-user";

interface SeedPackageOptions {
  setupDaysBefore?: number;
  active?: boolean;
}

async function seedPackage({
  setupDaysBefore = 0,
  active = true,
}: SeedPackageOptions = {}): Promise<void> {
  await db.insert(packageTable).values({
    id: "full-service",
    name: "Full Service",
    priceRupiah: 20_000_000,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore,
    active,
    sortOrder: 1,
  });
}

async function adminActorUserId(): Promise<string> {
  const credentials = await createTestUser();
  const users = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, credentials.email));
  const actorUserId = users[0]?.id;
  if (!actorUserId) {
    throw new Error("Gagal menyiapkan pengguna admin uji");
  }
  return actorUserId;
}

function adminInput(
  overrides: Partial<AdminReservationInput> = {},
): AdminReservationInput {
  return adminReservationInputSchema.parse({
    name: "Siti Aminah",
    whatsapp: "0812-3456-7890",
    address: "Jl. Pelita II No. 1, Pekalongan",
    eventType: "PERNIKAHAN",
    packageId: "full-service",
    eventDate: "2027-03-20",
    notes: "",
    accept: true,
    ...overrides,
  });
}

describe("mutasi input reservasi langsung admin", () => {
  it("membuat customer CALON dan reservasi PENDING bersumber INPUT_ADMIN", async () => {
    await seedPackage();
    const actorUserId = await adminActorUserId();

    const created = await createAdminReservation({
      ...adminInput(),
      actorUserId,
    });

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
      status: "PENDING",
      source: "INPUT_ADMIN",
      bookingNumber: null,
    });

    expect(await db.select().from(dateLock)).toHaveLength(0);
  });

  it("mencatat riwayat (baru)→PENDING dan aktivitas SUBMISSION oleh admin", async () => {
    await seedPackage();
    const actorUserId = await adminActorUserId();

    const created = await createAdminReservation({
      ...adminInput(),
      actorUserId,
    });

    const history = await db.select().from(reservationStatusHistory);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      reservationId: created.id,
      fromStatus: null,
      toStatus: "PENDING",
      actorType: "ADMIN",
      actorUserId,
    });

    const activities = await db.select().from(reservationActivity);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      reservationId: created.id,
      type: "SUBMISSION",
      actorType: "ADMIN",
      actorUserId,
      isSubstantive: true,
    });
  });

  it("memakai ulang customer yang sama tanpa menurunkan status CLIENT", async () => {
    await seedPackage();
    const actorUserId = await adminActorUserId();
    await db.insert(customer).values({
      id: "cust-langganan",
      name: "Nama Lama",
      whatsapp: "6281234567890",
      status: "CLIENT",
    });

    const created = await createAdminReservation({
      ...adminInput({ name: "Nama Baru" }),
      actorUserId,
    });

    const customers = await db.select().from(customer);
    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({
      id: "cust-langganan",
      name: "Nama Baru",
      status: "CLIENT",
    });

    const reservations = await db.select().from(reservation);
    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({
      id: created.id,
      customerId: "cust-langganan",
      source: "INPUT_ADMIN",
    });
  });

  it("menolak paket nonaktif tanpa menulis apa pun", async () => {
    await seedPackage({ active: false });
    const actorUserId = await adminActorUserId();

    await expect(
      createAdminReservation({ ...adminInput(), actorUserId }),
    ).rejects.toMatchObject({ code: "PACKAGE_UNAVAILABLE" });

    expect(await db.select().from(reservation)).toHaveLength(0);
    expect(await db.select().from(reservationStatusHistory)).toHaveLength(0);
    expect(await db.select().from(reservationActivity)).toHaveLength(0);
  });

  it("menolak tanggal lampau tanpa menulis apa pun", async () => {
    await seedPackage();
    const actorUserId = await adminActorUserId();
    const pastDate = addDays(todayInJakarta(), -1);

    await expect(
      createAdminReservation({
        ...adminInput({ eventDate: pastDate }),
        actorUserId,
      }),
    ).rejects.toMatchObject({ code: "DATE_NOT_BOOKABLE" });

    expect(await db.select().from(reservation)).toHaveLength(0);
    expect(await db.select().from(reservationStatusHistory)).toHaveLength(0);
    expect(await db.select().from(reservationActivity)).toHaveLength(0);
  });

  it("menolak tanggal terkunci tanpa menulis apa pun", async () => {
    await seedPackage();
    const actorUserId = await adminActorUserId();
    await db.insert(dateLock).values({
      date: "2027-03-20",
      kind: "EVENT",
      reservationId: null,
    });

    await expect(
      createAdminReservation({ ...adminInput(), actorUserId }),
    ).rejects.toMatchObject({ code: "DATE_NOT_BOOKABLE" });

    expect(await db.select().from(reservation)).toHaveLength(0);
    expect(await db.select().from(reservationStatusHistory)).toHaveLength(0);
    expect(await db.select().from(reservationActivity)).toHaveLength(0);
  });
});
