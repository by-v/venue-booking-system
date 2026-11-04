"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
import { MonthYearSelector } from "@/components/availability/month-year-selector";
import { PublicButton, SectionLabel } from "@/components/public";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import type { AvailabilityDay } from "@/modules/availability/types";
import { estimateMinimumDp } from "@/modules/reservation/pricing";
import { reservationSubmissionSchema } from "@/modules/reservation/schema";
import {
  GALLERY_CATEGORIES,
  GALLERY_CATEGORY_LABELS,
  type GalleryCategory,
  type PackageSummary,
} from "@/modules/venue/types";
import {
  buildReservationWhatsAppMessage,
  buildWhatsAppLink,
} from "@/modules/venue/whatsapp";

export interface ReservationFormProps {
  packages: PackageSummary[];
  today: string;
  adminWhatsapp: string | null;
}

type Step = 1 | 2 | 3;
type FieldName = "name" | "whatsapp" | "address" | "eventType" | "notes";
type FieldErrors = Partial<Record<FieldName, string>>;

const STEPS = [
  { number: 1, label: "Pilih Paket" },
  { number: 2, label: "Pilih Tanggal" },
  { number: 3, label: "Detail Acara" },
] as const;

const FIELD_NAMES = [
  "name",
  "whatsapp",
  "address",
  "eventType",
  "notes",
] as const satisfies readonly FieldName[];

