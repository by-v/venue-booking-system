"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, type BadgeStatus } from "@/components/ui";
import type {
  CalendarDay,
  CalendarEventEntry,
  MonthCalendarStats,
} from "@/modules/calendar/queries";
import { GALLERY_CATEGORY_LABELS } from "@/modules/venue/types";

export interface MonthDetailViewProps {
  year: number;
  month: number;
  days: CalendarDay[];
  stats: MonthCalendarStats;
  today: string;
}

type FilterKey = "semua" | "diterima" | "pending" | "ditangguhkan" | "dibatalkan";
type StatusFilterKey = Exclude<FilterKey, "semua">;

const MONTHS = [
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

const WEEKDAYS = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
] as const;

const WEEKDAYS_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;

const FILTER_OPTIONS: Array<{
  key: StatusFilterKey;
  label: string;
  activeClass: string;
  dotClass: string;
}> = [
  {
    key: "diterima",
    label: "Diterima",
    activeClass: "bg-status-accepted text-ink ring-1 ring-emerald-500/40",
    dotClass: "bg-emerald-500",
  },
  {
    key: "pending",
    label: "Menunggu",
    activeClass: "bg-status-pending text-ink ring-1 ring-gold-500/50",
    dotClass: "bg-gold-500",
  },
  {
    key: "ditangguhkan",
    label: "Ditangguhkan",
    activeClass: "bg-status-suspended text-ink ring-1 ring-blue-500/40",
    dotClass: "bg-blue-500",
  },
  {
    key: "dibatalkan",
    label: "Dibatalkan",
    activeClass: "bg-status-cancelled text-ink ring-1 ring-red-500/40",
    dotClass: "bg-red-500",
  },
];

interface StatusMeta {
  label: string;
  badge: BadgeStatus;
  chipClass: string;
  dotClass: string;
  filter: StatusFilterKey;
}

function statusMeta(status: string): StatusMeta {
  switch (status) {
    case "DITERIMA":
      return {
        label: "Diterima",
        badge: "accepted",
        chipClass: "border-emerald-200 bg-status-accepted text-ink",
        dotClass: "bg-emerald-500",
        filter: "diterima",
      };
    case "SELESAI":
      return {
        label: "Selesai",
        badge: "accepted",
        chipClass: "border-emerald-200 bg-status-accepted text-ink",
        dotClass: "bg-emerald-500",
        filter: "diterima",
      };
    case "DITANGGUHKAN":
      return {
        label: "Ditangguhkan",
        badge: "suspended",
        chipClass: "border-blue-200 bg-status-suspended text-ink",
        dotClass: "bg-blue-500",
        filter: "ditangguhkan",
      };
    case "DIBATALKAN":
    case "AUTO_CANCELLED":
      return {
        label: "Dibatalkan",
        badge: "cancelled",
        chipClass: "border-red-200 bg-status-cancelled text-ink",
        dotClass: "bg-red-500",
        filter: "dibatalkan",
      };
    case "PENDING":
    default:
      return {
        label: "Menunggu",
        badge: "pending",
        chipClass: "border-gold-500/40 bg-status-pending text-ink",
        dotClass: "bg-gold-500",
        filter: "pending",
      };
  }
}

function matchesFilter(event: CalendarEventEntry, filter: FilterKey): boolean {
  return filter === "semua" || statusMeta(event.status).filter === filter;
}

function eventSecondaryLabel(event: CalendarEventEntry): string {
  if (event.status === "DITERIMA" || event.status === "SELESAI") {
    return `Durasi ${event.durationHours} jam`;
  }

  return statusMeta(event.status).label;
}

function eventTypeLabel(eventType: string): string {
  return (
    GALLERY_CATEGORY_LABELS[
      eventType as keyof typeof GALLERY_CATEGORY_LABELS
    ] ?? eventType
  );
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function weekdayLabel(date: string): string {
  const day = parseDate(date).getUTCDay();
  return WEEKDAYS[(day + 6) % 7];
}

function formatDayMonth(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(parseDate(date));
}

function formatDayMonthYear(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseDate(date));
}

function monthHref(year: number, month: number): string {
  return `/admin/kalender/${year}/${String(month).padStart(2, "0")}`;
}

/**
 * Tampilan kalender satu bulan untuk admin. Baca-saja: seluruh aksi hanya
 * navigasi bulan dan tautan menuju detail reservasi.
 */
