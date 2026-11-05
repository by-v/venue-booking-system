"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MonthSummary } from "@/modules/calendar/queries";

export interface YearOverviewViewProps {
  initialYear?: number;
  summaries: MonthSummary[];
}

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

const WEEKDAYS_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;

/**
 * Year overview kalender admin - menampilkan 12 bulan dalam grid.
 * Gaya visual mengikuti tema Neumorphism admin: panel raised, mini calendar
 * inset, dan filter berbentuk soft pill.
 */
export function YearOverviewView({
  initialYear = 2026,
  summaries,
}: YearOverviewViewProps) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [activeTab, setActiveTab] = useState<"today" | "year" | "month">("year");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    router.push(`/admin/kalender?year=${year}`);
  };

  const tabClass = (tab: "today" | "year" | "month") =>
    `neu-chip px-4 py-2 text-sm font-medium ${
      activeTab === tab ? "text-gold-700" : ""
    }`;

  return (
    <section className="flex flex-col gap-5">
      <div className="neu-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="neu-overline">Agenda tahunan</p>
            <h1 className="neu-title mt-1 text-2xl">Kalender</h1>
            <p className="mt-1 text-sm text-gray-600">
              Gedung H.A. Djunaid Convention Center - Pekalongan
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari reservasi..."
                aria-label="Cari reservasi"
                className="ui-input h-10 w-56 rounded-xl px-4 pl-10 text-sm"
              />
              <svg
                aria-hidden="true"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-ink">Administrator</p>
              <p className="text-xs text-gray-600">Pengelola gedung</p>
            </div>
          </div>
        </div>

        <div className="neu-divider my-5" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="neu-title text-3xl">{selectedYear}</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Tahun sebelumnya"
                onClick={() => handleYearChange(selectedYear - 1)}
                className="neu-button neu-button-ghost h-9 w-9 p-0"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <select
                value={selectedYear}
                onChange={(event) => handleYearChange(Number(event.target.value))}
                aria-label="Pilih tahun"
                className="ui-select rounded-xl px-3 py-2 text-sm"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    Tahun {year}
                  </option>
                ))}
              </select>

              <button
                type="button"
                aria-label="Tahun berikutnya"
                onClick={() => handleYearChange(selectedYear + 1)}
                className="neu-button neu-button-ghost h-9 w-9 p-0"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {(
              [
                ["today", "Hari ini"],
                ["year", "Tahun"],
                ["month", "Bulan"],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                aria-pressed={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={tabClass(tab)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          Setahun dalam satu pandangan. Pilih bulan untuk melihat detail.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTHS.map((monthName, index) => {
          const summary = summaries[index];
          const monthNumber = index + 1;
          const daysInMonth = new Date(selectedYear, monthNumber, 0).getDate();

          return (
            <MonthCard
              key={index}
              monthName={monthName}
              monthNumber={monthNumber}
              year={selectedYear}
              summary={summary}
              daysInMonth={daysInMonth}
            />
          );
        })}
      </div>

      <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2">
        <div className="neu-pill pointer-events-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-600">Diterima</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-xs text-gray-600">Menunggu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-gray-600">Dibatalkan</span>
          </div>
          <span className="hidden h-4 w-px bg-gray-300 sm:block" />
          <span className="hidden text-xs text-gray-600 sm:block">
            Hanya reservasi diterima yang mengunci tanggal
          </span>
        </div>
      </div>
    </section>
  );
}

interface MonthCardProps {
  monthName: string;
  monthNumber: number;
  year: number;
  summary?: MonthSummary;
  daysInMonth: number;
}

function MonthCard({
  monthName,
  monthNumber,
  year,
  summary,
  daysInMonth,
}: MonthCardProps) {
  const firstDayOfWeek = new Date(year, monthNumber - 1, 1).getDay();
  const leadingDays = (firstDayOfWeek + 6) % 7;

  const hasDiterima = (summary?.diterima || 0) > 0;
  const hasPending = (summary?.pending || 0) > 0;
  const totalEvents = (summary?.diterima || 0) + (summary?.pending || 0);

  return (
    <Link
      href={`/admin/kalender/${year}/${String(monthNumber).padStart(2, "0")}`}
      className="neu-card group block p-4 transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold text-ink">
          {monthName}
        </h3>
        <span className="neu-icon h-7 w-7 text-gray-600 transition-transform group-hover:translate-x-0.5">
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>

      <div className="neu-inset p-2.5">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-gray-600">
          {WEEKDAYS_SHORT.map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingDays }).map((_, i) => (
            <div key={`leading-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            return (
              <div
                key={day}
                className="flex aspect-square items-center justify-center rounded-lg text-[11px] text-ink transition-colors hover:bg-white/45"
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 min-h-6">
        {totalEvents > 0 ? (
          <div className="flex flex-wrap gap-2">
            {hasDiterima ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 shadow-[inset_2px_2px_4px_rgba(159,145,126,0.18),inset_-2px_-2px_4px_rgba(255,255,255,0.7)]">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {summary?.diterima}
              </span>
            ) : null}
            {hasPending ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 shadow-[inset_2px_2px_4px_rgba(159,145,126,0.18),inset_-2px_-2px_4px_rgba(255,255,255,0.7)]">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                {summary?.pending}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-gray-600">{daysInMonth} hari</p>
        )}
      </div>
    </Link>
  );
}
