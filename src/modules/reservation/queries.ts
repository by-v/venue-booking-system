import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  ne,
  notInArray,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  customer,
  dateLock,
  facility,
  packageFacility,
  packageTable,
  payment,
  reservation,
  reservationActivity,
  reservationItem,
  reservationStatusHistory,
  setupNote,
} from "@/lib/db/schema";
import { monthSchema } from "@/modules/availability/schema";
import { lockDatesForEvent, todayInJakarta } from "@/modules/availability/dates";
import type { DateLock } from "@/modules/availability/types";
import type { GalleryCategory } from "@/modules/venue/types";

import {
  calculateMinimumDp,
  calculateRemainingPayment,
  calculateReservationTotal,
  derivePaymentStatus,
} from "./pricing";
import {
  isValidBookingNumber,
  normalizeBookingNumber,
} from "./booking-number";
import { maskCustomerName } from "./masking";
import {
  isPaymentOverdue,
  resolvePaymentDueDate,
} from "./payment-deadline";
import type {
  ActorType,
  CancellationReasonCode,
  DashboardData,
  DashboardFollowUpItem,
  DashboardFollowUpReason,
  Payment,
  PaymentVerificationStatus,
  PublicBookingProof,
  ReservationActivityType,
  ReservationAgendaItem,
  ReservationConflict,
  ReservationConfirmationContext,
  ReservationDetail,
  ReservationFinancials,
  ReservationItem,
  ReservationListItem,
  ReservationListQuery,
  ReservationSource,
  ReservationStatus,
  SetupNote,
} from "./types";

/**
 * Query admin reservasi (design RS-9). Pencarian mencakup nama, WhatsApp, dan
 * nomor booking; daftar bentrok konfirmasi mengikuti design D5.
 */

const DASHBOARD_AGENDA_LIMIT = 10;
const DASHBOARD_RECENT_LIMIT = 5;
const CONFLICT_STATUSES: ReservationStatus[] = [
  "PENDING",
  "DITANGGUHKAN",
  "DITERIMA",
];

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function whatsappSearchTerm(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) {
    return "";
  }
  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith("8")) {
    return `62${digits}`;
  }
  return digits;
}

function searchCondition(search?: string): SQL | undefined {
  const term = search?.trim() ?? "";
  if (term.length === 0) {
    return undefined;
  }

  const whatsappTerm = whatsappSearchTerm(term);
  return or(
    ilike(customer.name, `%${escapeLike(term)}%`),
    whatsappTerm.length > 0
      ? ilike(customer.whatsapp, `%${escapeLike(whatsappTerm)}%`)
      : undefined,
    ilike(reservation.bookingNumber, `%${escapeLike(term)}%`),
  );
}

function statusCondition(filter: ReservationListQuery["filter"]): SQL | undefined {
  switch (filter) {
    case "diterima":
      return eq(reservation.status, "DITERIMA");
    case "dibatalkan":
      return inArray(reservation.status, ["DIBATALKAN", "AUTO_CANCELLED"]);
    case "semua":
      return undefined;
    case "proses":
    default:
      return inArray(reservation.status, ["PENDING", "DITANGGUHKAN"]);
  }
}

function monthBounds(
  month?: string,
): { start: string; end: string } | null {
  const parsed = monthSchema.safeParse(month);
  if (!parsed.success) {
    return null;
  }

  const [year, monthNumber] = parsed.data.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
  return {
    start: `${parsed.data}-01`,
    end: nextMonth.toISOString().slice(0, 10),
  };
}

function monthCondition(month?: string): SQL | undefined {
  const bounds = monthBounds(month);
  if (!bounds) {
    return undefined;
  }

  return and(
    gte(reservation.eventDate, bounds.start),
    lt(reservation.eventDate, bounds.end),
  );
}

function listConditions(input: ReservationListQuery): SQL | undefined {
  return and(
    statusCondition(input.filter ?? "proses"),
    searchCondition(input.search),
    monthCondition(input.month),
  );
}

