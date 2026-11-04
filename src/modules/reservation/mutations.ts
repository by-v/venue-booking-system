import { randomUUID } from "node:crypto";

import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  bookingCounter,
  customer,
  dateLock,
  packageTable,
  payment,
  reservation,
  reservationActivity,
  reservationItem,
  reservationStatusHistory,
  rescheduleHistory,
  setupNote,
} from "@/lib/db/schema";
import { formatRupiah } from "@/lib/format";
import {
  addDays,
  isBookableDate,
  lockDatesForEvent,
  todayInJakarta,
} from "@/modules/availability/dates";

import {
  bookingNumberYear,
  formatBookingNumber,
} from "./booking-number";
import { ReservationError } from "./errors";
import {
  evaluateAutoCancellationCandidate,
  isReservationCompletionDue,
} from "./lifecycle";
import {
  paymentDueDate,
  resolvePaymentDueDate,
  shortNoticePaymentDueDate,
} from "./payment-deadline";
import { calculateMinimumDp, calculateReservationTotal } from "./pricing";
import { rescheduleDeadline } from "./reschedule";
import type {
  AcceptedReservationCancellationInput,
  AdminReservationInput,
  ReservationCancellationInput,
  ReservationConfirmationInput,
  ReservationDataUpdateInput,
  ReservationItemInput,
  ReservationRescheduleInput,
  ReservationSubmissionInput,
  ReservationSuspensionInput,
  SetupNoteInput,
} from "./schema";
import {
  CANCELLATION_REASON_CODES,
  type ActorType,
  type CancellationReasonCode,
  type ReservationActivityType,
  type ReservationSource,
  type ReservationStatus,
} from "./types";

/**
 * Mutasi domain reservasi (design RS-4). Tidak memanggil helper sesi; proteksi
 * admin dilakukan di Server Action. Pengajuan PENDING tidak menulis
 * `date_lock` dan tidak membuat nomor booking.
 */

export interface AddFollowUpNoteInput {
  reservationId: string;
  note: string;
  actorUserId: string;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const FINAL_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  "DIBATALKAN",
  "AUTO_CANCELLED",
  "SELESAI",
];

const MAX_RUPIAH = 2_147_483_647;

function assertPositiveAmount(amountRupiah: number): void {
  if (
    !Number.isInteger(amountRupiah) ||
    amountRupiah <= 0 ||
    amountRupiah > MAX_RUPIAH
  ) {
    throw new ReservationError("INVALID_AMOUNT");
  }
}

function assertDescription(description: string): string {
  const normalized = description.trim();
  if (normalized.length === 0 || normalized.length > 200) {
    throw new ReservationError("INVALID_DESCRIPTION");
  }
  return normalized;
}

function assertSetupNote(note: string): string {
  const normalized = note.trim();
  if (normalized.length === 0 || normalized.length > 1000) {
    throw new ReservationError("INVALID_SETUP_NOTE");
  }
  return normalized;
}

function assertReason(reason: string): string {
  const normalized = reason.trim();
  if (normalized.length === 0) {
    throw new ReservationError("REASON_REQUIRED");
  }
  return normalized;
}

function assertNotFinal(status: ReservationStatus): void {
  if (FINAL_RESERVATION_STATUSES.includes(status)) {
    throw new ReservationError("INVALID_STATE");
  }
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  let current: unknown = error;

  while (current !== null && typeof current === "object") {
    const candidate = current as {
      cause?: unknown;
      code?: unknown;
      constraint?: unknown;
    };
    if (candidate.code === "23505" && candidate.constraint === constraint) {
      return true;
    }

    if (candidate.cause === current) {
      break;
    }
    current = candidate.cause;
  }

  return false;
}

async function lockReservation(tx: Transaction, reservationId: string) {
  const rows = await tx
    .select({
      id: reservation.id,
      customerId: reservation.customerId,
      packageId: reservation.packageId,
      eventDate: reservation.eventDate,
      status: reservation.status,
      packagePriceRupiah: reservation.packagePriceRupiah,
      rescheduleCount: reservation.rescheduleCount,
      paymentDueDateOverride: reservation.paymentDueDateOverride,
    })
    .from(reservation)
    .where(eq(reservation.id, reservationId))
    .limit(1)
    .for("update");

  const row = rows[0];
  if (!row) {
    throw new ReservationError("RESERVATION_NOT_FOUND");
  }

  return {
    ...row,
    status: row.status as ReservationStatus,
  };
}

async function reservationTotal(
  tx: Transaction,
  reservationId: string,
  packagePriceRupiah: number,
): Promise<number> {
  const items = await tx
    .select({ amountRupiah: reservationItem.amountRupiah })
    .from(reservationItem)
    .where(eq(reservationItem.reservationId, reservationId));

  return calculateReservationTotal(
    packagePriceRupiah,
    items.map((item) => item.amountRupiah),
  );
}

async function verifiedPaymentTotal(
  tx: Transaction,
  reservationId: string,
): Promise<number> {
  const rows = await tx
    .select({ amountRupiah: payment.amountRupiah })
    .from(payment)
    .where(
      and(
        eq(payment.reservationId, reservationId),
        eq(payment.verificationStatus, "TERVERIFIKASI"),
      ),
    );

  return rows.reduce((total, row) => total + row.amountRupiah, 0);
}

