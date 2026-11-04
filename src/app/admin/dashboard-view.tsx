"use client";

import Link from "next/link";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
} from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import type {
  DashboardData,
  DashboardFollowUpReason,
  DashboardStatusCards,
  ReservationStatus,
} from "@/modules/reservation/types";
import {
  GALLERY_CATEGORY_LABELS,
  type GalleryCategory,
} from "@/modules/venue/types";

export type DashboardStatus = "empty" | "loading" | "error";

export interface DashboardViewProps {
  data?: DashboardData;
  /** Keadaan khusus untuk tes tampilan; data tetap dipakai bila tersedia. */
  status?: DashboardStatus;
  onRetry?: () => void;
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

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

const ACTIVE_SEGMENTS: Array<{
  key: "pending" | "suspended" | "accepted";
  label: string;
  className: string;
}> = [
  { key: "pending", label: "menunggu", className: "bg-gold-500" },
  { key: "accepted", label: "diterima", className: "bg-emerald-500" },
  { key: "suspended", label: "ditangguhkan", className: "bg-blue-500" },
];

const STATUS_CARDS: Array<{
  key: keyof DashboardStatusCards;
  label: string;
  className: string;
}> = [
  {
    key: "pending",
    label: "Menunggu",
    className: "bg-status-pending",
  },
  {
    key: "accepted",
    label: "Diterima",
    className: "bg-status-accepted",
  },
  {
    key: "suspended",
    label: "Ditangguhkan",
    className: "bg-status-suspended",
  },
  {
    key: "cancelled",
    label: "Dibatalkan",
    className: "bg-status-cancelled",
  },
];

const FOLLOW_UP_REASON_LABELS: Record<DashboardFollowUpReason, string> = {
  PENDING: "Permintaan menunggu",
  PERLU_PEMERIKSAAN: "Perlu diperiksa",
};

const FOLLOW_UP_REASON_CLASSES: Record<DashboardFollowUpReason, string> = {
  PENDING: "bg-status-pending",
  PERLU_PEMERIKSAAN: "bg-status-cancelled",
};

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${MONTH_NAMES[Number(monthNumber) - 1]} ${year}`;
}

function formatDate(date: string): string {
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

function followUpReasonLabel(reason: DashboardFollowUpReason): string {
  return FOLLOW_UP_REASON_LABELS[reason];
}

function WidgetEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-white/60 px-4 py-6 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs text-gray-600">{description}</p>
    </div>
  );
}

export function DashboardView({
  data,
  status,
  onRetry,
}: DashboardViewProps) {
  return (
    <section className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-ink">
        Dashboard
      </h1>

      {status === "loading" ? (
        <div aria-label="Memuat dashboard" className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : status === "error" ? (
        <ErrorState message="Gagal memuat data dashboard." onRetry={onRetry} />
      ) : status === "empty" || !data ? (
        <EmptyState
          title="Belum ada data"
          description="Ringkasan, agenda, tindak lanjut, dan reservasi terbaru akan tampil di sini setelah ada data."
        />
      ) : (
        <DashboardContent data={data} />
      )}
    </section>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  const calendarHref = data.month
    ? `/admin/kalender?bulan=${data.month}`
    : "/admin/kalender";
  const composition = ACTIVE_SEGMENTS.map(
    (segment) => `${data.statusCards[segment.key]} ${segment.label}`,
  ).join(", ");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Ringkasan Reservasi
            </h2>
            <div className="mt-4 flex flex-wrap items-baseline gap-2">
              <span
                data-testid="dashboard-active-count"
                className="font-heading text-4xl font-semibold text-ink"
              >
                {data.activeCount}
              </span>
              <span className="text-sm text-gray-600">reservasi aktif</span>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              {data.statusCards.pending} menunggu ·{" "}
              {data.statusCards.suspended} ditangguhkan ·{" "}
              {data.statusCards.accepted} diterima
            </p>
          </div>

          <form action="/admin" method="get" className="flex items-end gap-2">
            <div className="min-w-44">
              <Input
                label="Filter bulan"
                name="bulan"
                type="month"
                defaultValue={data.month ?? ""}
              />
            </div>
            <Button type="submit" variant="outline">
              Terapkan
            </Button>
          </form>
        </div>

        <div
          role="img"
          aria-label={`Komposisi status aktif: ${composition}`}
          className="mt-6 flex h-2.5 overflow-hidden rounded-full bg-gray-300"
        >
          {data.activeCount > 0
            ? ACTIVE_SEGMENTS.map((segment) => (
                <span
                  key={segment.key}
                  data-status-segment={segment.key}
                  className={segment.className}
                  style={{
                    width: `${(data.statusCards[segment.key] / data.activeCount) * 100}%`,
                  }}
                />
              ))
            : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
          {ACTIVE_SEGMENTS.map((segment) => (
            <span key={segment.key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-block h-2.5 w-2.5 rounded-full ${segment.className}`}
              />
              {data.statusCards[segment.key]} {segment.label}
            </span>
          ))}
          {data.month ? (
            <span className="ml-auto font-medium text-ink">
              {monthLabel(data.month)}
            </span>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATUS_CARDS.map((card) => (
          <div
            key={card.key}
            data-status-card={card.key}
            className={`rounded-md p-5 ${card.className}`}
          >
            <p className="text-sm font-medium text-ink">{card.label}</p>
            <p className="mt-3 font-heading text-3xl font-semibold text-ink">
              {data.statusCards[card.key]}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold text-ink">
              Agenda Mendatang
            </h2>
            <Link
              href={calendarHref}
              className="text-xs font-medium text-gold-700 underline"
            >
              Lihat Kalender
            </Link>
          </div>

          {data.agenda.length === 0 ? (
            <WidgetEmpty
              title="Belum ada agenda"
              description="Agenda reservasi diterima yang akan datang akan tampil di sini."
            />
          ) : (
            <ul className="mt-4 divide-y divide-gray-300">
              {data.agenda.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-52 flex-1">
                    <Link
                      href={`/admin/reservasi/${encodeURIComponent(item.id)}`}
                      className="font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {item.customerName}
                    </Link>
                    <p className="mt-1 text-xs text-gray-600">
                      {eventTypeLabel(item.eventType)} · {item.packageName}
                    </p>
                    {item.setupDates.length > 0 ? (
                      <p className="mt-1 text-xs text-gray-600">
                        Setup: {item.setupDates.map(formatDate).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-ink">
                      {formatDate(item.eventDate)}
                    </p>
                    <p className="mt-1">
                      <Badge status="accepted">Diterima</Badge>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold text-ink">
              Perlu Tindak Lanjut
            </h2>
            <span className="text-xs text-gray-600">
              {data.followUps.length} reservasi
            </span>
          </div>

          {data.followUps.length === 0 ? (
            <WidgetEmpty
              title="Tidak ada tindak lanjut"
              description="Permintaan menunggu, pembayaran, dan pemeriksaan admin akan tampil di sini."
            />
          ) : (
            <ul className="mt-4 divide-y divide-gray-300">
              {data.followUps.map((item) => (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link
                      href={`/admin/reservasi/${encodeURIComponent(item.id)}`}
                      className="font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {item.customerName}
                    </Link>
                    <Badge status={STATUS_BADGES[item.status]}>
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {item.packageName} · {formatDate(item.eventDate)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.reasons.map((reason) => (
                      <span
                        key={reason}
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium text-ink ${FOLLOW_UP_REASON_CLASSES[reason]}`}
                      >
                        {followUpReasonLabel(reason)}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-ink">
            Reservasi Terbaru
          </h2>
          <Link
            href="/admin/reservasi"
            className="text-xs font-medium text-gold-700 underline"
          >
            Lihat Semua
          </Link>
        </div>

        {data.recentReservations.length === 0 ? (
          <WidgetEmpty
            title="Belum ada reservasi"
            description="Reservasi yang masuk akan tampil di sini."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Reservasi terbaru</caption>
              <thead className="text-gray-600">
                <tr>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Paket</th>
                  <th className="py-2 pr-4">Tanggal Acara</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.recentReservations.map((reservation) => (
                  <tr
                    key={reservation.id}
                    className="border-t border-gray-300 align-top"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/reservasi/${encodeURIComponent(reservation.id)}`}
                        className="font-medium text-ink underline-offset-2 hover:underline"
                      >
                        {reservation.customerName}
                      </Link>
                      <p className="mt-1 text-xs text-gray-600">
                        {reservation.customerWhatsapp}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-ink">{reservation.packageName}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {eventTypeLabel(reservation.eventType)}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {formatDate(reservation.eventDate)}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {formatRupiah(reservation.totalRupiah)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge status={STATUS_BADGES[reservation.status]}>
                        {STATUS_LABELS[reservation.status]}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/admin/reservasi/${encodeURIComponent(reservation.id)}`}
                        aria-label={`Detail reservasi ${reservation.customerName}`}
                        className="text-sm font-medium text-gold-700 underline"
                      >
                        Detail
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
