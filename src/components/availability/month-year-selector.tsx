"use client";

import { useState } from "react";

export interface MonthYearSelectorProps {
  value: string; // format: "YYYY-MM"
  onChange: (month: string) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

const MONTHS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
] as const;

/**
 * Dropdown selector untuk tahun dan bulan. User bisa langsung loncat
 * ke tahun/bulan manapun tanpa scroll kalender berulang kali.
 */
export function MonthYearSelector({
  value,
  onChange,
  minYear = new Date().getFullYear(),
  maxYear = new Date().getFullYear() + 10,
  className = "",
}: MonthYearSelectorProps) {
  const [year, month] = value.split("-");
  
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i
  );

  const handleYearChange = (newYear: string) => {
    onChange(`${newYear}-${month}`);
  };

  const handleMonthChange = (newMonth: string) => {
    onChange(`${year}-${newMonth}`);
  };

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:gap-4 ${className}`}>
      <div className="flex-1">
        <label
          htmlFor="year-select"
          className="mb-2 block text-sm font-medium text-ink"
        >
          Tahun
        </label>
        <select
          id="year-select"
          value={year}
          onChange={(e) => handleYearChange(e.target.value)}
          className="h-[44px] w-full rounded-lg border border-line-light bg-white px-4 text-sm text-ink transition-colors hover:border-gold-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label
          htmlFor="month-select"
          className="mb-2 block text-sm font-medium text-ink"
        >
          Bulan
        </label>
        <select
          id="month-select"
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="h-[44px] w-full rounded-lg border border-line-light bg-white px-4 text-sm text-ink transition-colors hover:border-gold-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