async function insertActivity(
  tx: Transaction,
  input: {
    reservationId: string;
    type: ReservationActivityType;
    note: string;
    actorUserId: string;
  },
): Promise<void> {
  await tx.insert(reservationActivity).values({
    id: randomUUID(),
    reservationId: input.reservationId,
    type: input.type,
    note: input.note,
    actorType: "ADMIN",
    actorUserId: input.actorUserId,
    isSubstantive: true,
  });
}

interface PersistReservationParams {
  input: ReservationSubmissionInput;
  source: ReservationSource;
  actorType: ActorType;
  actorUserId: string | null;
  historyReason: string;
}

async function persistReservation(
  tx: Transaction,
  params: PersistReservationParams,
): Promise<string> {
  const { input } = params;

  const packageRows = await tx
    .select({
      id: packageTable.id,
      name: packageTable.name,
      priceRupiah: packageTable.priceRupiah,
      durationHours: packageTable.durationHours,
      sessionCount: packageTable.sessionCount,
      setupDaysBefore: packageTable.setupDaysBefore,
    })
    .from(packageTable)
    .where(
      and(
        eq(packageTable.id, input.packageId),
        eq(packageTable.active, true),
      ),
    )
    .limit(1);

  const selectedPackage = packageRows[0];
  if (!selectedPackage) {
    throw new ReservationError("PACKAGE_UNAVAILABLE");
  }

  const today = todayInJakarta();
  if (!isBookableDate(input.eventDate, today)) {
    throw new ReservationError("DATE_NOT_BOOKABLE");
  }

  const firstLockedDate = addDays(
    input.eventDate,
    -selectedPackage.setupDaysBefore,
  );
  const locks = await tx
    .select({ date: dateLock.date })
    .from(dateLock)
    .where(
      and(
        gte(dateLock.date, firstLockedDate),
        lte(dateLock.date, input.eventDate),
      ),
    )
    .limit(1);

  if (locks.length > 0) {
    throw new ReservationError("DATE_NOT_BOOKABLE");
  }

  const customerRows = await tx
    .insert(customer)
    .values({
      id: randomUUID(),
      name: input.name,
      whatsapp: input.whatsapp,
    })
    .onConflictDoUpdate({
      target: customer.whatsapp,
      set: {
        name: input.name,
        updatedAt: new Date(),
      },
    })
    .returning({ id: customer.id });

  const selectedCustomer = customerRows[0];
  if (!selectedCustomer) {
    throw new Error("Gagal menyimpan customer");
  }

  const reservationId = randomUUID();
  await tx.insert(reservation).values({
    id: reservationId,
    customerId: selectedCustomer.id,
    packageId: selectedPackage.id,
    packageName: selectedPackage.name,
    packagePriceRupiah: selectedPackage.priceRupiah,
    packageDurationHours: selectedPackage.durationHours,
    packageSessionCount: selectedPackage.sessionCount,
    eventDate: input.eventDate,
    eventType: input.eventType,
    address: input.address,
    notes: input.notes,
    status: "PENDING",
    source: params.source,
  });

  await tx.insert(reservationStatusHistory).values({
    id: randomUUID(),
    reservationId,
    fromStatus: null,
    toStatus: "PENDING",
    reason: params.historyReason,
    actorType: params.actorType,
    actorUserId: params.actorUserId,
  });

  await tx.insert(reservationActivity).values({
    id: randomUUID(),
    reservationId,
    type: "SUBMISSION",
    note: null,
    actorType: params.actorType,
    actorUserId: params.actorUserId,
    isSubstantive: true,
  });

  return reservationId;
}

export async function submitReservation(
  input: ReservationSubmissionInput,
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const id = await persistReservation(tx, {
      input,
      source: "FORM_PUBLIK",
      actorType: "CUSTOMER",
      actorUserId: null,
      historyReason: "Pengajuan form publik",
    });
    return { id };
  });
}

export async function createAdminReservation(
  input: AdminReservationInput & { actorUserId: string },
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const id = await persistReservation(tx, {
      input,
      source: "INPUT_ADMIN",
      actorType: "ADMIN",
      actorUserId: input.actorUserId,
      historyReason: "Input admin langsung",
    });
    return { id };
  });
}

export async function addReservationItem(
  input: ReservationItemInput & { actorUserId: string },
): Promise<void> {
  assertPositiveAmount(input.amountRupiah);
  const description = assertDescription(input.description);

  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    assertNotFinal(locked.status);

    await tx.insert(reservationItem).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      description,
      amountRupiah: input.amountRupiah,
    });

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "ITEM_ADDED",
      note: `Item biaya "${description}" ditambahkan (${formatRupiah(input.amountRupiah)}).`,
      actorUserId: input.actorUserId,
    });
  });
}

/**
 * Tombol "Sudah DP": mencatat kekurangan pembayaran sampai DP minimum 25%
 * terpenuhi. Jika sudah ada pembayaran sebagian, nominal yang dicatat adalah
 * selisihnya.
 */