async function queryReservationList(
  input: ReservationListQuery,
  limit?: number,
): Promise<ReservationListItem[]> {
  const itemTotalSql = sql<number>`coalesce((
    select ${sum(reservationItem.amountRupiah)}
    from ${reservationItem}
    where ${reservationItem.reservationId} = ${reservation.id}
  ), 0)`;
  const verifiedTotalSql = sql<number>`coalesce((
    select ${sum(payment.amountRupiah)}
    from ${payment}
    where ${payment.reservationId} = ${reservation.id}
      and ${payment.verificationStatus} = 'TERVERIFIKASI'
  ), 0)`;

  const query = db
    .select({
      id: reservation.id,
      customerName: customer.name,
      customerWhatsapp: customer.whatsapp,
      eventDate: reservation.eventDate,
      eventType: reservation.eventType,
      packageName: reservation.packageName,
      packagePriceRupiah: reservation.packagePriceRupiah,
      itemTotalRupiah: itemTotalSql,
      verifiedPaymentRupiah: verifiedTotalSql,
      status: reservation.status,
      source: reservation.source,
      bookingNumber: reservation.bookingNumber,
      createdAt: reservation.createdAt,
    })
    .from(reservation)
    .innerJoin(customer, eq(reservation.customerId, customer.id))
    .where(listConditions(input))
    .orderBy(desc(reservation.createdAt));

  const rows = limit ? await query.limit(limit) : await query;

  return rows.map((row) => {
    const itemTotalRupiah = Number(row.itemTotalRupiah ?? 0);
    const verifiedPaymentRupiah = Number(row.verifiedPaymentRupiah ?? 0);
    const totalRupiah = row.packagePriceRupiah + itemTotalRupiah;

    return {
      id: row.id,
      customerName: row.customerName,
      customerWhatsapp: row.customerWhatsapp,
      eventDate: row.eventDate,
      eventType: row.eventType as GalleryCategory,
      packageName: row.packageName,
      packagePriceRupiah: row.packagePriceRupiah,
      totalRupiah,
      verifiedPaymentRupiah,
      paymentStatus: derivePaymentStatus(totalRupiah, verifiedPaymentRupiah),
      status: row.status as ReservationStatus,
      source: row.source as ReservationSource,
      bookingNumber: row.bookingNumber,
      createdAt: row.createdAt,
    };
  });
}

export async function listReservations(
  input: ReservationListQuery = {},
): Promise<ReservationListItem[]> {
  return queryReservationList(input);
}

