"use client";

import type { AvailabilityDay } from "@/modules/availability/types";

export interface AvailabilityCalendarProps {
  days: AvailabilityDay[];
  monthLabel: string;
  selectedDate?: string | null;
  onSelect?: (date: string) => void;
  className?: string;
}

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;

const statusLabel = (
  day: AvailabilityDay,
  selected: boolean,
): "Dipilih" | "Tersedia" | "Terisi" => {
  if (selected) {
    return "Dipilih";
  }
  return day.status === "TERSEDIA" ? "Tersedia" : "Terisi";
};

function weekdayIndex(date: string): number {
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  return (dayOfWeek + 6) % 7;
}

/**
 * Kalender publik (design AC-3): hanya menampilkan Tersedia/Terisi/Dipilih.
 * Data dihitung server-side; komponen ini tidak melakukan query dan tidak
 * menerima alasan kunci, jenis kunci, atau hari setup (BR-27).
 */
export function AvailabilityCalendar({
  days,
  monthLabel,
  selectedDate,
  onSelect,
  className,
}: AvailabilityCalendarProps) {
  const leading = days[0] ? weekdayIndex(days[0].date) : 0;

  return (
    <div
      className={`border border-line-light bg-white p-5 sm:p-6 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-2xl leading-tight text-ink">
          {monthLabel}
        </h3>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.18em] text-gray-600">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 border border-line-light bg-white"
            />
            Tersedia
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 bg-ink/25"
            />
            Terisi
          </span>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="mt-6 text-sm text-gray-600">
          Belum ada data ketersediaan.
        </p>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="mt-6 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.18em] text-gray-600"
          >
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {Array.from({ length: leading }, (_, index) => (
              <span key={`blank-${index}`} aria-hidden="true" />
            ))}

            {days.map((day) => {
              const unavailable = day.status === "TERISI";
              const selected = day.date === selectedDate;
              const number = Number(day.date.slice(8, 10));
              const label = statusLabel(day, selected);

              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={unavailable}
                  aria-pressed={selected}
                  aria-label={`${day.date} — ${label}`}
                  onClick={() => {
                    if (!unavailable) {
                      onSelect?.(day.date);
                    }
                  }}
                  className={`flex h-10 items-center justify-center border text-sm transition-colors ${
                    selected
                      ? "border-ink bg-ink font-medium text-ivory"
                      : unavailable
                        ? "cursor-not-allowed border-transparent bg-ink/10 text-gray-600/60"
                        : "border-line-light text-ink hover:border-gold-500 hover:bg-gold-100"
                  }`}
                >
                  {number}
                </button>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-gray-600">
        Tanggal Terisi tidak dapat dipilih.
      </p>
    </div>
  );
}
