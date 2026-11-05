"use client";

import Link from "next/link";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
} from "@/components/ui";
import { formatNumber, formatRupiah } from "@/lib/format";
import type {
  DashboardData,
  DashboardFollowUpReason,
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

const MONTH_SHORT_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
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

const VOLUME_CARDS: Array<{
  key:
    | "total"
    | "pending"
    | "suspended"
    | "accepted"
    | "completed"
    | "cancelled";
  label: string;
  className: string;
}> = [
  { key: "total", label: "Total Job Masuk", className: "bg-white" },
  { key: "pending", label: "Menunggu", className: "bg-status-pending" },
  { key: "suspended", label: "Ditangguhkan", className: "bg-status-suspended" },
  { key: "accepted", label: "Diterima", className: "bg-status-accepted" },
  { key: "completed", label: "Selesai", className: "bg-white" },
  { key: "cancelled", label: "Dibatalkan", className: "bg-status-cancelled" },
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

function StatCard({
  label,
  value,
  hint,
  testId,
  className = "bg-white",
}: {
  label: string;
  value: string;
  hint?: string;
  testId?: string;
  className?: string;
}) {
  return (
    <div
      data-stat-card={testId}
      className={`rounded-md p-5 shadow-sm ${className}`}
    >
      <p className="text-sm font-medium text-ink">{label}</p>
      <p
        data-testid={testId}
        className="mt-3 font-heading text-3xl font-semibold text-ink"
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-gray-600">{hint}</p> : null}
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
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
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
  const { stats } = data;
  const calendarHref = data.agendaMonth
    ? `/admin/kalender/${data.agendaMonth.slice(0, 4)}/${data.agendaMonth.slice(5, 7)}`
    : `/admin/kalender?year=${data.year}`;

  const groupedAgenda = new Map<string, typeof data.agenda>();
  if (data.agendaMonth === null) {
    for (const item of data.agenda) {
      const month = item.eventDate.slice(0, 7);
      const items = groupedAgenda.get(month) ?? [];
      items.push(item);
      groupedAgenda.set(month, items);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Ringkasan Tahun {data.year}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Semua widget mengikuti tahun acara yang dipilih.
            </p>
          </div>

          <form action="/admin" method="get" className="flex items-end gap-2">
            <div className="min-w-36">
              <Select label="Filter tahun" name="tahun" defaultValue={data.year}>
                {data.availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline">
              Terapkan
            </Button>
          </form>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {VOLUME_CARDS.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={formatNumber(stats[card.key])}
            testId={`dashboard-${card.key}`}
            className={card.className}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Nilai Diterima"
          value={formatRupiah(stats.acceptedValueRupiah)}
          hint="Paket + item biaya (Diterima & Selesai)"
          testId="dashboard-accepted-value"
        />
        <StatCard
          label="Pembayaran Masuk / DP"
          value={formatRupiah(stats.verifiedPaymentRupiah)}
          hint="Pembayaran terverifikasi"
          testId="dashboard-verified-payment"
        />
        <StatCard
          label="Sisa Piutang"
          value={formatRupiah(stats.remainingRupiah)}
          hint="Nilai diterima − pembayaran masuk"
          testId="dashboard-remaining"
        />
        <StatCard
          label="Konversi"
          value={`${stats.conversionPercent}%`}
          hint="Diterima & Selesai ÷ total masuk"
          testId="dashboard-conversion"
        />
        <StatCard
          label="Rata-rata Nilai"
          value={formatRupiah(stats.averageValueRupiah)}
          hint="Per reservasi diterima/selesai"
          testId="dashboard-average-value"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-ink">
              Agenda Reservasi {data.year}
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              {data.agendaMonth
                ? monthLabel(data.agendaMonth)
                : "Semua bulan"}{" "}
              · {data.agenda.length} agenda
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <form action="/admin" method="get" className="flex items-end gap-2">
              <input type="hidden" name="tahun" value={data.year} />
              <div className="min-w-36">
                <Select
                  label="Filter bulan"
                  name="agenda"
                  defaultValue={data.agendaMonth ?? ""}
                >
                  <option value="">Semua bulan</option>
                  {MONTH_NAMES.map((name, index) => {
                    const value = `${data.year}-${String(index + 1).padStart(2, "0")}`;
                    return (
                      <option key={value} value={value}>
                        {name}
                      </option>
                    );
                  })}
                </Select>
              </div>
              <Button type="submit" variant="outline">
                Terapkan
              </Button>
            </form>
            <Link
              href={calendarHref}
              className="pb-2 text-xs font-medium text-gold-700 underline"
            >
              Lihat semua
            </Link>
          </div>
        </div>

        {data.agenda.length === 0 ? (
          <WidgetEmpty
            title="Belum ada agenda"
            description="Reservasi diterima dan selesai pada periode ini akan tampil di sini."
          />
        ) : data.agendaMonth === null ? (
          <div className="mt-4 space-y-6">
            {Array.from(groupedAgenda.entries()).map(([month, items]) => (
              <div key={month}>
                <h3 className="text-sm font-semibold text-ink">
                  {MONTH_NAMES[Number(month.slice(5, 7)) - 1]}{" "}
                  <span className="font-normal text-gray-600">
                    ({items.length})
                  </span>
                </h3>
                <AgendaList items={items} />
              </div>
            ))}
          </div>
        ) : (
          <AgendaList items={data.agenda} />
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
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
            <ul className="mt-4 divide-y divide-gray-300">
              {data.recentReservations.map((item) => (
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
                    {eventTypeLabel(item.eventType)} · {formatDate(item.eventDate)}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {formatRupiah(item.totalRupiah)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function AgendaList({
  items,
}: {
  items: DashboardData["agenda"];
}) {
  return (
    <ul className="mt-3 divide-y divide-gray-300">
      {items.map((item) => {
        const day = item.eventDate.slice(8, 10);
        const monthName =
          MONTH_SHORT_NAMES[Number(item.eventDate.slice(5, 7)) - 1];
        return (
          <li key={item.id}>
            <Link
              href={`/admin/reservasi/${encodeURIComponent(item.id)}`}
              className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0 hover:bg-gold-100/40"
            >
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-gold-100">
                <span className="font-heading text-base font-semibold text-ink">
                  {day}
                </span>
                <span className="text-[10px] uppercase text-gray-600">
                  {monthName}
                </span>
              </div>
              <div className="min-w-52 flex-1">
                <p className="font-medium text-ink">{item.customerName}</p>
                <p className="mt-1 text-xs text-gray-600">
                  {eventTypeLabel(item.eventType)} · {item.packageName}
                </p>
                {item.setupDates.length > 0 ? (
                  <p className="mt-1 text-xs text-gray-600">
                    Setup: {item.setupDates.map(formatDate).join(", ")}
                  </p>
                ) : null}
              </div>
              <Badge status={STATUS_BADGES[item.status]}>
                {STATUS_LABELS[item.status]}
              </Badge>
              <span aria-hidden="true" className="text-gray-600">
                →
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
