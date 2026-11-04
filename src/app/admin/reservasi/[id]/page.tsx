import Link from "next/link";
import { notFound } from "next/navigation";

import type { BadgeStatus } from "@/components/ui";
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { addDays, todayInJakarta } from "@/modules/availability/dates";
import { requireAdminSession } from "@/modules/auth";
import {
  getReservationConfirmationContext,
  getReservationDetail,
} from "@/modules/reservation/queries";
import { isReservationCompletionDue } from "@/modules/reservation/lifecycle";
import {
  canReschedule,
  isRescheduleDeadlinePassed,
  rescheduleDeadline,
} from "@/modules/reservation/reschedule";
import type {
  ActorType,
  PaymentStatus,
  ReservationActivityType,
  ReservationSource,
  ReservationStatus,
  StatusHistoryReasonCode,
} from "@/modules/reservation/types";
import {
  GALLERY_CATEGORY_LABELS,
  type GalleryCategory,
} from "@/modules/venue/types";

import {
  addFollowUpNote,
  addReservationItem,
  cancelAcceptedReservation,
  cancelReservation,
  cancelReservationForLatePayment,
  completeReservation,
  confirmReservation,
  markDownPayment,
  markPaidOff,
  recordManualPayment,
  rescheduleReservation,
  saveSetupNote,
  suspendReservation,
  updatePaymentDueDate,
} from "../actions";

const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: "Menunggu",
  DITANGGUHKAN: "Ditangguhkan",
  DITERIMA: "Diterima",
  DIBATALKAN: "Dibatalkan",
  AUTO_CANCELLED: "Dibatalkan otomatis",
  SELESAI: "Selesai",
};

const STATUS_BADGES: Record<ReservationStatus, BadgeStatus> = {
  PENDING: "pending",
  DITANGGUHKAN: "suspended",
  DITERIMA: "accepted",
  DIBATALKAN: "cancelled",
  AUTO_CANCELLED: "cancelled",
  SELESAI: "accepted",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  BELUM_DP: "Belum DP",
  DP: "DP",
  LUNAS: "Lunas",
};

const PAYMENT_STATUS_BADGES: Record<
  PaymentStatus,
  "pending" | "accepted" | "suspended"
> = {
  BELUM_DP: "pending",
  DP: "suspended",
  LUNAS: "accepted",
};

const ACTOR_LABELS: Record<ActorType, string> = {
  CUSTOMER: "Customer",
  ADMIN: "Admin",
  SYSTEM: "Sistem",
};

const ACTIVITY_LABELS: Record<ReservationActivityType, string> = {
  SUBMISSION: "Pengajuan dikirim",
  FOLLOW_UP_NOTE: "Catatan tindak lanjut",
  STATUS_CHANGE: "Perubahan status",
  ITEM_ADDED: "Item biaya ditambahkan",
  PAYMENT_RECORDED: "Pembayaran dicatat",
  PAYMENT_STATUS_CHANGED: "Status pembayaran berubah",
  DATA_UPDATED: "Data reservasi diperbarui",
};

const STATUS_HISTORY_REASON_LABELS: Record<
  StatusHistoryReasonCode,
  string
> = {
  MUNDUR_CUSTOMER: "Customer mundur",
  DITOLAK_VENUE: "Ditolak venue",
  INACTIVITY_3M: "Tidak ada aktivitas tiga bulan",
  EVENT_DATE_PASSED: "Tanggal acara sudah lewat",
  PELUNASAN_TERLAMBAT: "Pelunasan terlambat",
};

const SOURCE_LABELS: Record<ReservationSource, string> = {
  FORM_PUBLIK: "Form publik",
  INPUT_ADMIN: "Input admin",
};