export async function markDownPayment(input: {
  reservationId: string;
  actorUserId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    assertNotFinal(locked.status);

    const total = await reservationTotal(
      tx,
      input.reservationId,
      locked.packagePriceRupiah,
    );
    const paidTotal = await verifiedPaymentTotal(tx, input.reservationId);
    const minimumDp = calculateMinimumDp(total);

    if (paidTotal >= total) {
      throw new ReservationError("PAYMENT_ALREADY_SETTLED");
    }

    const amountRupiah = minimumDp - paidTotal;
    if (amountRupiah <= 0) {
      throw new ReservationError("INVALID_STATE");
    }

    await tx.insert(payment).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      amountRupiah,
      verificationStatus: "TERVERIFIKASI",
      verificationReason: null,
      verifiedByUserId: input.actorUserId,
      recordedByUserId: input.actorUserId,
      statusChangedAt: new Date(),
    });

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "PAYMENT_RECORDED",
      note: `DP 25% diterima (${formatRupiah(amountRupiah)}).`,
      actorUserId: input.actorUserId,
    });
  });
}

/**
 * Tombol "Lunas": mencatat seluruh sisa pembayaran. Boleh dipakai tanpa DP
 * lebih dulu untuk customer yang langsung membayar penuh.
 */
export async function markPaidOff(input: {
  reservationId: string;
  actorUserId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    assertNotFinal(locked.status);

    const total = await reservationTotal(
      tx,
      input.reservationId,
      locked.packagePriceRupiah,
    );
    const paidTotal = await verifiedPaymentTotal(tx, input.reservationId);

    if (paidTotal >= total) {
      throw new ReservationError("PAYMENT_ALREADY_SETTLED");
    }

    const amountRupiah = total - paidTotal;

    await tx.insert(payment).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      amountRupiah,
      verificationStatus: "TERVERIFIKASI",
      verificationReason: null,
      verifiedByUserId: input.actorUserId,
      recordedByUserId: input.actorUserId,
      statusChangedAt: new Date(),
    });

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "PAYMENT_RECORDED",
      note: `Pelunasan diterima (${formatRupiah(amountRupiah)}).`,
      actorUserId: input.actorUserId,
    });
  });
}