export function MonthDetailView({
  year,
  month,
  days,
  stats,
  today,
}: MonthDetailViewProps) {
  const router = useRouter();
  const todayInViewedMonth = days.some((day) => day.inMonth && day.isToday);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    todayInViewedMonth ? today : null
  );
  const [filter, setFilter] = useState<FilterKey>("semua");

  const monthName = MONTHS[month - 1];
  const selectedDay = selectedDate
    ? days.find((day) => day.date === selectedDate) ?? null
    : null;
  const showSetups = filter === "semua";
  const visibleSelectedEvents =
    selectedDay?.events.filter((event) => matchesFilter(event, filter)) ?? [];
  const visibleSelectedSetups = showSetups ? selectedDay?.setups ?? [] : [];
  const selectedAgendaCount =
    visibleSelectedEvents.length + visibleSelectedSetups.length;

  const goToMonth = (targetYear: number, targetMonth: number) => {
    router.push(monthHref(targetYear, targetMonth));
  };

  const shiftMonth = (delta: number) => {
    const absolute = year * 12 + (month - 1) + delta;
    const targetYear = Math.floor(absolute / 12);
    const targetMonth = ((absolute % 12) + 12) % 12 + 1;
    goToMonth(targetYear, targetMonth);
  };

  const goToToday = () => {
    const [todayYear, todayMonth] = today.split("-").map(Number);
    setSelectedDate(today);
    goToMonth(todayYear, todayMonth);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-gray-300 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-ink">
              {monthName} {year}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {stats.active} reservasi aktif · {stats.diterima} diterima ·{" "}
              {stats.pending} menunggu · {stats.ditangguhkan} ditangguhkan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Bulan sebelumnya"
              className="rounded-lg border border-gray-300 p-2 text-gray-600 transition-colors hover:bg-ivory"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <select
              value={month}
              onChange={(event) => goToMonth(year, Number(event.target.value))}
              aria-label="Pilih bulan"
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-ink focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name} {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Bulan berikutnya"
              className="rounded-lg border border-gray-300 p-2 text-gray-600 transition-colors hover:bg-ivory"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <span aria-hidden="true" className="mx-1 h-6 w-px bg-gray-300" />

            <button
              type="button"
              onClick={goToToday}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-ivory"
            >
              Hari ini
            </button>
            <Link
              href={`/admin/kalender?year=${year}`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-ivory"
            >
              Tahun
            </Link>
            <span className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white">
              Bulan
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/kalender?year=${year}`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-ivory"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Semua bulan
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((option) => {
            const active = filter === option.key;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? option.activeClass
                    : "bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-ivory"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${option.dotClass}`}
                />
                {option.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setFilter("semua")}
            aria-pressed={filter === "semua"}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "semua"
                ? "bg-ink text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-300 hover:bg-ivory"
            }`}
          >
            Semua
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-xl border border-gray-300 bg-white">
          <div className="grid grid-cols-7 border-b border-gray-300 bg-ivory/60 py-2 text-center text-xs font-medium text-gray-600">
            {WEEKDAYS_SHORT.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-300">
            {days.map((day) => (
              <DayCell
                key={day.date}
                day={day}
                filter={filter}
                selected={selectedDate === day.date}
                showSetups={showSetups}
                onSelect={() => setSelectedDate(day.date)}
              />
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-gray-300 bg-white p-5">
          {selectedDay ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-600">
                Tanggal terpilih
              </p>
              <h2 className="mt-2 font-heading text-xl font-semibold text-ink">
                {weekdayLabel(selectedDay.date)}, {formatDayMonthYear(selectedDay.date)}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {selectedAgendaCount} agenda
                {filter === "semua" ? "" : ` · filter ${FILTER_OPTIONS.find((option) => option.key === filter)?.label.toLowerCase()}`}
              </p>

              {selectedAgendaCount === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-gray-300 bg-ivory/50 px-4 py-8 text-center">
                  <p className="text-sm text-gray-600">
                    Tidak ada agenda pada tanggal ini.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {visibleSelectedEvents.map((event) => (
                    <EventDetailCard key={event.id} event={event} />
                  ))}

                  {visibleSelectedSetups.map((setup) => (
                    <div
                      key={`setup-${setup.reservationId}`}
                      className="rounded-lg border border-dashed border-gray-300 bg-ivory/50 p-4"
                    >
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-600">
                        Persiapan gedung
                      </p>
                      <h3 className="mt-2 font-semibold text-ink">
                        {setup.customerName}
                      </h3>
                      <Link
                        href={`/admin/reservasi/${setup.reservationId}`}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold-700 hover:text-gold-500"
                      >
                        Lihat Reservasi
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H8M17 7v9" />
                        </svg>
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 rounded-lg bg-ivory/70 p-3 text-xs text-gray-600">
                <p>Tanggal yang diterima mengunci tanggal acara dan setup.</p>
                <p className="mt-1">
                  Pending dan ditangguhkan tidak mengunci tanggal.
                </p>
              </div>
            </>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <svg
                className="h-12 w-12 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-4 text-sm text-gray-600">
                Pilih tanggal untuk melihat detail agenda.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

interface DayCellProps {
  day: CalendarDay;
  filter: FilterKey;
  selected: boolean;
  showSetups: boolean;
  onSelect: () => void;
}

function DayCell({ day, filter, selected, showSetups, onSelect }: DayCellProps) {
  const dayNumber = Number(day.date.slice(8, 10));
  const visibleEvents = day.events.filter((event) => matchesFilter(event, filter));
  const visibleSetups = showSetups ? day.setups : [];
  const totalChips = visibleEvents.length + visibleSetups.length;
  const maxChips = 2;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Pilih tanggal ${formatDayMonthYear(day.date)}`}
      className={`min-h-[112px] p-2 text-left align-top transition-colors ${
        selected
          ? "bg-gold-100/40 ring-2 ring-inset ring-gold-500"
          : day.inMonth
            ? "bg-white hover:bg-ivory/60"
            : "bg-ivory/50 hover:bg-ivory"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium ${
            day.isToday
              ? "bg-ink text-white"
              : day.inMonth
                ? "text-ink"
                : "text-gray-600/70"
          }`}
        >
          {dayNumber}
        </span>

        {totalChips > 0 ? (
          <span className="text-[10px] text-gray-600/70">{totalChips}</span>
        ) : null}
      </div>

      <div className="mt-1 space-y-1">
        {visibleEvents.slice(0, maxChips).map((event) => {
          const meta = statusMeta(event.status);

          return (
            <div
              key={event.id}
              className={`rounded border px-1.5 py-1 text-[11px] leading-tight ${meta.chipClass} ${
                day.inMonth ? "" : "opacity-60"
              }`}
            >
              <p className="truncate font-semibold">{event.shortName}</p>
              <p className="truncate opacity-75">{eventSecondaryLabel(event)}</p>
            </div>
          );
        })}

        {visibleSetups
          .slice(0, Math.max(0, maxChips - visibleEvents.slice(0, maxChips).length))
          .map((setup) => (
            <div
              key={`setup-${setup.reservationId}`}
              className={`rounded border border-gray-300 bg-ivory px-1.5 py-1 text-[11px] leading-tight text-gray-600 ${
                day.inMonth ? "" : "opacity-60"
              }`}
            >
              <p className="truncate font-semibold">Setup</p>
              <p className="truncate opacity-75">{setup.shortName}</p>
            </div>
          ))}

        {totalChips > maxChips ? (
          <p className="text-[10px] text-gray-600">+{totalChips - maxChips} lagi</p>
        ) : null}
      </div>
    </button>
  );
}