export async function getReservationDetail(
  id: string,
): Promise<ReservationDetail | null> {
  const rows = await db
    .select({
      id: reservation.id,
      customerId: customer.id,
      customerName: customer.name,
      customerWhatsapp: customer.whatsapp,
      packageId: reservation.packageId,
      packageName: reservation.packageName,
      packagePriceRupiah: reservation.packagePriceRupiah,
      packageDurationHours: reservation.packageDurationHours,
      packageSessionCount: reservation.packageSessionCount,
      eventDate: reservation.eventDate,
      eventType: reservation.eventType,
      address: reservation.address,
      notes: reservation.notes,
      status: reservation.status,
      source: reservation.source,
      bookingNumber: reservation.bookingNumber,
      dpForfeited: reservation.dpForfeited,
      perluPemeriksaanAdmin: reservation.perluPemeriksaanAdmin,
      rescheduleCount: reservation.rescheduleCount,
      paymentDueDateOverride: reservation.paymentDueDateOverride,
      createdAt: reservation.createdAt,
    })
    .from(reservation)
    .innerJoin(customer, eq(reservation.customerId, customer.id))
    .where(eq(reservation.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const [items, payments, activities, statusHistory, setupNotes] =
    await Promise.all([
    db
      .select({
        id: reservationItem.id,
        reservationId: reservationItem.reservationId,
        description: reservationItem.description,
        amountRupiah: reservationItem.amountRupiah,
        createdAt: reservationItem.createdAt,
      })
      .from(reservationItem)
      .where(eq(reservationItem.reservationId, id))
      .orderBy(asc(reservationItem.createdAt)),
    db
      .select({
        id: payment.id,
        reservationId: payment.reservationId,
        amountRupiah: payment.amountRupiah,
        verificationStatus: payment.verificationStatus,
        recordedByUserId: payment.recordedByUserId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      })
      .from(payment)
      .where(eq(payment.reservationId, id))
      .orderBy(asc(payment.createdAt)),
    db
      .select({
        id: reservationActivity.id,
        type: reservationActivity.type,
        note: reservationActivity.note,
        actorType: reservationActivity.actorType,
        isSubstantive: reservationActivity.isSubstantive,
        createdAt: reservationActivity.createdAt,
      })
      .from(reservationActivity)
      .where(eq(reservationActivity.reservationId, id))
      .orderBy(asc(reservationActivity.createdAt)),
    db
      .select({
        id: reservationStatusHistory.id,
        fromStatus: reservationStatusHistory.fromStatus,
        toStatus: reservationStatusHistory.toStatus,
        reason: reservationStatusHistory.reason,
        reasonCode: reservationStatusHistory.reasonCode,
        actorType: reservationStatusHistory.actorType,
        createdAt: reservationStatusHistory.createdAt,
      })
      .from(reservationStatusHistory)
      .where(eq(reservationStatusHistory.reservationId, id))
      .orderBy(asc(reservationStatusHistory.createdAt)),
    db
      .select({
        id: setupNote.id,
        reservationId: setupNote.reservationId,
        note: setupNote.note,
        updatedByUserId: setupNote.updatedByUserId,
        createdAt: setupNote.createdAt,
        updatedAt: setupNote.updatedAt,
      })
      .from(setupNote)
      .where(eq(setupNote.reservationId, id))
      .limit(1),
  ]);

  const mappedItems: ReservationItem[] = items;
  const mappedSetupNote: SetupNote | null = setupNotes[0] ?? null;
  const mappedPayments: Payment[] = payments.map((rowPayment) => ({
    ...rowPayment,
    verificationStatus:
      rowPayment.verificationStatus as PaymentVerificationStatus,
  }));

  const itemTotalRupiah = mappedItems.reduce(
    (total, item) => total + item.amountRupiah,
    0,
  );
  const totalRupiah = calculateReservationTotal(
    row.packagePriceRupiah,
    mappedItems.map((item) => item.amountRupiah),
  );
  const verifiedPaymentRupiah = mappedPayments
    .filter((rowPayment) => rowPayment.verificationStatus === "TERVERIFIKASI")
    .reduce((total, rowPayment) => total + rowPayment.amountRupiah, 0);

  const paymentStatus = derivePaymentStatus(totalRupiah, verifiedPaymentRupiah);
  const financials: ReservationFinancials = {
    packagePriceRupiah: row.packagePriceRupiah,
    itemTotalRupiah,
    totalRupiah,
    minimumDpRupiah: calculateMinimumDp(totalRupiah),
    verifiedPaymentRupiah,
    remainingRupiah: calculateRemainingPayment(
      totalRupiah,
      verifiedPaymentRupiah,
    ),
    paymentStatus,
  };

  return {
    id: row.id,
    customer: {
      id: row.customerId,
      name: row.customerName,
      whatsapp: row.customerWhatsapp,
    },
    packageId: row.packageId,
    packageName: row.packageName,
    packagePriceRupiah: row.packagePriceRupiah,
    packageDurationHours: row.packageDurationHours,
    packageSessionCount: row.packageSessionCount,
    eventDate: row.eventDate,
    eventType: row.eventType as GalleryCategory,
    address: row.address,
    notes: row.notes,
    status: row.status as ReservationStatus,
    paymentDueDate: resolvePaymentDueDate(
      row.eventDate,
      row.paymentDueDateOverride,
    ),
    paymentDueDateOverride: row.paymentDueDateOverride,
    paymentOverdue: isPaymentOverdue({
      eventDate: row.eventDate,
      paymentStatus,
      today: todayInJakarta(),
      paymentDueDateOverride: row.paymentDueDateOverride,
    }),
    source: row.source as ReservationSource,
    bookingNumber: row.bookingNumber,
    dpForfeited: row.dpForfeited,
    perluPemeriksaanAdmin: row.perluPemeriksaanAdmin,
    rescheduleCount: row.rescheduleCount,
    setupNote: mappedSetupNote,
    createdAt: row.createdAt,
    items: mappedItems,
    payments: mappedPayments,
    financials,
    activities: activities.map((activity) => ({
      ...activity,
      type: activity.type as ReservationActivityType,
      actorType: activity.actorType as ActorType,
    })),
    statusHistory: statusHistory.map((history) => ({
      ...history,
      fromStatus: history.fromStatus as ReservationStatus | null,
      toStatus: history.toStatus as ReservationStatus,
      reasonCode: history.reasonCode as CancellationReasonCode | null,
      actorType: history.actorType as ActorType,
    })),
  };
}

/**
 * Data publik berdasarkan nomor booking (design D1). Hanya mengembalikan field
 * yang aman untuk halaman publik; nama customer sudah disamarkan.
 */
export async function getPublicBookingByNumber(
  bookingNumber: string,
): Promise<PublicBookingProof | null> {
  const normalized = normalizeBookingNumber(bookingNumber);
  if (!isValidBookingNumber(normalized)) {
    return null;
  }

  const rows = await db
    .select({
      id: reservation.id,
      packageId: reservation.packageId,
      customerName: customer.name,
      packageName: reservation.packageName,
      packagePriceRupiah: reservation.packagePriceRupiah,
      packageDurationHours: reservation.packageDurationHours,
      packageSessionCount: reservation.packageSessionCount,
      eventDate: reservation.eventDate,
      eventType: reservation.eventType,
      status: reservation.status,
      bookingNumber: reservation.bookingNumber,
    })
    .from(reservation)
    .innerJoin(customer, eq(reservation.customerId, customer.id))
    .where(
      and(
        eq(reservation.bookingNumber, normalized),
        notInArray(reservation.status, ["PENDING", "DITANGGUHKAN"]),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row || row.bookingNumber === null) {
    return null;
  }

  const [items, payments, facilities] = await Promise.all([
    db
      .select({ amountRupiah: reservationItem.amountRupiah })
      .from(reservationItem)
      .where(eq(reservationItem.reservationId, row.id)),
    db
      .select({
        amountRupiah: payment.amountRupiah,
        verificationStatus: payment.verificationStatus,
      })
      .from(payment)
      .where(eq(payment.reservationId, row.id)),
    db
      .select({ name: facility.name })
      .from(packageFacility)
      .innerJoin(facility, eq(packageFacility.facilityId, facility.id))
      .where(
        and(
          eq(packageFacility.packageId, row.packageId),
          eq(facility.active, true),
        ),
      )
      .orderBy(asc(facility.sortOrder), asc(facility.id)),
  ]);

  const totalRupiah = calculateReservationTotal(
    row.packagePriceRupiah,
    items.map((item) => item.amountRupiah),
  );
  const verifiedPaymentRupiah = payments
    .filter((rowPayment) => rowPayment.verificationStatus === "TERVERIFIKASI")
    .reduce((total, rowPayment) => total + rowPayment.amountRupiah, 0);

  return {
    bookingNumber: row.bookingNumber,
    maskedCustomerName: maskCustomerName(row.customerName),
    eventDate: row.eventDate,
    eventType: row.eventType as GalleryCategory,
    packageName: row.packageName,
    packageDurationHours: row.packageDurationHours,
    packageSessionCount: row.packageSessionCount,
    packagePriceRupiah: row.packagePriceRupiah,
    facilities: facilities.map((facilityRow) => facilityRow.name),
    totalRupiah,
    minimumDpRupiah: calculateMinimumDp(totalRupiah),
    verifiedPaymentRupiah,
    remainingRupiah: calculateRemainingPayment(
      totalRupiah,
      verifiedPaymentRupiah,
    ),
    paymentStatus: derivePaymentStatus(totalRupiah, verifiedPaymentRupiah),
    status: row.status as ReservationStatus,
  };
}

export async function getReservationConfirmationContext(
  id: string,
): Promise<ReservationConfirmationContext | null> {
  const targetRows = await db
    .select({
      eventDate: reservation.eventDate,
      setupDaysBefore: packageTable.setupDaysBefore,
    })
    .from(reservation)
    .innerJoin(packageTable, eq(reservation.packageId, packageTable.id))
    .where(eq(reservation.id, id))
    .limit(1);

  const target = targetRows[0];
  if (!target) {
    return null;
  }

  const lockDates = lockDatesForEvent({
    eventDate: target.eventDate,
    setupDaysBefore: target.setupDaysBefore,
  });
  const targetDates = lockDates.map((lock) => lock.date);

  const targetLocks = await db
    .select({
      date: dateLock.date,
      kind: dateLock.kind,
      reservationId: dateLock.reservationId,
    })
    .from(dateLock)
    .where(inArray(dateLock.date, targetDates));

  const otherLocks = targetLocks.filter(
    (lock) => lock.reservationId !== id,
  );
  const hasDateConflict = otherLocks.length > 0;

  const lockOwnerIds = [
    ...new Set(
      otherLocks
        .map((lock) => lock.reservationId)
        .filter((ownerId): ownerId is string => ownerId !== null),
    ),
  ];

  const sameDateRows = await db
    .select({ id: reservation.id })
    .from(reservation)
    .where(
      and(
        ne(reservation.id, id),
        eq(reservation.eventDate, target.eventDate),
        inArray(reservation.status, CONFLICT_STATUSES),
        sql`exists (
          select 1
          from ${payment}
          where ${payment.reservationId} = ${reservation.id}
            and ${payment.verificationStatus} = 'TERVERIFIKASI'
        )`,
      ),
    );

  const candidateIds = [
    ...new Set([...lockOwnerIds, ...sameDateRows.map((row) => row.id)]),
  ];

  let conflicts: ReservationConflict[] = [];
  if (candidateIds.length > 0) {
    const verifiedPaymentRupiah = sql<number>`coalesce((
      select ${sum(payment.amountRupiah)}
      from ${payment}
      where ${payment.reservationId} = ${reservation.id}
        and ${payment.verificationStatus} = 'TERVERIFIKASI'
    ), 0)`;

    const candidateRows = await db
      .select({
        id: reservation.id,
        customerName: customer.name,
        customerWhatsapp: customer.whatsapp,
        eventDate: reservation.eventDate,
        status: reservation.status,
        verifiedPaymentRupiah,
      })
      .from(reservation)
      .innerJoin(customer, eq(reservation.customerId, customer.id))
      .where(
        and(
          inArray(reservation.id, candidateIds),
          inArray(reservation.status, CONFLICT_STATUSES),
        ),
      )
      .orderBy(asc(reservation.eventDate), asc(reservation.id));

    const occupiedDatesByReservation = new Map<string, DateLock[]>();
    for (const lock of otherLocks) {
      if (lock.reservationId === null) {
        continue;
      }
      const occupied = occupiedDatesByReservation.get(lock.reservationId) ?? [];
      occupied.push({
        date: lock.date,
        kind: lock.kind as DateLock["kind"],
      });
      occupiedDatesByReservation.set(lock.reservationId, occupied);
    }

    conflicts = candidateRows.map((row) => ({
      id: row.id,
      customerName: row.customerName,
      customerWhatsapp: row.customerWhatsapp,
      eventDate: row.eventDate,
      status: row.status as ReservationStatus,
      verifiedPaymentRupiah: Number(row.verifiedPaymentRupiah ?? 0),
      occupiedDates: occupiedDatesByReservation.get(row.id) ?? [],
    }));
  }

  return {
    lockDates,
    hasDateConflict,
    conflicts,
  };
}

export async function getDashboardData(month?: string): Promise<DashboardData> {
  const parsedMonth = monthSchema.safeParse(month);
  const monthValue = parsedMonth.success ? parsedMonth.data : null;
  const filterMonth = monthValue ?? undefined;
  const today = todayInJakarta();

  const [statusCountRows, agendaRows, followUpRows, recentReservations] =
    await Promise.all([
      db
        .select({
          status: reservation.status,
          total: count(),
        })
        .from(reservation)
        .where(monthCondition(filterMonth))
        .groupBy(reservation.status),
      db
        .select({
          id: reservation.id,
          customerName: customer.name,
          customerWhatsapp: customer.whatsapp,
          eventDate: reservation.eventDate,
          eventType: reservation.eventType,
          packageName: reservation.packageName,
        })
        .from(reservation)
        .innerJoin(customer, eq(reservation.customerId, customer.id))
        .where(
          and(
            eq(reservation.status, "DITERIMA"),
            gte(reservation.eventDate, today),
            monthCondition(filterMonth),
          ),
        )
        .orderBy(asc(reservation.eventDate), asc(reservation.createdAt))
        .limit(DASHBOARD_AGENDA_LIMIT),
      db
        .select({
          id: reservation.id,
          customerName: customer.name,
          customerWhatsapp: customer.whatsapp,
          eventDate: reservation.eventDate,
          packageName: reservation.packageName,
          status: reservation.status,
          perluPemeriksaanAdmin: reservation.perluPemeriksaanAdmin,
        })
        .from(reservation)
        .innerJoin(customer, eq(reservation.customerId, customer.id))
        .where(
          and(
            monthCondition(filterMonth),
            or(
              eq(reservation.status, "PENDING"),
              eq(reservation.perluPemeriksaanAdmin, true),
            ),
          ),
        )
        .orderBy(desc(reservation.createdAt)),
      queryReservationList(
        { filter: "semua", month: filterMonth },
        DASHBOARD_RECENT_LIMIT,
      ),
    ]);

  const agendaIds = agendaRows.map((row) => row.id);
  const setupRows =
    agendaIds.length === 0
      ? []
      : await db
          .select({
            reservationId: dateLock.reservationId,
            date: dateLock.date,
          })
          .from(dateLock)
          .where(
            and(
              inArray(dateLock.reservationId, agendaIds),
              eq(dateLock.kind, "SETUP"),
            ),
          )
          .orderBy(asc(dateLock.date));

  const setupByReservation = new Map<string, string[]>();
  for (const setup of setupRows) {
    if (!setup.reservationId) {
      continue;
    }
    const dates = setupByReservation.get(setup.reservationId) ?? [];
    dates.push(setup.date);
    setupByReservation.set(setup.reservationId, dates);
  }

  const agenda: ReservationAgendaItem[] = agendaRows.map((row) => ({
    ...row,
    eventType: row.eventType as GalleryCategory,
    setupDates: setupByReservation.get(row.id) ?? [],
  }));

  const counts = new Map<string, number>();
  for (const row of statusCountRows) {
    counts.set(row.status, Number(row.total));
  }

  const pending = counts.get("PENDING") ?? 0;
  const suspended = counts.get("DITANGGUHKAN") ?? 0;
  const accepted = counts.get("DITERIMA") ?? 0;
  const cancelled =
    (counts.get("DIBATALKAN") ?? 0) + (counts.get("AUTO_CANCELLED") ?? 0);

  const followUps: DashboardFollowUpItem[] = followUpRows.map((row) => {
    const reasons: DashboardFollowUpReason[] = [];

    if (row.status === "PENDING") {
      reasons.push("PENDING");
    }
    if (row.perluPemeriksaanAdmin) {
      reasons.push("PERLU_PEMERIKSAAN");
    }

    return {
      id: row.id,
      customerName: row.customerName,
      customerWhatsapp: row.customerWhatsapp,
      eventDate: row.eventDate,
      packageName: row.packageName,
      status: row.status as ReservationStatus,
      reasons,
    };
  });

  return {
    month: monthValue,
    activeCount: pending + suspended + accepted,
    statusCards: {
      pending,
      suspended,
      accepted,
      cancelled,
    },
    agenda,
    followUps,
    recentReservations,
  };
}