function isFieldName(value: unknown): value is FieldName {
  return (
    typeof value === "string" &&
    (FIELD_NAMES as readonly string[]).includes(value)
  );
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

export function ReservationForm({
  packages,
  today,
  adminWhatsapp,
}: ReservationFormProps) {
  const [step, setStep] = useState<Step>(1);
  const [packageId, setPackageId] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [eventType, setEventType] = useState<GalleryCategory | "">("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedPackage =
    packages.find((pkg) => pkg.id === packageId) ?? null;
  const currentMonth = today.slice(0, 7);

  useEffect(() => {
    if (step !== 2 || packageId.length === 0) {
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
  }, [month, packageId, step]);

  function selectPackage(id: string): void {
    setPackageId(id);
    setSelectedDate(null);
    setDays([]);
    setCalendarLoading(true);
    setCalendarError(null);
    setFieldErrors({});
    setServerError(null);
    setStep(2);
  }

  function selectDate(date: string): void {
    setSelectedDate(date);
    setFieldErrors({});
    setServerError(null);
    setStep(3);
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

  function backToDateStep(): void {
    setDays([]);
    setCalendarLoading(true);
    setCalendarError(null);
    setStep(2);
  }

  function updateField(field: FieldName, value: string): void {
    switch (field) {
      case "name":
        setName(value);
        break;
      case "whatsapp":
        setWhatsapp(value);
        break;
      case "address":
        setAddress(value);
        break;
      case "eventType":
        setEventType(value as GalleryCategory | "");
        break;
      case "notes":
        setNotes(value);
        break;
    }

    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    if (!selectedPackage || !selectedDate) {
      setServerError("Pilih paket dan tanggal terlebih dahulu.");
      return;
    }

    const parsed = reservationSubmissionSchema.safeParse({
      name,
      whatsapp,
      address,
      eventType,
      packageId: selectedPackage.id,
      eventDate: selectedDate,
      notes,
    });

    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (isFieldName(field)) {
          errors[field] ??= issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const response = await fetch("/api/reservasi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        let message = "Pengajuan gagal. Silakan coba lagi.";
        try {
          const body = (await response.json()) as { error?: unknown };
          if (typeof body.error === "string" && body.error.length > 0) {
            message = body.error;
          }
        } catch {
          // Respons galat tanpa JSON tetap memakai pesan generik.
        }
        setServerError(message);
        return;
      }

      setSuccess(true);
    } catch {
      setServerError("Tidak dapat menghubungi server. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success && selectedPackage && selectedDate) {
    const whatsappHref = buildWhatsAppLink(
      adminWhatsapp,
      buildReservationWhatsAppMessage({
        name,
        whatsapp,
        address,
        eventType,
        packageName: selectedPackage.name,
        eventDate: selectedDate,
        notes,
      }),
    );

    return (
      <div className="mx-auto max-w-3xl border border-line-light bg-white p-6 sm:p-10">
        <div role="status">
          <SectionLabel>Pengajuan Diterima</SectionLabel>
          <h2 className="mt-5 font-display text-3xl leading-tight text-ink sm:text-4xl">
            Terima kasih, {name.trim()}.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-gray-600">
            Permintaan Anda belum dikonfirmasi dan belum mengunci tanggal.
            Lanjutkan ke WhatsApp untuk mengirim ringkasan pengajuan kepada
            admin.
          </p>
          <p className="mt-5 text-sm text-ink">
            {selectedPackage.name} · {formatDate(selectedDate)}
          </p>
        </div>

        {whatsappHref ? (
          <div className="mt-8">
            <PublicButton href={whatsappHref} external withArrow>
              Pesan Sekarang
            </PublicButton>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <div className="border border-line-light bg-white p-6 sm:p-8">
        <ol
          aria-label="Langkah pengajuan"
          className="grid gap-3 border-b border-line-light pb-6 sm:grid-cols-3"
        >
          {STEPS.map((item) => {
            const active = step === item.number;
            const completed = step > item.number;

            return (
              <li
                key={item.number}
                aria-current={active ? "step" : undefined}
                className="flex items-center gap-3"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                    active || completed
                      ? "border-gold-500 bg-gold-500 text-ink"
                      : "border-line-light text-gray-600"
                  }`}
                >
                  {item.number}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-[0.18em] ${
                    active ? "text-ink" : "text-gray-600"
                  }`}
                >
                  {item.label}
                </span>
              </li>
            );
          })}
        </ol>

        {step === 1 ? (
          <div className="mt-8">
            <SectionLabel>Langkah 1</SectionLabel>
            <h2 className="mt-3 font-display text-3xl leading-tight text-ink">
              Pilih paket
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600">
              Hanya paket aktif yang ditampilkan. Harga dan durasi berasal dari
              data venue.
            </p>

            {packages.length === 0 ? (
              <p className="mt-8 border-t border-line-light pt-6 text-sm text-gray-600">
                Belum ada paket aktif. Silakan hubungi admin untuk informasi
                lebih lanjut.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    aria-label={`Pilih paket ${pkg.name}`}
                    onClick={() => selectPackage(pkg.id)}
                    className="flex h-full flex-col justify-between border border-line-light p-5 text-left transition-colors hover:border-gold-500 hover:bg-gold-100/30"
                  >
                    <div>
                      <p className="font-display text-xl leading-snug text-ink">
                        {pkg.name}
                      </p>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-gray-600">
                        {pkg.durationHours} jam · {pkg.sessionCount} sesi
                      </p>
                    </div>
                    <div className="mt-6 flex items-end justify-between gap-3">
                      <span className="text-sm font-medium text-gold-700">
                        {formatRupiah(pkg.priceRupiah)}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-ink">
                        Pilih
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-8">
            <SectionLabel>Langkah 2</SectionLabel>
            <h2 className="mt-3 font-display text-3xl leading-tight text-ink">
              Pilih tanggal
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600">
              Ketersediaan mengikuti paket yang dipilih. Tanggal Terisi tidak
              dapat dipilih.
            </p>

            <div className="mt-6">
              <MonthYearSelector
                value={month}
                onChange={setMonth}
                minYear={new Date().getFullYear()}
                maxYear={new Date().getFullYear() + 10}
              />
            </div>

            <div className="mt-6">
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
                  onSelect={selectDate}
                />
              )}
            </div>

            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="mt-6"
            >
              ← Ganti paket
            </Button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-8">
            <SectionLabel>Langkah 3</SectionLabel>
            <h2 className="mt-3 font-display text-3xl leading-tight text-ink">
              Detail acara
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600">
              Lengkapi data di bawah. Kolom bertanda wajib harus diisi.
            </p>

            {serverError ? (
              <p
                role="alert"
                className="mt-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {serverError}
              </p>
            ) : null}

            <form
              role="form"
              aria-label="Form pengajuan reservasi"
              onSubmit={handleSubmit}
              className="mt-6 grid gap-5"
            >
              <Input
                label="Nama lengkap"
                name="name"
                autoComplete="name"
                maxLength={100}
                value={name}
                onChange={(event) => updateField("name", event.target.value)}
                error={fieldErrors.name}
              />
              <Input
                label="Nomor WhatsApp"
                name="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="08xxxxxxxxxx"
                value={whatsapp}
                onChange={(event) =>
                  updateField("whatsapp", event.target.value)
                }
                error={fieldErrors.whatsapp}
              />
              <Input
                label="Alamat"
                name="address"
                autoComplete="street-address"
                maxLength={200}
                value={address}
                onChange={(event) => updateField("address", event.target.value)}
                error={fieldErrors.address}
              />
              <Select
                label="Jenis acara"
                name="eventType"
                value={eventType}
                onChange={(event) =>
                  updateField("eventType", event.target.value)
                }
                error={fieldErrors.eventType}
              >
                <option value="">Pilih jenis acara</option>
                {GALLERY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {GALLERY_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Catatan (opsional)"
                name="notes"
                maxLength={1000}
                value={notes}
                onChange={(event) => updateField("notes", event.target.value)}
                error={fieldErrors.notes}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-light pt-5">
                <Button variant="ghost" onClick={backToDateStep}>
                  ← Ganti tanggal
                </Button>
                <Button type="submit" loading={submitting}>
                  Kirim Pengajuan
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </div>

      <aside className="border border-line-light bg-white p-6 sm:p-8 lg:sticky lg:top-8">
        <SectionLabel>Ringkasan</SectionLabel>
        <dl className="mt-5 divide-y divide-line-light">
          <div className="py-3">
            <dt className="text-[10px] uppercase tracking-[0.18em] text-gray-600">
              Paket
            </dt>
            <dd className="mt-1 text-sm text-ink">
              {selectedPackage?.name ?? "Belum dipilih"}
            </dd>
          </div>
          <div className="py-3">
            <dt className="text-[10px] uppercase tracking-[0.18em] text-gray-600">
              Tanggal
            </dt>
            <dd className="mt-1 text-sm text-ink">
              {selectedDate ? formatDate(selectedDate) : "Belum dipilih"}
            </dd>
          </div>
          <div className="py-3">
            <dt className="text-[10px] uppercase tracking-[0.18em] text-gray-600">
              Harga paket
            </dt>
            <dd className="mt-1 text-sm text-ink">
              {selectedPackage
                ? formatRupiah(selectedPackage.priceRupiah)
                : "—"}
            </dd>
          </div>
          <div className="py-3">
            <dt className="text-[10px] uppercase tracking-[0.18em] text-gray-600">
              Perkiraan DP minimum
            </dt>
            <dd className="mt-1 text-sm font-medium text-gold-700">
              {selectedPackage
                ? formatRupiah(estimateMinimumDp(selectedPackage.priceRupiah))
                : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-5 text-xs leading-relaxed text-gray-600">
          Perkiraan DP minimum 25% dari harga paket. Total akhir ditetapkan
          admin.
        </p>
      </aside>
    </div>
  );
}
