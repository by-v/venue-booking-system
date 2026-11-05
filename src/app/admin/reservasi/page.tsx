import Link from "next/link";

import { Badge, Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { AdminPageHeader } from "../admin-page-header";
import { formatRupiah } from "@/lib/format";
import { requireAdminSession } from "@/modules/auth";
import { listReservations } from "@/modules/reservation/queries";
import {
  RESERVATION_LIST_FILTERS,
  type PaymentStatus,
  type ReservationListFilter,
  type ReservationSource,
  type ReservationStatus,
} from "@/modules/reservation/types";
import {
  GALLERY_CATEGORY_LABELS,
  type GalleryCategory,
} from "@/modules/venue/types";

const FILTER_LABELS: Record<ReservationListFilter, string> = {
  proses: "Diproses",
  diterima: "Diterima",
  dibatalkan: "Dibatalkan",
  semua: "Semua",
};

const FILTER_HEADINGS: Record<ReservationListFilter, string> = {
  proses: "Reservasi diproses",
  diterima: "Reservasi diterima",
  dibatalkan: "Reservasi dibatalkan",
  semua: "Semua reservasi",
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: "Menunggu",
  DITANGGUHKAN: "Ditangguhkan",
  DITERIMA: "Diterima",
  DIBATALKAN: "Dibatalkan",
  AUTO_CANCELLED: "Dibatalkan otomatis",
  SELESAI: "Selesai",
};

const STATUS_BADGES: Record<
  ReservationStatus,
  "pending" | "accepted" | "suspended" | "cancelled"
> = {
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

const SOURCE_LABELS: Record<ReservationSource, string> = {
  FORM_PUBLIK: "Form publik",
  INPUT_ADMIN: "Input admin",
};

function formatEventDate(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function eventTypeLabel(eventType: GalleryCategory): string {
  return GALLERY_CATEGORY_LABELS[eventType];
}

function resolveFilter(value: string | undefined): ReservationListFilter {
  return RESERVATION_LIST_FILTERS.includes(value as ReservationListFilter)
    ? (value as ReservationListFilter)
    : "proses";
}

/**
 * Daftar reservasi admin (design D6). Filter default adalah reservasi yang
 * masih diproses. Halaman ini hanya membaca; aksi tulis ada di detail.
 */
export default async function ReservasiAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  await requireAdminSession();

  const { q, filter: rawFilter } = await searchParams;
  const search = (q ?? "").trim();
  const filter = resolveFilter(rawFilter);
  const reservations = await listReservations({ filter, search });
  const clearSearchHref =
    filter === "proses"
      ? "/admin/reservasi"
      : `/admin/reservasi?filter=${filter}`;
  const emptyTitle =
    search.length > 0
      ? "Tidak ada reservasi yang cocok"
      : filter === "semua"
        ? "Belum ada reservasi"
        : `Belum ada reservasi ${FILTER_LABELS[filter].toLowerCase()}`;

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        overline="Manajemen reservasi"
        title="Reservasi"
        description="Tinjau pengajuan, catat pembayaran, dan kelola status reservasi."
        actions={
          <Link
            href="/admin/reservasi/baru"
            className="neu-button neu-button-primary px-4 py-2 text-sm font-semibold"
          >
            <span aria-hidden="true" className="mr-1.5 text-base leading-none">
              +
            </span>
            Input reservasi
          </Link>
        }
      />

      <Card>
        <form
          action="/admin/reservasi"
          method="get"
          role="search"
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-44">
            <Select label="Filter status" name="filter" defaultValue={filter}>
              {RESERVATION_LIST_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {FILTER_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-64 flex-1">
            <Input
              label="Cari reservasi"
              name="q"
              type="search"
              defaultValue={search}
              placeholder="Nama, nomor WhatsApp, atau nomor booking"
            />
          </div>
          <Button type="submit">Terapkan</Button>
          {search.length > 0 ? (
            <Link
              href={clearSearchHref}
              className="neu-button neu-button-ghost px-4 py-2 text-sm font-medium"
            >
              Hapus pencarian
            </Link>
          ) : null}
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold text-ink">
            {FILTER_HEADINGS[filter]}
          </h2>
          <span className="neu-pill px-3 py-1 text-xs text-gray-600">
            {reservations.length} reservasi
          </span>
        </div>

        {reservations.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title={emptyTitle}
              description={
                search.length > 0
                  ? "Coba kata kunci lain atau ubah filter status."
                  : "Reservasi dari form publik akan muncul di sini."
              }
              action={
                search.length > 0 ? (
                  <Link
                    href={clearSearchHref}
                    className="text-sm font-medium text-gold-700 underline"
                  >
                    Hapus pencarian
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="neu-table-wrap mt-4 overflow-x-auto p-2">
            <table className="neu-table min-w-[980px] text-left text-sm">
              <thead className="text-gray-600">
                <tr>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Tanggal acara</th>
                  <th className="py-2 pr-4">Paket</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Pembayaran</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr
                    key={reservation.id}
                    className="border-t border-gray-300 align-top"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-medium text-ink">
                        {reservation.customerName}
                      </p>
                      {reservation.bookingNumber ? (
                        <p className="mt-1 font-mono text-xs text-gray-600">
                          {reservation.bookingNumber}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-gray-600">
                        {reservation.customerWhatsapp}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {formatEventDate(reservation.eventDate)}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-ink">{reservation.packageName}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {eventTypeLabel(reservation.eventType)}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {formatRupiah(reservation.totalRupiah)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        status={PAYMENT_STATUS_BADGES[reservation.paymentStatus]}
                      >
                        {PAYMENT_STATUS_LABELS[reservation.paymentStatus]}
                      </Badge>
                      <p className="mt-1 text-xs text-gray-600">
                        Terverifikasi{" "}
                        {formatRupiah(reservation.verifiedPaymentRupiah)}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge status={STATUS_BADGES[reservation.status]}>
                        {STATUS_LABELS[reservation.status]}
                      </Badge>
                      <p className="mt-1 text-xs text-gray-600">
                        {SOURCE_LABELS[reservation.source]}
                      </p>
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/admin/reservasi/${encodeURIComponent(reservation.id)}`}
                        aria-label={`Detail reservasi ${reservation.customerName}`}
                        className="neu-button neu-button-ghost inline-flex px-3 py-1.5 text-sm font-medium"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