function EventDetailCard({ event }: { event: CalendarEventEntry }) {
  const meta = statusMeta(event.status);

  return (
    <article className="rounded-lg border border-gray-300 bg-white p-4">
      <Badge status={meta.badge}>{meta.label}</Badge>

      <h3 className="mt-3 font-semibold text-ink">{event.customerName}</h3>
      <p className="mt-1 text-sm text-gray-600">
        {eventTypeLabel(event.eventType)}
      </p>
      <p className="mt-1 text-sm text-gray-600">{event.packageName}</p>

      <dl className="mt-4 space-y-3 border-t border-gray-300 pt-3">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-gray-600">
            Durasi acara
          </dt>
          <dd className="mt-1 text-sm font-semibold text-ink">
            {event.durationHours} jam
          </dd>
        </div>

        {event.setupDates.length > 0 ? (
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-gray-600">
              Persiapan gedung
            </dt>
            <dd className="mt-1 text-sm font-semibold text-ink">
              {event.setupDates.map(formatDayMonth).join(", ")}
            </dd>
          </div>
        ) : null}
      </dl>

      <Link
        href={`/admin/reservasi/${event.id}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gold-700 hover:text-gold-500"
      >
        Lihat Reservasi
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H8M17 7v9" />
        </svg>
      </Link>
    </article>
  );
}