const ERROR_MESSAGES: Record<string, string> = {
  PACKAGE_UNAVAILABLE: "Paket tidak tersedia.",
  DATE_NOT_BOOKABLE: "Tanggal tidak dapat dipesan.",
  RESERVATION_NOT_FOUND: "Reservasi tidak ditemukan.",
  INVALID_STATE: "Tindakan tidak diizinkan pada status reservasi saat ini.",
  PAYMENT_NOT_FOUND: "Pembayaran tidak ditemukan.",
  PAYMENT_EXCEEDS_TOTAL:
    "Verifikasi ditolak karena total pembayaran terverifikasi melebihi total reservasi.",
  REASON_REQUIRED: "Alasan wajib diisi.",
  INVALID_REASON_CODE: "Kode alasan pembatalan tidak valid.",
  INVALID_AMOUNT: "Nominal harus bilangan bulat lebih dari nol.",
  INVALID_DESCRIPTION: "Deskripsi item wajib diisi.",
  INVALID_SETUP_NOTE:
    "Catatan setup wajib diisi dan maksimal 1.000 karakter.",
  DP_BELOW_MINIMUM:
    "DP terverifikasi belum memenuhi batas minimum untuk konfirmasi.",
  DATE_CONFLICT:
    "Tanggal acara atau setup sudah terkunci. Periksa daftar bentrok sebelum mencoba lagi.",
  RESCHEDULE_LIMIT_REACHED:
    "Reschedule sudah digunakan. Reservasi ini tidak dapat dipindahkan lagi.",
  RESCHEDULE_DEADLINE_PASSED:
    "Batas reschedule sudah lewat. Tanggal acara tidak dapat dipindahkan lagi.",
  COMPLETION_NOT_ALLOWED:
    "Hanya reservasi DITERIMA yang dapat ditandai selesai.",
  EVENT_DATE_NOT_PASSED:
    "Reservasi baru dapat ditandai selesai setelah tanggal acara.",
  INPUT_TIDAK_VALID: "Input tidak valid. Periksa kembali isian Anda.",
  CUSTOMER_WHATSAPP_TAKEN:
    "Nomor WhatsApp sudah dipakai customer lain. Periksa kembali nomor tersebut.",
  TOTAL_BELOW_VERIFIED_PAYMENT:
    "Total paket baru lebih kecil dari pembayaran yang sudah terverifikasi.",
  INVALID_PAYMENT_DUE_DATE:
    "Batas pelunasan tidak boleh melewati tanggal acara.",
  PAYMENT_DEADLINE_NOT_PASSED:
    "Pembatalan karena pelunasan terlambat baru dapat dilakukan setelah batas pelunasan terlewati.",
  PAYMENT_ALREADY_SETTLED:
    "Pembayaran reservasi sudah lunas sehingga tidak dapat dibatalkan sebagai pelunasan terlambat.",
};

const FINAL_STATUSES: readonly ReservationStatus[] = [
  "DIBATALKAN",
  "AUTO_CANCELLED",
  "SELESAI",
];

function formatEventDate(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(value);
}

function eventTypeLabel(eventType: GalleryCategory): string {
  return GALLERY_CATEGORY_LABELS[eventType];
}

function whatsappLabel(value: string): string {
  return `+${value}`;
}

function errorMessage(code: string | undefined): string | null {
  if (!code) {
    return null;
  }
  return ERROR_MESSAGES[code] ?? "Terjadi kesalahan. Coba lagi.";
}