export async function recordManualPayment(input: {
  reservationId: string;
  actorUserId: string;
  amountRupiah: number;
  reason?: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    assertNotFinal(locked.status);

    const total = await reservationTotal(
      tx,
      input.reservationId,
      locked.packagePriceRupiah,
    );
    const paidTotal = await verifiedPaymentTotal(tx, input.reservationId);

    // Validasi: nominal harus positif dan tidak boleh melebihi total jika sudah lunas
    if (input.amountRupiah <= 0) {
      throw new ReservationError("INVALID_AMOUNT");
    }

    if (paidTotal + input.amountRupiah > total) {
      throw new ReservationError("PAYMENT_EXCEEDS_TOTAL");
    }

    await tx.insert(payment).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      amountRupiah: input.amountRupiah,
      verificationStatus: "TERVERIFIKASI",
      verificationReason: input.reason ?? null,
      verifiedByUserId: input.actorUserId,
      recordedByUserId: input.actorUserId,
      statusChangedAt: new Date(),
    });

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "PAYMENT_RECORDED",
      note: "Pembayaran manual Rp" + formatRupiah(input.amountRupiah) + " oleh admin.",
      actorUserId: input.actorUserId,
    });
  });
}
export async function confirmReservation(
  input: ReservationConfirmationInput & { actorUserId: string },
): Promise<{ bookingNumber: string }> {
  return db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    if (locked.status !== "PENDING" && locked.status !== "DITANGGUHKAN") {
      throw new ReservationError("INVALID_STATE");
    }

    const total = await reservationTotal(
      tx,
      input.reservationId,
      locked.packagePriceRupiah,
    );
    const verifiedTotal = await verifiedPaymentTotal(tx, input.reservationId);
    const minimumDp = calculateMinimumDp(total);
    if (verifiedTotal < minimumDp) {
      throw new ReservationError("DP_BELOW_MINIMUM");
    }

    const packageRows = await tx
      .select({ setupDaysBefore: packageTable.setupDaysBefore })
      .from(packageTable)
      .where(eq(packageTable.id, locked.packageId))
      .limit(1);
    const selectedPackage = packageRows[0];
    if (!selectedPackage) {
      throw new ReservationError("PACKAGE_UNAVAILABLE");
    }

    const lockDates = lockDatesForEvent({
      eventDate: locked.eventDate,
      setupDaysBefore: selectedPackage.setupDaysBefore,
    });

    const conflictingLocks = await tx
      .select({ date: dateLock.date })
      .from(dateLock)
      .where(
        inArray(
          dateLock.date,
          lockDates.map((lock) => lock.date),
        ),
      )
      .limit(1);
    if (conflictingLocks.length > 0) {
      throw new ReservationError("DATE_CONFLICT");
    }

    try {
      await tx.insert(dateLock).values(
        lockDates.map((lock) => ({
          date: lock.date,
          kind: lock.kind,
          reservationId: input.reservationId,
        })),
      );
    } catch (error) {
      if (isUniqueViolation(error, "date_lock_pkey")) {
        throw new ReservationError("DATE_CONFLICT");
      }
      throw error;
    }

    const year = bookingNumberYear();
    const counterRows = await tx
      .insert(bookingCounter)
      .values({ year: Number(year), lastSequence: 1 })
      .onConflictDoUpdate({
        target: bookingCounter.year,
        set: {
          lastSequence: sql`${bookingCounter.lastSequence} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({ lastSequence: bookingCounter.lastSequence });

    const sequence = counterRows[0]?.lastSequence;
    if (!sequence) {
      throw new Error("Gagal mengambil urutan nomor booking");
    }
    const bookingNumber = formatBookingNumber(year, sequence);

    const today = todayInJakarta();
    let paymentDueDateOverride = locked.paymentDueDateOverride;
    if (!paymentDueDateOverride && paymentDueDate(locked.eventDate) < today) {
      paymentDueDateOverride = shortNoticePaymentDueDate(
        locked.eventDate,
        today,
      );
    }

    await tx
      .update(reservation)
      .set({
        status: "DITERIMA",
        bookingNumber,
        paymentDueDateOverride,
      })
      .where(eq(reservation.id, input.reservationId));

    await tx
      .update(customer)
      .set({ status: "CLIENT" })
      .where(eq(customer.id, locked.customerId));

    await tx.insert(reservationStatusHistory).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      fromStatus: locked.status,
      toStatus: "DITERIMA",
      reason: `Konfirmasi admin: DP terverifikasi ${formatRupiah(verifiedTotal)} memenuhi minimum ${formatRupiah(minimumDp)} dan tanggal tersedia.`,
      reasonCode: null,
      actorType: "ADMIN",
      actorUserId: input.actorUserId,
    });

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "STATUS_CHANGE",
      note: `Status diubah dari ${locked.status} menjadi DITERIMA. Nomor booking ${bookingNumber}.`,
      actorUserId: input.actorUserId,
    });

    return { bookingNumber };
  });
}

export async function rescheduleReservation(
  input: ReservationRescheduleInput & { actorUserId: string },
): Promise<void> {
  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    if (locked.status !== "DITERIMA") {
      throw new ReservationError("INVALID_STATE");
    }
    if (locked.rescheduleCount >= 1) {
      throw new ReservationError("RESCHEDULE_LIMIT_REACHED");
    }

    const today = todayInJakarta();
    if (today > rescheduleDeadline(locked.eventDate)) {
      throw new ReservationError("RESCHEDULE_DEADLINE_PASSED");
    }
    if (
      !isBookableDate(input.newEventDate, today) ||
      input.newEventDate === locked.eventDate
    ) {
      throw new ReservationError("DATE_NOT_BOOKABLE");
    }

    const packageRows = await tx
      .select({ setupDaysBefore: packageTable.setupDaysBefore })
      .from(packageTable)
      .where(eq(packageTable.id, locked.packageId))
      .limit(1);
    const selectedPackage = packageRows[0];
    if (!selectedPackage) {
      throw new ReservationError("PACKAGE_UNAVAILABLE");
    }

    const newLockDates = lockDatesForEvent({
      eventDate: input.newEventDate,
      setupDaysBefore: selectedPackage.setupDaysBefore,
    });

    const conflictingLocks = await tx
      .select({ date: dateLock.date })
      .from(dateLock)
      .where(
        and(
          inArray(
            dateLock.date,
            newLockDates.map((lock) => lock.date),
          ),
          sql`${dateLock.reservationId} is distinct from ${input.reservationId}`,
        ),
      )
      .limit(1);
    if (conflictingLocks.length > 0) {
      throw new ReservationError("DATE_CONFLICT");
    }

    await tx
      .delete(dateLock)
      .where(eq(dateLock.reservationId, input.reservationId));

    try {
      await tx.insert(dateLock).values(
        newLockDates.map((lock) => ({
          date: lock.date,
          kind: lock.kind,
          reservationId: input.reservationId,
        })),
      );
    } catch (error) {
      if (isUniqueViolation(error, "date_lock_pkey")) {
        throw new ReservationError("DATE_CONFLICT");
      }
      throw error;
    }

    let paymentDueDateOverride = locked.paymentDueDateOverride;
    if (
      paymentDueDateOverride &&
      paymentDueDateOverride > input.newEventDate
    ) {
      paymentDueDateOverride = null;
    }
    if (
      !paymentDueDateOverride &&
      paymentDueDate(input.newEventDate) < today
    ) {
      paymentDueDateOverride = shortNoticePaymentDueDate(
        input.newEventDate,
        today,
      );
    }

    await tx
      .update(reservation)
      .set({
        eventDate: input.newEventDate,
        rescheduleCount: 1,
        paymentDueDateOverride,
      })
      .where(eq(reservation.id, input.reservationId));

    try {
      await tx.insert(rescheduleHistory).values({
        id: randomUUID(),
        reservationId: input.reservationId,
        oldEventDate: locked.eventDate,
        newEventDate: input.newEventDate,
        actorUserId: input.actorUserId,
      });
    } catch (error) {
      if (
        isUniqueViolation(error, "reschedule_history_reservation_unique")
      ) {
        throw new ReservationError("RESCHEDULE_LIMIT_REACHED");
      }
      throw error;
    }

    await tx.insert(reservationStatusHistory).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      fromStatus: "DITERIMA",
      toStatus: "DITERIMA",
      reason: `Reschedule dari ${locked.eventDate} ke ${input.newEventDate}.`,
      reasonCode: null,
      actorType: "ADMIN",
      actorUserId: input.actorUserId,
    });

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "STATUS_CHANGE",
      note: `Reschedule dari ${locked.eventDate} ke ${input.newEventDate}.`,
      actorUserId: input.actorUserId,
    });
  });
}

export async function suspendReservation(
  input: ReservationSuspensionInput & { actorUserId: string },
): Promise<void> {
  const reason = assertReason(input.reason);

  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    if (locked.status !== "PENDING") {
      throw new ReservationError("INVALID_STATE");
    }

    await tx
      .update(reservation)
      .set({ status: "DITANGGUHKAN" })
      .where(eq(reservation.id, input.reservationId));

    await tx.insert(reservationStatusHistory).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      fromStatus: "PENDING",
      toStatus: "DITANGGUHKAN",
      reason,
      reasonCode: null,
      actorType: "ADMIN",
      actorUserId: input.actorUserId,
    });

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "STATUS_CHANGE",
      note: `Status diubah dari PENDING menjadi DITANGGUHKAN: ${reason}`,
      actorUserId: input.actorUserId,
    });
  });
}

export async function cancelReservation(
  input: ReservationCancellationInput & { actorUserId: string },
): Promise<void> {
  const reason = assertReason(input.reason);
  const reasonCode: CancellationReasonCode = input.reasonCode;
  if (!CANCELLATION_REASON_CODES.includes(reasonCode)) {
    throw new ReservationError("INVALID_REASON_CODE");
  }

  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    if (locked.status !== "PENDING" && locked.status !== "DITANGGUHKAN") {
      throw new ReservationError("INVALID_STATE");
    }

    await tx
      .update(reservation)
      .set({ status: "DIBATALKAN" })
      .where(eq(reservation.id, input.reservationId));

    await tx.insert(reservationStatusHistory).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      fromStatus: locked.status,
      toStatus: "DIBATALKAN",
      reason,
      reasonCode,
      actorType: "ADMIN",
      actorUserId: input.actorUserId,
    });

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "STATUS_CHANGE",
      note: `Status diubah dari ${locked.status} menjadi DIBATALKAN: ${reason}`,
      actorUserId: input.actorUserId,
    });
  });
}

export async function cancelAcceptedReservation(
  input: AcceptedReservationCancellationInput & { actorUserId: string },
): Promise<void> {
  const reason = assertReason(input.reason);
  if (input.reasonCode !== "MUNDUR_CUSTOMER") {
    throw new ReservationError("INVALID_REASON_CODE");
  }

  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    if (locked.status !== "DITERIMA") {
      throw new ReservationError("INVALID_STATE");
    }

    await tx
      .delete(dateLock)
      .where(eq(dateLock.reservationId, input.reservationId));

    await tx
      .update(reservation)
      .set({ status: "DIBATALKAN", dpForfeited: true })
      .where(eq(reservation.id, input.reservationId));

    await tx.insert(reservationStatusHistory).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      fromStatus: "DITERIMA",
      toStatus: "DIBATALKAN",
      reason,
      reasonCode: "MUNDUR_CUSTOMER",
      actorType: "ADMIN",
      actorUserId: input.actorUserId,
    });

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "STATUS_CHANGE",
      note: `Reservasi DITERIMA dibatalkan oleh customer: ${reason}. DP hangus.`,
      actorUserId: input.actorUserId,
    });
  });
}

export async function addFollowUpNote({
  reservationId,
  note,
  actorUserId,
}: AddFollowUpNoteInput): Promise<void> {
  const rows = await db
    .select({ status: reservation.status })
    .from(reservation)
    .where(eq(reservation.id, reservationId))
    .limit(1);

  const selected = rows[0];
  if (!selected) {
    throw new ReservationError("RESERVATION_NOT_FOUND");
  }
  if (selected.status !== "PENDING" && selected.status !== "DITANGGUHKAN") {
    throw new ReservationError("INVALID_STATE");
  }

  await db.insert(reservationActivity).values({
    id: randomUUID(),
    reservationId,
    type: "FOLLOW_UP_NOTE",
    note,
    actorType: "ADMIN",
    actorUserId,
    isSubstantive: true,
  });
}

export async function saveSetupNote(
  input: SetupNoteInput & { actorUserId: string },
): Promise<void> {
  const note = assertSetupNote(input.note);

  await db.transaction(async (tx) => {
    await lockReservation(tx, input.reservationId);

    const existing = await tx
      .select({ id: setupNote.id })
      .from(setupNote)
      .where(eq(setupNote.reservationId, input.reservationId))
      .limit(1);

    const now = new Date();
    if (existing[0]) {
      await tx
        .update(setupNote)
        .set({
          note,
          updatedByUserId: input.actorUserId,
          updatedAt: now,
        })
        .where(eq(setupNote.reservationId, input.reservationId));
      return;
    }

    await tx.insert(setupNote).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      note,
      updatedByUserId: input.actorUserId,
      createdAt: now,
      updatedAt: now,
    });
  });
}

/**
 * Pembatalan reservasi DITERIMA karena pelunasan terlambat (BR-08, BR-23).
 * Admin harus memilih keputusan DP (HANGUS atau TIDAK_HANGUS).
 */
export async function cancelReservationForLatePayment(input: {
  reservationId: string;
  reason: string;
  dpDecision: "HANGUS" | "TIDAK_HANGUS";
  actorUserId: string;
}): Promise<void> {
  const reason = assertReason(input.reason);

  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    if (locked.status !== "DITERIMA") {
      throw new ReservationError("INVALID_STATE");
    }

    const today = todayInJakarta();
    const effectiveDeadline = resolvePaymentDueDate(
      locked.eventDate,
      locked.paymentDueDateOverride,
    );

    if (today <= effectiveDeadline) {
      throw new ReservationError("PAYMENT_DEADLINE_NOT_PASSED");
    }

    const total = await reservationTotal(
      tx,
      input.reservationId,
      locked.packagePriceRupiah,
    );
    const verifiedTotal = await verifiedPaymentTotal(tx, input.reservationId);

    if (verifiedTotal >= total) {
      throw new ReservationError("PAYMENT_ALREADY_SETTLED");
    }

    const dpForfeited = input.dpDecision === "HANGUS";

    await tx
      .update(reservation)
      .set({
        status: "DIBATALKAN",
        dpForfeited,
      })
      .where(eq(reservation.id, input.reservationId));

    await tx.insert(reservationStatusHistory).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      fromStatus: "DITERIMA",
      toStatus: "DIBATALKAN",
      reason,
      reasonCode: "PELUNASAN_TERLAMBAT",
      actorType: "ADMIN",
      actorUserId: input.actorUserId,
    });

    await tx
      .delete(dateLock)
      .where(eq(dateLock.reservationId, input.reservationId));

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "STATUS_CHANGE",
      note: `Reservasi dibatalkan: Pelunasan terlambat. DP ${
        dpForfeited ? "hangus" : "tidak hangus"
      }.`,
      actorUserId: input.actorUserId,
    });
  });
}

/**
 * Update batas pelunasan manual oleh admin.
 * Override tanggal H-14 default.
 */
export async function updatePaymentDueDate(input: {
  reservationId: string;
  paymentDueDate: string | null;
  actorUserId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);

    if (input.paymentDueDate && input.paymentDueDate > locked.eventDate) {
      throw new ReservationError("INVALID_PAYMENT_DUE_DATE");
    }

    await tx
      .update(reservation)
      .set({ paymentDueDateOverride: input.paymentDueDate })
      .where(eq(reservation.id, input.reservationId));

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "DATA_UPDATED",
      note: input.paymentDueDate
        ? `Batas pelunasan disesuaikan menjadi ${input.paymentDueDate}.`
        : "Batas pelunasan dikembalikan ke default H-14.",
      actorUserId: input.actorUserId,
    });
  });
}

/**
 * Update data reservasi oleh admin (nama, WhatsApp, tanggal, paket, alamat,
 * jenis acara, catatan).
 */
export async function updateReservationData(
  input: ReservationDataUpdateInput & { actorUserId: string },
): Promise<void> {
  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    assertNotFinal(locked.status);

    const today = todayInJakarta();
    const updates: Partial<typeof reservation.$inferInsert> = {};

    if (input.name !== undefined || input.whatsapp !== undefined) {
      const customerUpdates: Partial<typeof customer.$inferInsert> = {};
      if (input.name !== undefined) {
        const trimmed = input.name.trim();
        if (trimmed.length < 2) {
          throw new ReservationError("INVALID_CUSTOMER_NAME");
        }
        customerUpdates.name = trimmed;
      }
      if (input.whatsapp !== undefined) {
        const existing = await tx
          .select({ id: customer.id })
          .from(customer)
          .where(eq(customer.whatsapp, input.whatsapp))
          .limit(1);
        if (existing[0] && existing[0].id !== locked.customerId) {
          throw new ReservationError("CUSTOMER_WHATSAPP_TAKEN");
        }
        customerUpdates.whatsapp = input.whatsapp;
      }
      await tx
        .update(customer)
        .set(customerUpdates)
        .where(eq(customer.id, locked.customerId));
    }

    if (input.address !== undefined) {
      const trimmed = input.address.trim();
      if (trimmed.length < 10) {
        throw new ReservationError("INVALID_ADDRESS");
      }
      updates.address = trimmed;
    }

    if (input.eventType !== undefined) {
      updates.eventType = input.eventType;
    }

    if (input.notes !== undefined) {
      const trimmed = input.notes.trim();
      updates.notes = trimmed.length > 0 ? trimmed : null;
    }

    let nextSetupDaysBefore: number | null = null;
    if (input.packageId !== undefined && input.packageId !== locked.packageId) {
      const pkgRows = await tx
        .select({
          id: packageTable.id,
          name: packageTable.name,
          priceRupiah: packageTable.priceRupiah,
          durationHours: packageTable.durationHours,
          sessionCount: packageTable.sessionCount,
          setupDaysBefore: packageTable.setupDaysBefore,
        })
        .from(packageTable)
        .where(eq(packageTable.id, input.packageId))
        .limit(1);

      const selectedPackage = pkgRows[0];
      if (!selectedPackage) {
        throw new ReservationError("PACKAGE_NOT_FOUND");
      }

      updates.packageId = selectedPackage.id;
      updates.packageName = selectedPackage.name;
      updates.packagePriceRupiah = selectedPackage.priceRupiah;
      updates.packageDurationHours = selectedPackage.durationHours;
      updates.packageSessionCount = selectedPackage.sessionCount;
      nextSetupDaysBefore = selectedPackage.setupDaysBefore;

      const verifiedTotal = await verifiedPaymentTotal(
        tx,
        input.reservationId,
      );
      const itemRows = await tx
        .select({ amountRupiah: reservationItem.amountRupiah })
        .from(reservationItem)
        .where(eq(reservationItem.reservationId, input.reservationId));
      const nextTotal = calculateReservationTotal(
        selectedPackage.priceRupiah,
        itemRows.map((item) => item.amountRupiah),
      );
      if (nextTotal < verifiedTotal) {
        throw new ReservationError("TOTAL_BELOW_VERIFIED_PAYMENT");
      }
    }

    if (input.eventDate !== undefined) {
      if (input.eventDate < today) {
        throw new ReservationError("INVALID_EVENT_DATE");
      }

      updates.eventDate = input.eventDate;

      if (input.eventDate !== locked.eventDate) {
        let nextOverride = locked.paymentDueDateOverride;
        if (nextOverride && nextOverride > input.eventDate) {
          nextOverride = null;
        }
        if (!nextOverride && paymentDueDate(input.eventDate) < today) {
          nextOverride = shortNoticePaymentDueDate(input.eventDate, today);
        }
        updates.paymentDueDateOverride = nextOverride;
      }
    }

    const finalEventDate = input.eventDate ?? locked.eventDate;
    const eventDateChanged = input.eventDate !== undefined &&
      input.eventDate !== locked.eventDate;
    const packageChanged = nextSetupDaysBefore !== null;

    if (
      locked.status === "DITERIMA" &&
      (eventDateChanged || packageChanged)
    ) {
      let setupDaysBefore = nextSetupDaysBefore;
      if (setupDaysBefore === null) {
        const pkgRows = await tx
          .select({ setupDaysBefore: packageTable.setupDaysBefore })
          .from(packageTable)
          .where(eq(packageTable.id, locked.packageId))
          .limit(1);
        setupDaysBefore = pkgRows[0]?.setupDaysBefore ?? 0;
      }

      const lockDates = lockDatesForEvent({
        eventDate: finalEventDate,
        setupDaysBefore,
      });

      await tx
        .delete(dateLock)
        .where(eq(dateLock.reservationId, input.reservationId));

      const conflictingLocks = await tx
        .select({ date: dateLock.date })
        .from(dateLock)
        .where(
          inArray(
            dateLock.date,
            lockDates.map((lock) => lock.date),
          ),
        )
        .limit(1);
      if (conflictingLocks.length > 0) {
        throw new ReservationError("DATE_CONFLICT");
      }

      await tx.insert(dateLock).values(
        lockDates.map((lock) => ({
          date: lock.date,
          kind: lock.kind,
          reservationId: input.reservationId,
        })),
      );
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    await tx
      .update(reservation)
      .set(updates)
      .where(eq(reservation.id, input.reservationId));

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "DATA_UPDATED",
      note: "Data reservasi diperbarui.",
      actorUserId: input.actorUserId,
    });
  });
}

export async function completeReservation(input: {
  reservationId: string;
  actorUserId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const locked = await lockReservation(tx, input.reservationId);
    if (locked.status !== "DITERIMA") {
      throw new ReservationError("COMPLETION_NOT_ALLOWED");
    }

    const today = todayInJakarta();
    if (
      !isReservationCompletionDue({
        status: locked.status,
        eventDate: locked.eventDate,
        today,
      })
    ) {
      throw new ReservationError("EVENT_DATE_NOT_PASSED");
    }

    const total = await reservationTotal(
      tx,
      input.reservationId,
      locked.packagePriceRupiah,
    );
    const verifiedTotal = await verifiedPaymentTotal(tx, input.reservationId);
    const flagForRemaining = total - verifiedTotal > 0;

    await tx
      .update(reservation)
      .set({
        status: "SELESAI",
        ...(flagForRemaining ? { perluPemeriksaanAdmin: true } : {}),
      })
      .where(eq(reservation.id, input.reservationId));

    await tx.insert(reservationStatusHistory).values({
      id: randomUUID(),
      reservationId: input.reservationId,
      fromStatus: "DITERIMA",
      toStatus: "SELESAI",
      reason: "Ditandai selesai oleh admin.",
      reasonCode: null,
      actorType: "ADMIN",
      actorUserId: input.actorUserId,
    });

    await insertActivity(tx, {
      reservationId: input.reservationId,
      type: "STATUS_CHANGE",
      note: "Status diubah dari DITERIMA menjadi SELESAI: ditandai selesai oleh admin.",
      actorUserId: input.actorUserId,
    });
  });
}

export interface ReservationLifecycleSummary {
  today: string;
  cancelled: number;
  flagged: number;
  completed: number;
}

/**
 * Jalankan aturan lifecycle BR-17 dan BR-13 untuk satu tanggal acuan WIB.
 * Transaksi mengunci baris dengan `SKIP LOCKED` agar eksekusi bersamaan tidak
 * memproses reservasi yang sama dua kali. Job tidak menulis aktivitas.
 */
export async function runReservationLifecycle({
  today = todayInJakarta(),
}: {
  today?: string;
} = {}): Promise<ReservationLifecycleSummary> {
  return db.transaction(async (tx) => {
    const lastSubstantiveActivityAt = sql<Date | null>`(
      select max(${reservationActivity.createdAt})
      from ${reservationActivity}
      where ${reservationActivity.reservationId} = ${sql.raw('"reservation"."id"')}
        and ${reservationActivity.isSubstantive} = true
    )`;
    const hasProtectingPayment = sql<boolean>`exists (
      select 1
      from ${payment}
      where ${payment.reservationId} = ${sql.raw('"reservation"."id"')}
        and ${payment.verificationStatus} = 'TERVERIFIKASI'
    )`;

    const rows = await tx
      .select({
        id: reservation.id,
        status: reservation.status,
        eventDate: reservation.eventDate,
        packagePriceRupiah: reservation.packagePriceRupiah,
        createdAt: reservation.createdAt,
        perluPemeriksaanAdmin: reservation.perluPemeriksaanAdmin,
        lastSubstantiveActivityAt,
        hasProtectingPayment,
      })
      .from(reservation)
      .where(
        inArray(reservation.status, [
          "PENDING",
          "DITANGGUHKAN",
          "DITERIMA",
        ]),
      )
      .orderBy(asc(reservation.id))
      .for("update", { skipLocked: true });

    const summary: ReservationLifecycleSummary = {
      today,
      cancelled: 0,
      flagged: 0,
      completed: 0,
    };

    for (const row of rows) {
      const status = row.status as ReservationStatus;

      if (status === "DITERIMA") {
        if (
          !isReservationCompletionDue({
            status,
            eventDate: row.eventDate,
            today,
          })
        ) {
          continue;
        }

        const total = await reservationTotal(
          tx,
          row.id,
          row.packagePriceRupiah,
        );
        const verifiedTotal = await verifiedPaymentTotal(tx, row.id);
        const flagForRemaining =
          total - verifiedTotal > 0 && !row.perluPemeriksaanAdmin;

        const completedRows = await tx
          .update(reservation)
          .set({
            status: "SELESAI",
            ...(flagForRemaining ? { perluPemeriksaanAdmin: true } : {}),
          })
          .where(
            and(
              eq(reservation.id, row.id),
              eq(reservation.status, "DITERIMA"),
            ),
          )
          .returning({ id: reservation.id });

        if (completedRows.length === 0) {
          continue;
        }

        await tx.insert(reservationStatusHistory).values({
          id: randomUUID(),
          reservationId: row.id,
          fromStatus: "DITERIMA",
          toStatus: "SELESAI",
          reason: "Penyelesaian otomatis: tanggal acara sudah lewat.",
          reasonCode: null,
          actorType: "SYSTEM",
          actorUserId: null,
        });

        summary.completed += 1;
        if (flagForRemaining) {
          summary.flagged += 1;
        }
        continue;
      }

      const candidate = evaluateAutoCancellationCandidate({
        status,
        eventDate: row.eventDate,
        createdAt: row.createdAt,
        lastSubstantiveActivityAt: row.lastSubstantiveActivityAt
          ? new Date(row.lastSubstantiveActivityAt)
          : null,
        today,
      });

      if (!candidate.candidate || !candidate.reasonCode) {
        continue;
      }

      if (row.hasProtectingPayment) {
        if (row.perluPemeriksaanAdmin) {
          continue;
        }

        const flaggedRows = await tx
          .update(reservation)
          .set({ perluPemeriksaanAdmin: true })
          .where(
            and(
              eq(reservation.id, row.id),
              eq(reservation.perluPemeriksaanAdmin, false),
            ),
          )
          .returning({ id: reservation.id });

        if (flaggedRows.length > 0) {
          summary.flagged += 1;
        }
        continue;
      }

      const reason =
        candidate.reasonCode === "INACTIVITY_3M"
          ? "Pembatalan otomatis: tidak ada aktivitas substantif selama tiga bulan."
          : "Pembatalan otomatis: tanggal acara sudah lewat.";

      const cancelledRows = await tx
        .update(reservation)
        .set({ status: "AUTO_CANCELLED" })
        .where(
          and(
            eq(reservation.id, row.id),
            eq(reservation.status, status),
          ),
        )
        .returning({ id: reservation.id });

      if (cancelledRows.length === 0) {
        continue;
      }

      await tx.insert(reservationStatusHistory).values({
        id: randomUUID(),
        reservationId: row.id,
        fromStatus: status,
        toStatus: "AUTO_CANCELLED",
        reason,
        reasonCode: candidate.reasonCode,
        actorType: "SYSTEM",
        actorUserId: null,
      });

      summary.cancelled += 1;
    }

    return summary;
  });
}


