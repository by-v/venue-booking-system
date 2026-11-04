"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DayDetail, EventInDay } from "@/modules/calendar/queries";

export interface MonthDetailViewProps {
  year: number;
  month: number;
  days: DayDetail[];
  stats: {
    total: number;
    diterima: number;
    pending: number;
    dibatalkan: number;
  };
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
] as const;

const WEEKDAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

const EVENT_TYPE_LABELS: Record<string, string> = {
  PERNIKAHAN: "Pernikahan",
  WALIMAH_RESEPSI: "Resepsi pernikahan",
  SEMINAR: "Seminar",
  KONSER: "Konser",
  ACARA_MALAM: "Acara malam",
  ACARA_OUTDOOR: "Acara outdoor",
  LAINNYA: "Acara lainnya",
};

/**
 * Month detail view - menampilkan kalender bulan dengan event cards di dalam tanggal.
 * Design reference: Screenshot 2.
 */
export function MonthDetailView({ year, month, days, stats }: MonthDetailViewProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "diterima" | "pending" | "dibatalkan">("all");

  const monthName = MONTHS[month - 1];
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const leadingDays = (firstDayOfWeek + 6) % 7;

  const handleMonthChange = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    router.push(`/admin/kalender/${newYear}/${String(newMonth).padStart(2, '0')}`);
  };

  const selectedDay = selectedDate ? days.find(d => d.date === selectedDate) : null;
  const selectedDateObj = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null;
  const selectedWeekday = selectedDateObj ? WEEKDAYS[((selectedDateObj.getDay() + 6) % 7)] : "";

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Main Content */}
      <div className="flex-1">
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

            {/* Title and Navigation */}
            <div className="flex items-center justify-between">
              <div>
                <Link
                  href={`/admin/kalender?year=${year}`}
                  className="mb-2 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Semua bulan
                </Link>

                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-bold text-gray-900">
                    {monthName} {year}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMonthChange(-1)}
                      className="rounded-lg p-2 hover:bg-gray-100"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMonthChange(1)}
                      className="rounded-lg p-2 hover:bg-gray-100"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-sm text-gray-600">
                  {stats.total} reservasi aktif • {stats.diterima} diterima • {stats.pending} menunggu • {stats.dibatalkan} dibatalkan
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Hari ini
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/admin/kalender?year=${year}`)}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Tahun
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Bulan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="border-b border-gray-200 bg-white px-6 py-3">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveFilter("diterima")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === "diterima"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Diterima
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("pending")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === "pending"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Menunggu
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("dibatalkan")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === "dibatalkan"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Dibatalkan
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="mx-auto max-w-[1100px] px-6 py-8">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            {/* Weekday headers */}
            <div className="mb-4 grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-600">
              {WEEKDAYS.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Date grid */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: leadingDays }).map((_, i) => (
                <div key={`leading-${i}`} className="min-h-[120px]" />
              ))}

              {days.map((day) => {
                const dayNum = parseInt(day.date.split('-')[2]);
                const isSelected = selectedDate === day.date;
                const hasEvents = day.reservationCount > 0;

                let bgColor = "bg-gray-50";
                let borderColor = "border-gray-200";
                
                if (day.status === 'DITERIMA') {
                  bgColor = "bg-green-50";
                  borderColor = "border-green-200";
                } else if (day.status === 'PENDING') {
                  bgColor = "bg-yellow-50";
                  borderColor = "border-yellow-200";
                } else if (day.status === 'DIBATALKAN') {
                  bgColor = "bg-red-50";
                  borderColor = "border-red-200";
                }

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={`group relative min-h-[120px] rounded-lg border p-2 text-left transition-all hover:shadow-md ${
                      isSelected ? "ring-2 ring-gold-500" : ""
                    } ${bgColor} ${borderColor}`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="text-sm font-medium text-gray-900">{dayNum}</span>
                      {hasEvents && day.reservationCount > 1 ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
                          {day.reservationCount}
                        </span>
                      ) : null}
                    </div>

                    {/* Event cards */}
                    <div className="space-y-1">
                      {day.events?.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Detail tanggal terpilih */}
      <div className="w-[380px] border-l border-gray-200 bg-white p-6">
        {selectedDate && selectedDay ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              TANGGAL TERPILIH
            </p>
            <h3 className="mt-2 text-xl font-semibold text-gray-900">
              {selectedWeekday}, {selectedDateObj?.getDate()} {monthName}
            </h3>
            
            {selectedDay.reservationCount > 0 ? (
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  {selectedDay.reservationCount} agenda terkonfirmasi
                </p>
                
                <div className="mt-4 space-y-3">
                  {selectedDay.events?.map((event) => (
                    <div
                      key={event.id}
                      className={`rounded-lg border p-4 ${
                        event.status === 'DITERIMA'
                          ? "border-green-200 bg-green-50"
                          : event.status === 'PENDING'
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            event.status === 'DITERIMA'
                              ? "bg-green-500"
                              : event.status === 'PENDING'
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                        />
                        <span
                          className={`text-xs font-medium uppercase ${
                            event.status === 'DITERIMA'
                              ? "text-green-700"
                              : event.status === 'PENDING'
                              ? "text-yellow-700"
                              : "text-red-700"
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900">{event.customerName}</h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">{event.packageName}</p>
                      
                      <Link
                        href={`/admin/reservasi/${event.id}`}
                        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-gold-600 hover:text-gold-700"
                      >
                        Lihat Reservasi
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  <p>Tanggal tersebut terkonfirmasi admin.</p>
                  <p className="mt-1">Pending tidak mengunci tanggal.</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-lg bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-600">Tidak ada reservasi pada tanggal ini</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-4 text-sm text-gray-500">
                Pilih tanggal untuk melihat detail
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface EventCardProps {
  event: EventInDay;
}

function EventCard({ event }: EventCardProps) {
  let bgColor = "bg-green-100";
  let textColor = "text-green-700";
  let borderColor = "border-green-300";

  if (event.status === 'PENDING' || event.status === 'DITANGGUHKAN') {
    bgColor = "bg-yellow-100";
    textColor = "text-yellow-700";
    borderColor = "border-yellow-300";
  } else if (event.status === 'DIBATALKAN') {
    bgColor = "bg-red-100";
    textColor = "text-red-700";
    borderColor = "border-red-300";
  }

  return (
    <div className={`rounded border px-2 py-1 text-xs ${bgColor} ${textColor} ${borderColor}`}>
      <div className="truncate font-semibold">{event.shortName}</div>
      <div className="truncate text-[10px] opacity-75">{event.packageName}</div>
    </div>
  );
}
