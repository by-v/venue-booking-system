import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  customer,
  dateLock,
  packageTable,
  payment,
  reservation,
  reservationItem,
  user,
} from "@/lib/db/schema";
import { lockDatesForEvent } from "@/modules/availability/dates";
import type {
  PaymentVerificationStatus,
  ReservationStatus,
} from "@/modules/reservation/types";

import { createTestUser } from "./create-user";

interface SeedReservationItem {
  description: string;
  amountRupiah: number;
}

interface SeedReservationPayment {
  amountRupiah: number;
  verificationStatus?: PaymentVerificationStatus;
}

interface SeedReservationOptions {
  packagePriceRupiah?: number;
  status?: ReservationStatus;
  bookingNumber?: string;
  eventDate?: string;
  setupDaysBefore?: number;
  packageId?: string;
  packageName?: string;
  packageDurationHours?: number;
  packageSessionCount?: number;
  reservationId?: string;
  customerId?: string;
  customerName?: string;
  customerWhatsapp?: string;
  items?: SeedReservationItem[];
  payments?: SeedReservationPayment[];
  rescheduleCount?: number;
  paymentDueDateOverride?: string | null;
  createDateLocks?: boolean;
}

export interface SeededReservation {
  reservationId: string;
  actorUserId: string;
  packagePriceRupiah: number;
  customerId: string;
}

export async function seedReservation({
  packagePriceRupiah = 20_000_000,
  status = "PENDING",
  bookingNumber,
  eventDate = "2027-03-20",
  setupDaysBefore = 0,
  packageId = "paket-uji",
  packageName = "Paket Uji",
  packageDurationHours = 5,
  packageSessionCount = 1,
  reservationId = "reservasi-uji",
  customerId = "customer-uji",
  customerName = "Siti Aminah",
  customerWhatsapp = "6281234567890",
  items = [],
  payments = [],
  rescheduleCount = 0,
  paymentDueDateOverride = null,
  createDateLocks = false,
}: SeedReservationOptions = {}): Promise<SeededReservation> {
  await db
    .insert(packageTable)
    .values({
      id: packageId,
      name: packageName,
      priceRupiah: packagePriceRupiah,
      durationHours: packageDurationHours,
      sessionCount: packageSessionCount,
      setupDaysBefore,
      active: true,
      sortOrder: 1,
    })
    .onConflictDoNothing({ target: packageTable.id });

  await db
    .insert(customer)
    .values({
      id: customerId,
      name: customerName,
      whatsapp: customerWhatsapp,
      status: "CALON",
    })
    .onConflictDoNothing({ target: customer.id });

  await db.insert(reservation).values({
    id: reservationId,
    customerId,
    packageId,
    packageName,
    packagePriceRupiah,
    packageDurationHours,
    packageSessionCount,
    eventDate,
    eventType: "PERNIKAHAN",
    address: "Jl. Pelita II No. 1, Pekalongan",
    notes: null,
    status,
    bookingNumber,
    rescheduleCount,
    paymentDueDateOverride,
  });

  if (createDateLocks) {
    const locks = lockDatesForEvent({ eventDate, setupDaysBefore });
    await db.insert(dateLock).values(
      locks.map((lock) => ({
        date: lock.date,
        kind: lock.kind,
        reservationId,
      })),
    );
  }

  if (items.length > 0) {
    await db.insert(reservationItem).values(
      items.map((item, index) => ({
        id: `${reservationId}-item-${index + 1}`,
        reservationId,
        description: item.description,
        amountRupiah: item.amountRupiah,
      })),
    );
  }

  if (payments.length > 0) {
    await db.insert(payment).values(
      payments.map((rowPayment, index) => {
        const verificationStatus =
          rowPayment.verificationStatus ?? "TERVERIFIKASI";
        return {
          id: `${reservationId}-payment-${index + 1}`,
          reservationId,
          amountRupiah: rowPayment.amountRupiah,
          verificationStatus,
        };
      }),
    );
  }

  const existingUsers = await db
    .select({ id: user.id })
    .from(user)
    .limit(1);
  let actorUserId = existingUsers[0]?.id;

  if (!actorUserId) {
    const credentials = await createTestUser();
    const users = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, credentials.email));
    actorUserId = users[0]?.id;
  }
  if (!actorUserId) {
    throw new Error("Gagal membuat admin uji");
  }

  return {
    reservationId,
    actorUserId,
    packagePriceRupiah,
    customerId,
  };
}
