"use client";

import { useEffect, useState } from "react";

import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
import { Button, Input, Select, Textarea } from "@/components/ui";
import type { AvailabilityDay } from "@/modules/availability/types";
import {
  GALLERY_CATEGORIES,
  GALLERY_CATEGORY_LABELS,
  type PackageSummary,
} from "@/modules/venue/types";

export interface DirectEntryFormProps {
  packages: PackageSummary[];
  today: string;
  errorMessage: string | null;
  action: (formData: FormData) => Promise<void>;
}

function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}

/**
 * Form input reservasi langsung admin (design D8). Memakai Server Action
 * `createAdminReservation`; pilihan "Simpan & Terima" mengirim `accept=on`.
 */
export function DirectEntryForm({
  packages,
  today,
  errorMessage,
  action,
}: DirectEntryFormProps) {
  const [packageId, setPackageId] = useState("");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const currentMonth = today.slice(0, 7);

  useEffect(() => {
    if (packageId.length === 0) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ packageId, bulan: month });

    fetch(`/api/ketersediaan?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Ketersediaan tidak tersedia");
        }
        const body = (await response.json()) as { days?: unknown };
        if (!Array.isArray(body.days)) {
          throw new Error("Format ketersediaan tidak valid");
        }
        if (controller.signal.aborted) {
          return;
        }
        setDays(body.days as AvailabilityDay[]);
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        setDays([]);
        setCalendarError(
          "Ketersediaan tanggal gagal dimuat. Silakan coba bulan lain.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCalendarLoading(false);
        }
      });

    return () => controller.abort();
  }, [month, packageId]);

  function selectPackage(id: string): void {
    setPackageId(id);
    setSelectedDate(null);
    setDays([]);
    setCalendarLoading(true);
    setCalendarError(null);
  }

  function changeMonth(delta: number): void {
    const next = shiftMonth(month, delta);
    if (next < currentMonth) {
      return;
    }
    setMonth(next);
    setSelectedDate(null);
    setDays([]);
    setCalendarLoading(true);
    setCalendarError(null);
  }

  return (
    <form action={action} className="grid gap-5">
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}

      <Select
        label="Paket"
        name="packageId"
        value={packageId}
        onChange={(event) => selectPackage(event.target.value)}
        required
      >
        <option value="">Pilih paket</option>
        {packages.map((pkg) => (
          <option key={pkg.id} value={pkg.id}>
            {pkg.name}
          </option>
        ))}
      </Select>

      <div>
        <p className="text-sm font-medium text-ink">Tanggal acara</p>
        <p className="mt-1 text-sm text-gray-600">
          {selectedDate ? formatDate(selectedDate) : "Belum dipilih"}
        </p>

        {packageId.length > 0 ? (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => changeMonth(-1)}
                disabled={month <= currentMonth}
              >
                Bulan sebelumnya
              </Button>
              <Button variant="outline" onClick={() => changeMonth(1)}>
                Bulan berikutnya
              </Button>
            </div>

            <div className="mt-4">
              {calendarLoading ? (
                <p role="status" className="text-sm text-gray-600">
                  Memuat ketersediaan…
                </p>
              ) : calendarError ? (
                <p role="alert" className="text-sm text-red-600">
                  {calendarError}
                </p>
              ) : (
                <AvailabilityCalendar
                  days={days}
                  monthLabel={formatMonth(month)}
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                />
              )}
            </div>
          </>
        ) : (
          <p className="mt-2 text-xs text-gray-600">
            Pilih paket untuk menampilkan ketersediaan tanggal.
          </p>
        )}

        <input type="hidden" name="eventDate" value={selectedDate ?? ""} />
      </div>

      <Input
        label="Nama lengkap"
        name="name"
        autoComplete="name"
        maxLength={100}
        required
      />
      <Input
        label="Nomor WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="08xxxxxxxxxx"
        required
      />
      <Input
        label="Alamat"
        name="address"
        autoComplete="street-address"
        maxLength={200}
        required
      />
      <Select label="Jenis acara" name="eventType" required>
        <option value="">Pilih jenis acara</option>
        {GALLERY_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {GALLERY_CATEGORY_LABELS[category]}
          </option>
        ))}
      </Select>
      <Textarea label="Catatan (opsional)" name="notes" maxLength={1000} />

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line-light pt-5">
        <Button type="submit" variant="outline">
          Simpan sebagai PENDING
        </Button>
        <Button type="submit" name="accept" value="on">
          Simpan &amp; Terima
        </Button>
      </div>
    </form>
  );
}
