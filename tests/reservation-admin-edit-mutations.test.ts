import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  customer,
  packageTable,
  reservation,
  reservationActivity,
} from "@/lib/db/schema";
import { addDays, todayInJakarta } from "@/modules/availability/dates";
import {
  updatePaymentDueDate,
  updateReservationData,
} from "@/modules/reservation/mutations";
import { paymentDueDate } from "@/modules/reservation/payment-deadline";
import { getReservationDetail } from "@/modules/reservation/queries";
import {
  paymentDueDateUpdateSchema,
  reservationDataUpdateSchema,
} from "@/modules/reservation/schema";

import { seedReservation } from "./helpers/seed-reservation";

function updateInput(
  reservationId: string,
  overrides: Record<string, unknown> = {},
) {
  return reservationDataUpdateSchema.parse({
    reservationId,
    name: "Siti Aminah",
    whatsapp: "6281234567890",
    address: "Jl. Pelita II No. 1, Pekalongan",
    eventType: "PERNIKAHAN",
    packageId: "paket-uji",
    eventDate: "2027-03-20",
    notes: "",
    ...overrides,
  });
}

describe("mutasi koreksi data reservasi", () => {
  it("memperbarui data customer dan detail acara serta mencatat aktivitas", async () => {
    const seeded = await seedReservation();

    await updateReservationData({
      ...updateInput(seeded.reservationId, {
        name: "Siti Aminah Putri",
        address: "Jl. Pelita II No. 2, Pekalongan",
        eventType: "SEMINAR",
        notes: "Perbaikan typo alamat",
      }),
      actorUserId: seeded.actorUserId,
    });

    const detail = await getReservationDetail(seeded.reservationId);
    expect(detail?.customer.name).toBe("Siti Aminah Putri");
    expect(detail?.address).toBe("Jl. Pelita II No. 2, Pekalongan");
    expect(detail?.eventType).toBe("SEMINAR");
    expect(detail?.notes).toBe("Perbaikan typo alamat");

    const activities = await db
      .select()
      .from(reservationActivity)
      .where(eq(reservationActivity.reservationId, seeded.reservationId));
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      type: "DATA_UPDATED",
      actorType: "ADMIN",
      actorUserId: seeded.actorUserId,
      isSubstantive: true,
    });
  });

  it("memperbarui snapshot saat paket diganti", async () => {
    const seeded = await seedReservation();
    await db.insert(packageTable).values({
      id: "paket-premium",
      name: "Premium",
      priceRupiah: 25_000_000,
      durationHours: 6,
      sessionCount: 2,
      setupDaysBefore: 1,
      active: true,
      sortOrder: 2,
    });

    await updateReservationData({
      ...updateInput(seeded.reservationId, { packageId: "paket-premium" }),
      actorUserId: seeded.actorUserId,
    });

    const rows = await db
      .select()
      .from(reservation)
      .where(eq(reservation.id, seeded.reservationId));
    expect(rows[0]).toMatchObject({
      packageId: "paket-premium",
      packageName: "Premium",
      packagePriceRupiah: 25_000_000,
      packageDurationHours: 6,
      packageSessionCount: 2,
    });
  });

  it("menolak tanggal yang sudah terkunci reservasi lain", async () => {
    const today = todayInJakarta();
    const blockedDate = addDays(today, 45);
    await seedReservation({
      reservationId: "reservasi-lain",
      customerId: "customer-lain",
      customerWhatsapp: "6281111111111",
      eventDate: blockedDate,
      createDateLocks: true,
    });
    const seeded = await seedReservation({
      reservationId: "reservasi-edit",
      customerId: "customer-edit",
      customerWhatsapp: "6282222222222",
      eventDate: addDays(today, 40),
    });

    await expect(
      updateReservationData({
        ...updateInput(seeded.reservationId, {
          eventDate: blockedDate,
          whatsapp: "6282222222222",
        }),
        actorUserId: seeded.actorUserId,
      }),
    ).rejects.toMatchObject({ code: "DATE_NOT_BOOKABLE" });
  });

  it("menolak nomor WhatsApp yang sudah dipakai customer lain", async () => {
    const seeded = await seedReservation();
    await db.insert(customer).values({
      id: "customer-lain",
      name: "Customer Lain",
      whatsapp: "6287777777777",
      status: "CALON",
    });

    await expect(
      updateReservationData({
        ...updateInput(seeded.reservationId, {
          whatsapp: "6287777777777",
        }),
        actorUserId: seeded.actorUserId,
      }),
    ).rejects.toMatchObject({ code: "CUSTOMER_WHATSAPP_TAKEN" });
  });

  it("menyimpan dan mengembalikan batas pelunasan manual", async () => {
    const seeded = await seedReservation({ eventDate: "2027-03-20" });

    await updatePaymentDueDate({
      ...paymentDueDateUpdateSchema.parse({
        reservationId: seeded.reservationId,
        paymentDueDate: "2027-03-15",
      }),
      actorUserId: seeded.actorUserId,
    });

    let detail = await getReservationDetail(seeded.reservationId);
    expect(detail?.paymentDueDate).toBe("2027-03-15");
    expect(detail?.paymentDueDateOverride).toBe("2027-03-15");

    await updatePaymentDueDate({
      ...paymentDueDateUpdateSchema.parse({
        reservationId: seeded.reservationId,
        paymentDueDate: "",
      }),
      actorUserId: seeded.actorUserId,
    });

    detail = await getReservationDetail(seeded.reservationId);
    expect(detail?.paymentDueDateOverride).toBeNull();
    expect(detail?.paymentDueDate).toBe(paymentDueDate("2027-03-20"));
  });

  it("menolak batas pelunasan setelah tanggal acara", async () => {
    const seeded = await seedReservation({ eventDate: "2027-03-20" });

    await expect(
      updatePaymentDueDate({
        ...paymentDueDateUpdateSchema.parse({
          reservationId: seeded.reservationId,
          paymentDueDate: "2027-03-21",
        }),
        actorUserId: seeded.actorUserId,
      }),
    ).rejects.toMatchObject({ code: "INVALID_PAYMENT_DUE_DATE" });
  });

  it("menolak edit data reservasi berstatus akhir", async () => {
    const seeded = await seedReservation({ status: "SELESAI" });

    await expect(
      updateReservationData({
        ...updateInput(seeded.reservationId),
        actorUserId: seeded.actorUserId,
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("mengembalikan batas pelunasan ke default saat tanggal acara dimajukan", async () => {
    const seeded = await seedReservation({ eventDate: "2027-04-20" });
    await db
      .update(reservation)
      .set({ paymentDueDateOverride: "2027-04-10" })
      .where(eq(reservation.id, seeded.reservationId));

    await updateReservationData({
      ...updateInput(seeded.reservationId, { eventDate: "2027-04-05" }),
      actorUserId: seeded.actorUserId,
    });

    const detail = await getReservationDetail(seeded.reservationId);
    expect(detail?.eventDate).toBe("2027-04-05");
    expect(detail?.paymentDueDateOverride).toBeNull();
    expect(detail?.paymentDueDate).toBe("2027-03-22");
  });
});