export default async function ReservasiDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ galat?: string }>;
}) {
  await requireAdminSession();

  const { id } = await params;
  const { galat } = (await searchParams) ?? {};
  const reservation = await getReservationDetail(id);

  if (!reservation) {
    notFound();
  }

  const canManageFinance = !FINAL_STATUSES.includes(reservation.status);
  const canEditData = !FINAL_STATUSES.includes(reservation.status);
  const canSuspend = reservation.status === "PENDING";
  const canCancel =
    reservation.status === "PENDING" ||
    reservation.status === "DITANGGUHKAN";
  const canConfirm = canCancel;
  const canCancelAccepted = reservation.status === "DITERIMA";
  const canCancelForLatePayment =
    reservation.status === "DITERIMA" && reservation.paymentOverdue;
  const canAddNote = canCancel;
  const today = todayInJakarta();
  const rescheduleDeadlineDate = rescheduleDeadline(reservation.eventDate);
  const rescheduleDeadlinePassed = isRescheduleDeadlinePassed({
    eventDate: reservation.eventDate,
    today,
  });
  const rescheduleQuotaRemaining = Math.max(
    0,
    1 - reservation.rescheduleCount,
  );
  const canSubmitReschedule = canReschedule({
    status: reservation.status,
    rescheduleCount: reservation.rescheduleCount,
    eventDate: reservation.eventDate,
    today,
  });
  const canComplete = isReservationCompletionDue({
    status: reservation.status,
    eventDate: reservation.eventDate,
    today,
  });
  const bannerMessage = errorMessage(galat);
  const confirmationContext = canConfirm
    ? await getReservationConfirmationContext(reservation.id)
    : null;
  const setupDates =
    confirmationContext?.lockDates
      .filter((lock) => lock.kind === "SETUP")
      .map((lock) => formatEventDate(lock.date)) ?? [];
  const dpSufficient =
    reservation.financials.verifiedPaymentRupiah >=
    reservation.financials.minimumDpRupiah;
  const canSubmitConfirmation =
    dpSufficient &&
    confirmationContext !== null &&
    !confirmationContext.hasDateConflict;

  let runningPaymentTotal = 0;
  const paymentRows = reservation.payments.map((rowPayment) => {
    const paidBefore = runningPaymentTotal;
    runningPaymentTotal += rowPayment.amountRupiah;
    const kind =
      runningPaymentTotal >= reservation.financials.totalRupiah
        ? "Pelunasan"
        : paidBefore < reservation.financials.minimumDpRupiah
          ? "DP 25%"
          : "Pembayaran";
    return { ...rowPayment, kind };
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/reservasi"
          className="text-sm font-medium text-gold-700 underline"
        >
          ← Kembali ke daftar reservasi
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-ink">
              {reservation.customer.name}
            </h1>
            {reservation.bookingNumber ? (
              <p className="mt-1 font-mono text-sm text-gray-700">
                {reservation.bookingNumber}
              </p>
            ) : null}
            <p className="mt-1 text-sm text-gray-600">
              Pengajuan diterima {formatDateTime(reservation.createdAt)}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Sumber reservasi:{" "}
              <span className="font-medium text-ink">
                {SOURCE_LABELS[reservation.source]}
              </span>
            </p>
            {canEditData ? (
              <Link
                href={`/admin/reservasi/${reservation.id}/edit`}
                className="mt-2 inline-block text-sm font-medium text-gold-700 underline"
              >
                Edit data reservasi
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {reservation.dpForfeited ? (
              <Badge status="cancelled">DP hangus</Badge>
            ) : null}
            <Badge status={STATUS_BADGES[reservation.status]}>
              {STATUS_LABELS[reservation.status]}
            </Badge>
          </div>
        </div>
      </div>

      {bannerMessage ? (
        <div
          role="alert"
          className="rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {bannerMessage}
        </div>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold text-ink">
            Ringkasan keuangan
          </h2>
          {reservation.perluPemeriksaanAdmin ? (
            <Badge status="cancelled">Perlu pemeriksaan admin</Badge>
          ) : null}
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
              Total reservasi
            </dt>
            <dd className="mt-1 text-sm text-ink">
              {formatRupiah(reservation.financials.totalRupiah)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
              DP minimum 25%
            </dt>
            <dd className="mt-1 text-sm text-ink">
              {formatRupiah(reservation.financials.minimumDpRupiah)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
              Sudah dibayar
            </dt>
            <dd className="mt-1 text-sm text-ink">
              {formatRupiah(reservation.financials.verifiedPaymentRupiah)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
              Sisa pembayaran
            </dt>
            <dd className="mt-1 text-sm text-ink">
              {formatRupiah(reservation.financials.remainingRupiah)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
              Batas pelunasan
            </dt>
            <dd className="mt-1 text-sm text-ink">
              {formatEventDate(reservation.paymentDueDate)}
            </dd>
            <p className="mt-1 text-xs text-gray-600">
              {reservation.paymentDueDateOverride
                ? "Disesuaikan admin."
                : "Default H-14 dari tanggal acara."}
            </p>
            {reservation.paymentOverdue ? (
              <div className="mt-2">
                <Badge status="pending">Pelunasan terlambat</Badge>
                <p className="mt-1 text-xs text-gray-600">
                  Pembatalan tidak berjalan otomatis. Bila perlu, admin dapat
                  membatalkan reservasi melalui tindakan di bawah.
                </p>
                {canCancelForLatePayment ? (
                  <form
                    action={cancelReservationForLatePayment}
                    className="mt-3 flex flex-col gap-3 border-t border-gray-300 pt-3"
                  >
                    <input
                      type="hidden"
                      name="reservationId"
                      value={reservation.id}
                    />
                    <Textarea
                      id="late-payment-cancellation-reason"
                      label="Alasan pembatalan"
                      name="reason"
                      required
                      maxLength={1000}
                      placeholder="Contoh: Pelunasan tidak diselesaikan sampai batas."
                    />
                    <fieldset className="flex flex-col gap-2">
                      <legend className="text-sm font-medium text-ink">
                        Akibat DP
                      </legend>
                      <label className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="radio"
                          name="dpDecision"
                          value="HANGUS"
                          required
                        />
                        DP hangus
                      </label>
                      <label className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="radio"
                          name="dpDecision"
                          value="TIDAK_HANGUS"
                        />
                        DP tidak hangus
                      </label>
                    </fieldset>
                    <p className="text-xs text-gray-600">
                      DP terverifikasi{" "}
                      {formatRupiah(
                        reservation.financials.verifiedPaymentRupiah,
                      )}{" "}
                      tidak otomatis hangus. Pilih akibat DP secara eksplisit
                      sebelum membatalkan.
                    </p>
                    <div>
                      <Button type="submit" variant="ghost">
                        Batalkan karena pelunasan terlambat
                      </Button>
                    </div>
                  </form>
                ) : null}
              </div>
            ) : null}
            {canManageFinance ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-gold-700 underline">
                  Edit batas pelunasan
                </summary>
                <form
                  action={updatePaymentDueDate}
                  className="mt-3 flex flex-col gap-3"
                >
                  <input
                    type="hidden"
                    name="reservationId"
                    value={reservation.id}
                  />
                  <Input
                    id="payment-due-date"
                    label="Batas pelunasan manual"
                    name="paymentDueDate"
                    type="date"
                    max={reservation.eventDate}
                    defaultValue={reservation.paymentDueDateOverride ?? ""}
                  />
                  <p className="text-xs text-gray-600">
                    Kosongkan untuk kembali ke default H-14. Tanggal tidak boleh
                    melewati tanggal acara.
                  </p>
                  <div>
                    <Button type="submit" variant="outline">
                      Simpan batas pelunasan
                    </Button>
                  </div>
                </form>
              </details>
            ) : null}
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
              Status pembayaran
            </dt>
            <dd className="mt-1">
              <Badge
                status={
                  PAYMENT_STATUS_BADGES[reservation.financials.paymentStatus]
                }
              >
                {PAYMENT_STATUS_LABELS[reservation.financials.paymentStatus]}
              </Badge>
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-gray-300 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-heading text-base font-semibold text-ink">
              Catatan pembayaran
            </h3>
            <p className="text-xs text-gray-600">
              {paymentRows.length} catatan
            </p>
          </div>

          {paymentRows.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">
              Belum ada pembayaran dicatat.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-gray-600">
                  <tr>
                    <th className="py-2 pr-4">Waktu</th>
                    <th className="py-2 pr-4">Jenis</th>
                    <th className="py-2">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((rowPayment) => (
                    <tr
                      key={rowPayment.id}
                      className="border-t border-gray-300"
                    >
                      <td className="py-3 pr-4 text-gray-600">
                        {formatDateTime(rowPayment.createdAt)}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {rowPayment.kind}
                      </td>
                      <td className="py-3 text-ink">
                        {formatRupiah(rowPayment.amountRupiah)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canManageFinance &&
          reservation.financials.paymentStatus !== "LUNAS" ? (
            <div className="mt-6 border-t border-gray-300 pt-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                Opsi Pencatatan Pembayaran
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {reservation.financials.paymentStatus === "BELUM_DP" ? (
                  <form action={markDownPayment}>
                    <input
                      type="hidden"
                      name="reservationId"
                      value={reservation.id}
                    />
                    <Button type="submit">Sudah DP (25%)</Button>
                  </form>
                ) : null}

                <form action={markPaidOff}>
                  <input
                    type="hidden"
                    name="reservationId"
                    value={reservation.id}
                  />
                  <Button type="submit" variant="outline">
                    Pelunasan (Sisa {formatRupiah(reservation.financials.remainingRupiah)})
                  </Button>
                </form>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-600 mb-2 font-medium">
                  Atau Input Manual (Bila customer membayar nominal khusus / lebih dari DP):
                </p>
                <form action={recordManualPayment} className="flex flex-wrap items-end gap-3">
                  <input
                    type="hidden"
                    name="reservationId"
                    value={reservation.id}
                  />
                  <div className="flex flex-col gap-1">
                    <label htmlFor="manual-amount" className="text-xs text-gray-600 font-medium">
                      Nominal Pembayaran (Rp)
                    </label>
                    <Input
                      id="manual-amount"
                      type="number"
                      name="amountRupiah"
                      min="1"
                      max={reservation.financials.remainingRupiah}
                      step="10000"
                      placeholder={`Maks ${reservation.financials.remainingRupiah}`}
                      className="w-52"
                      required
                    />
                  </div>
                  <Button type="submit" variant="outline">
                    Catat Nominal Manual
                  </Button>
                </form>
              </div>
            </div>
          ) : null}

          {!canManageFinance ? (
            <p className="mt-3 text-xs text-gray-600">
              Pembayaran tidak dapat dicatat pada status reservasi ini.
            </p>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr] xl:items-start">
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Data customer
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                  Nama
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {reservation.customer.name}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                  WhatsApp
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {whatsappLabel(reservation.customer.whatsapp)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Paket
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                  Nama paket
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {reservation.packageName}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                  Harga snapshot
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {formatRupiah(reservation.packagePriceRupiah)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                  Durasi
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {reservation.packageDurationHours} jam ·{" "}
                  {reservation.packageSessionCount} sesi
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Detail acara
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                  Tanggal acara
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {formatEventDate(reservation.eventDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                  Jenis acara
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {eventTypeLabel(reservation.eventType)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                  Alamat
                </dt>
                <dd className="mt-1 text-sm text-ink">
                  {reservation.address}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                  Catatan customer
                </dt>
                <dd className="mt-1 whitespace-pre-line text-sm text-ink">
                  {reservation.notes ?? "—"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-heading text-lg font-semibold text-ink">
                Item biaya
              </h2>
              <p className="text-xs text-gray-600">
                Total item {formatRupiah(reservation.financials.itemTotalRupiah)}
              </p>
            </div>

            {reservation.items.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                Belum ada item biaya tambahan.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-gray-600">
                    <tr>
                      <th className="py-2 pr-4">Deskripsi</th>
                      <th className="py-2 pr-4">Nominal</th>
                      <th className="py-2">Ditambahkan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservation.items.map((item) => (
                      <tr key={item.id} className="border-t border-gray-300">
                        <td className="py-3 pr-4 text-ink">{item.description}</td>
                        <td className="py-3 pr-4 text-gray-600">
                          {formatRupiah(item.amountRupiah)}
                        </td>
                        <td className="py-3 text-gray-600">
                          {formatDateTime(item.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canManageFinance ? (
              <form
                action={addReservationItem}
                className="mt-6 flex flex-col gap-4 border-t border-gray-300 pt-4"
              >
                <input
                  type="hidden"
                  name="reservationId"
                  value={reservation.id}
                />
                <Input
                  id="item-description"
                  label="Deskripsi item"
                  name="description"
                  required
                  maxLength={200}
                  placeholder="Contoh: Sewa tenda tambahan"
                />
                <Input
                  id="item-amount"
                  label="Nominal item (Rp)"
                  name="amountRupiah"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  required
                />
                <div>
                  <Button type="submit">Tambah item</Button>
                </div>
              </form>
            ) : (
              <p className="mt-4 text-sm text-gray-600">
                Item biaya tidak dapat ditambahkan pada status reservasi ini.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Riwayat status
            </h2>
            {reservation.statusHistory.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                Belum ada riwayat status.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-gray-600">
                    <tr>
                      <th className="py-2 pr-4">Waktu</th>
                      <th className="py-2 pr-4">Dari</th>
                      <th className="py-2 pr-4">Ke</th>
                      <th className="py-2 pr-4">Alasan</th>
                      <th className="py-2">Pelaku</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservation.statusHistory.map((history) => (
                      <tr
                        key={history.id}
                        className="border-t border-gray-300 align-top"
                      >
                        <td className="py-3 pr-4 text-gray-600">
                          {formatDateTime(history.createdAt)}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {history.fromStatus
                            ? STATUS_LABELS[history.fromStatus]
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 text-ink">
                          {STATUS_LABELS[history.toStatus]}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {history.reasonCode
                            ? `${STATUS_HISTORY_REASON_LABELS[history.reasonCode]} · `
                            : ""}
                          {history.reason ?? "—"}
                        </td>
                        <td className="py-3 text-gray-600">
                          {ACTOR_LABELS[history.actorType]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Aktivitas
            </h2>
            {reservation.activities.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                Belum ada aktivitas.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-4">
                {reservation.activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="border-t border-gray-300 pt-4 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-ink">
                        {ACTIVITY_LABELS[activity.type]}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDateTime(activity.createdAt)}
                      </p>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                      {activity.note ??
                        (activity.type === "SUBMISSION"
                          ? "Pengajuan dikirim melalui form publik."
                          : "—")}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {ACTOR_LABELS[activity.actorType]}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {canConfirm ? (
            <Card>
              <h2 className="font-heading text-lg font-semibold text-ink">
                Konfirmasi reservasi
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Konfirmasi menerbitkan nomor booking dan mengunci tanggal acara
                serta setup.
              </p>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                    Tanggal acara
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {formatEventDate(reservation.eventDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                    Tanggal setup
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {setupDates.length > 0 ? setupDates.join(", ") : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                    DP minimum
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {formatRupiah(reservation.financials.minimumDpRupiah)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                    Sudah dibayar
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {formatRupiah(
                      reservation.financials.verifiedPaymentRupiah,
                    )}
                  </dd>
                </div>
              </dl>

              {!dpSufficient ? (
                <p className="mt-4 rounded-md border border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  DP terverifikasi belum memenuhi batas minimum untuk
                  konfirmasi.
                </p>
              ) : null}

              {confirmationContext?.hasDateConflict ? (
                <div className="mt-4 rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-medium">
                    Tanggal acara atau setup sudah terkunci.
                  </p>
                  <p className="mt-1">
                    {confirmationContext.conflicts.length === 0
                      ? "Tanggal target terkunci secara manual sehingga tidak ada reservasi lain yang dapat ditampilkan."
                      : "Periksa daftar bentrok sebelum mengonfirmasi."}
                  </p>
                </div>
              ) : null}

              {confirmationContext &&
              confirmationContext.conflicts.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-ink">
                    Daftar bentrok
                  </h3>
                  <ul className="mt-2 flex flex-col gap-3">
                    {confirmationContext.conflicts.map((conflict) => (
                      <li
                        key={conflict.id}
                        className="rounded-md border border-gray-300 px-3 py-2"
                      >
                        <p className="text-sm font-medium text-ink">
                          {conflict.customerName} ·{" "}
                          {whatsappLabel(conflict.customerWhatsapp)}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          Acara {formatEventDate(conflict.eventDate)} ·{" "}
                          {STATUS_LABELS[conflict.status]}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          Sudah dibayar{" "}
                          {formatRupiah(conflict.verifiedPaymentRupiah)}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {conflict.occupiedDates.length > 0
                            ? `Menempati: ${conflict.occupiedDates
                                .map(
                                  (lock) =>
                                    `${formatEventDate(lock.date)} (${
                                      lock.kind === "EVENT" ? "acara" : "setup"
                                    })`,
                                )
                                .join(", ")}`
                            : "Belum mengunci tanggal target."}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <form
                action={confirmReservation}
                className="mt-6 flex flex-col gap-3 border-t border-gray-300 pt-4"
              >
                <input
                  type="hidden"
                  name="reservationId"
                  value={reservation.id}
                />
                <div>
                  <Button
                    type="submit"
                    disabled={!canSubmitConfirmation}
                  >
                    Konfirmasi reservasi
                  </Button>
                </div>
                {!canSubmitConfirmation ? (
                  <p className="text-xs text-gray-600">
                    Tombol aktif setelah DP minimum terpenuhi dan tanggal tidak
                    bentrok.
                  </p>
                ) : null}
              </form>
            </Card>
          ) : null}

          {reservation.status === "DITERIMA" ? (
            <Card>
              <h2 className="font-heading text-lg font-semibold text-ink">
                Reschedule
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Pindahkan tanggal acara sekali saja, maksimal satu bulan
                kalender sebelum tanggal acara saat ini.
              </p>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                    Tanggal acara saat ini
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {formatEventDate(reservation.eventDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                    Batas permintaan reschedule
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {formatEventDate(rescheduleDeadlineDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-gray-600">
                    Sisa jatah reschedule
                  </dt>
                  <dd className="mt-1 text-sm text-ink">
                    {rescheduleQuotaRemaining} dari 1
                  </dd>
                </div>
              </dl>

              {reservation.rescheduleCount >= 1 ? (
                <p className="mt-4 rounded-md border border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Reschedule sudah digunakan. Reservasi ini tidak dapat
                  dipindahkan lagi.
                </p>
              ) : null}

              {rescheduleDeadlinePassed ? (
                <p className="mt-4 rounded-md border border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Batas reschedule sudah lewat. Tanggal acara tidak dapat
                  dipindahkan lagi.
                </p>
              ) : null}

              {canSubmitReschedule ? (
                <form
                  action={rescheduleReservation}
                  className="mt-6 flex flex-col gap-4 border-t border-gray-300 pt-4"
                >
                  <input
                    type="hidden"
                    name="reservationId"
                    value={reservation.id}
                  />
                  <Input
                    id="reschedule-new-date"
                    label="Tanggal acara baru"
                    name="newEventDate"
                    type="date"
                    min={addDays(today, 1)}
                    required
                  />
                  <div>
                    <Button type="submit">Pindahkan tanggal</Button>
                  </div>
                </form>
              ) : null}
            </Card>
          ) : null}

          <Card>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Catatan tindak lanjut
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Catatan disimpan sebagai aktivitas admin dan tidak mengubah status
              reservasi.
            </p>

            {canAddNote ? (
              <form
                action={addFollowUpNote}
                className="mt-4 flex flex-col gap-4"
              >
                <input
                  type="hidden"
                  name="reservationId"
                  value={reservation.id}
                />
                <Textarea
                  id="follow-up-note"
                  label="Catatan"
                  name="note"
                  required
                  maxLength={1000}
                  placeholder="Contoh: Sudah dihubungi via WhatsApp, menunggu konfirmasi pembayaran."
                />
                <div>
                  <Button type="submit">Simpan catatan</Button>
                </div>
              </form>
            ) : (
              <p className="mt-4 text-sm text-gray-600">
                Catatan hanya dapat ditambahkan pada reservasi berstatus menunggu
                atau ditangguhkan.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Catatan setup
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Catatan internal untuk persiapan venue. Hanya terlihat admin dan
              tidak mengubah status, jadwal, pembayaran, atau timer auto-cancel.
            </p>

            {reservation.setupNote ? (
              <div className="mt-4 rounded-md border border-gray-300 bg-gray-50 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm text-ink">
                  {reservation.setupNote.note}
                </p>
                <p className="mt-2 text-xs text-gray-600">
                  Diperbarui {formatDateTime(reservation.setupNote.updatedAt)}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-600">
                Belum ada catatan setup untuk reservasi ini.
              </p>
            )}

            <form
              action={saveSetupNote}
              className="mt-4 flex flex-col gap-4 border-t border-gray-300 pt-4"
            >
              <input
                type="hidden"
                name="reservationId"
                value={reservation.id}
              />
              <Textarea
                id="setup-note"
                label="Catatan setup"
                name="note"
                required
                maxLength={1000}
                defaultValue={reservation.setupNote?.note ?? ""}
                placeholder="Contoh: Meja registrasi di lobi utama, sound check pukul 15.00."
              />
              <div>
                <Button type="submit">Simpan catatan setup</Button>
              </div>
            </form>
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Tindakan status
            </h2>

            {!canSuspend &&
            !canCancel &&
            !canCancelAccepted &&
            !canComplete ? (
              <p className="mt-4 text-sm text-gray-600">
                Tidak ada tindakan status yang tersedia untuk reservasi ini.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-6">
                {canSuspend ? (
                  <form
                    action={suspendReservation}
                    className="flex flex-col gap-4"
                  >
                    <input
                      type="hidden"
                      name="reservationId"
                      value={reservation.id}
                    />
                    <Textarea
                      id="suspend-reason"
                      label="Alasan penangguhan"
                      name="reason"
                      required
                      maxLength={1000}
                      placeholder="Contoh: Menunggu kelengkapan dokumen."
                    />
                    <div>
                      <Button type="submit" variant="outline">
                        Tangguhkan reservasi
                      </Button>
                    </div>
                  </form>
                ) : null}

                {canCancel ? (
                  <form
                    action={cancelReservation}
                    className={
                      canSuspend
                        ? "flex flex-col gap-4 border-t border-gray-300 pt-4"
                        : "flex flex-col gap-4"
                    }
                  >
                    <input
                      type="hidden"
                      name="reservationId"
                      value={reservation.id}
                    />
                    <Select
                      id="cancellation-reason-code"
                      label="Kode alasan pembatalan"
                      name="reasonCode"
                      defaultValue="MUNDUR_CUSTOMER"
                      required
                    >
                      <option value="MUNDUR_CUSTOMER">Customer mundur</option>
                      <option value="DITOLAK_VENUE">Ditolak venue</option>
                    </Select>
                    <Textarea
                      id="cancellation-reason"
                      label="Alasan pembatalan"
                      name="reason"
                      required
                      maxLength={1000}
                      placeholder="Tuliskan alasan pembatalan."
                    />
                    <div>
                      <Button type="submit" variant="ghost">
                        Batalkan reservasi
                      </Button>
                    </div>
                  </form>
                ) : null}

                {canComplete ? (
                  <form
                    action={completeReservation}
                    className="flex flex-col gap-4 border-t border-gray-300 pt-4"
                  >
                    <input
                      type="hidden"
                      name="reservationId"
                      value={reservation.id}
                    />
                    <p className="text-sm text-gray-600">
                      Tandai reservasi ini selesai karena tanggal acara sudah
                      lewat.
                    </p>
                    <div>
                      <Button type="submit">Tandai selesai</Button>
                    </div>
                  </form>
                ) : null}

                {canCancelAccepted ? (
                  <form
                    action={cancelAcceptedReservation}
                    className="flex flex-col gap-4"
                  >
                    <input
                      type="hidden"
                      name="reservationId"
                      value={reservation.id}
                    />
                    <input
                      type="hidden"
                      name="reasonCode"
                      value="MUNDUR_CUSTOMER"
                    />
                    <p className="text-sm text-ink">Pihak: Customer</p>
                    <Textarea
                      id="accepted-cancellation-reason"
                      label="Alasan pembatalan"
                      name="reason"
                      required
                      maxLength={1000}
                      placeholder="Tuliskan alasan pembatalan oleh customer."
                    />
                    <div>
                      <Button type="submit" variant="ghost">
                        Batalkan dan tandai DP hangus
                      </Button>
                    </div>
                  </form>
                ) : null}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
