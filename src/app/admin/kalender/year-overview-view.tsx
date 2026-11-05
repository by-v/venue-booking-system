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
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
] as const;

/**
 * Year overview kalender admin - menampilkan 12 bulan dalam grid.
 * Design reference: Screenshot 1 (grid 3x4 dengan mini calendar per bulan).
 */
export function YearOverviewView({ initialYear = 2026, summaries }: YearOverviewViewProps) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [activeTab, setActiveTab] = useState<"today" | "year" | "month">("year");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear + i);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    router.push(`/admin/kalender?year=${year}`);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Kalender</h1>
              <p className="mt-1 text-sm text-gray-500">
                Gedung H.A. Djunaid Convention Center - Pekalongan
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari reservasi..."
                  className="h-10 w-64 rounded-lg border border-gray-300 bg-gray-50 px-4 pl-10 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                />
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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

              <div className="text-sm text-gray-600">
                <span className="font-medium">Administrator</span>
                <p className="text-xs text-gray-500">Pengelola gedung</p>
              </div>
            </div>
          </div>

          {/* Year selector and tabs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold text-gray-900">{selectedYear}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleYearChange(selectedYear - 1)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      Tahun {year}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleYearChange(selectedYear + 1)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("today")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "today"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                Hari ini
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("year")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "year"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                Tahun
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("month")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "month"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                Bulan
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Setahun dalam satu pandangan. Pilih bulan untuk melihat detail.
          </p>
        </div>
      </div>

      {/* Month Grid */}
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      </div>

      {/* Legend */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-6 rounded-full border border-gray-200 bg-white px-6 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-700">Diterima</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-700">Menunggu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-700">Dibatalkan</span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <span className="text-xs text-gray-500">
            Hanya reservasi diterima yang mengunci tanggal
          </span>
        </div>
      </div>
    </div>
  );
}

interface MonthCardProps {
  monthName: string;
  monthNumber: number;
  year: number;
  summary?: MonthSummary;
  daysInMonth: number;
}

function MonthCard({ monthName, monthNumber, year, summary, daysInMonth }: MonthCardProps) {
  const firstDayOfWeek = new Date(year, monthNumber - 1, 1).getDay();
  const leadingDays = (firstDayOfWeek + 6) % 7;

  const hasDiterima = (summary?.diterima || 0) > 0;
  const hasPending = (summary?.pending || 0) > 0;
  const totalEvents = (summary?.diterima || 0) + (summary?.pending || 0);

  return (
    <Link
      href={`/admin/kalender/${year}/${String(monthNumber).padStart(2, '0')}`}
      className="group block rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gold-500 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{monthName}</h3>
        <svg
          className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Mini calendar grid */}
      <div className="mb-3">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-gray-500">
          <div>Sen</div>
          <div>Sel</div>
          <div>Rab</div>
          <div>Kam</div>
          <div>Jum</div>
          <div>Sab</div>
          <div>Min</div>
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
                className="flex aspect-square items-center justify-center rounded text-[11px] text-gray-700 hover:bg-gray-100"
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats badges */}
      {totalEvents > 0 ? (
        <div className="flex flex-wrap gap-2">
          {hasDiterima ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {summary?.diterima}
            </span>
          ) : null}
          {hasPending ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              {summary?.pending}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-gray-400">{daysInMonth} hari</p>
      )}
    </Link>
  );
}
