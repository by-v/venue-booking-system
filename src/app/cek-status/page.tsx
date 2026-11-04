import { headers } from "next/headers";

import { PublicButton, SectionLabel } from "@/components/public";
import { PublicShell } from "@/components/public-shell";
import { formatRupiah } from "@/lib/format";
import { isValidBookingNumber } from "@/modules/reservation/booking-number";
import {
  GENERIC_STATUS_CHECK_ERROR,
  PAYMENT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  eventTypeLabel,
  formatEventDate,
} from "@/modules/reservation/presentation";
import type { PublicBookingProof } from "@/modules/reservation/types";
import {
  RateLimitError,
  consumeStatusCheckLimit,
} from "@/modules/reservation/rate-limit";
import { getPublicBookingByNumber } from "@/modules/reservation/queries";
import { getClientIp, hashClientIp } from "@/modules/reservation/request-ip";
import { getPublicVenue } from "@/modules/venue/queries";

export const dynamic = "force-dynamic";

type StatusCheckResult =
  | { kind: "idle" }
  | { kind: "error" }
  | { kind: "found"; booking: PublicBookingProof };

interface CekStatusPageProps {
  searchParams?: Promise<{ nomor?: string | string[] }>;
}

async function resolveStatusCheck(
  rawNumber: string | string[] | undefined,
): Promise<StatusCheckResult> {
  const nomor = Array.isArray(rawNumber) ? rawNumber[0] : rawNumber;
  if (!nomor || nomor.trim().length === 0) {
    return { kind: "idle" };
  }

  try {
    const requestHeaders = await headers();
    const ip = getClientIp(requestHeaders);
    await consumeStatusCheckLimit({ key: `cek-status:${hashClientIp(ip)}` });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { kind: "error" };
    }
    throw error;
  }

  if (!isValidBookingNumber(nomor)) {
    return { kind: "error" };
  }

  const booking = await getPublicBookingByNumber(nomor);
  if (!booking) {
    return { kind: "error" };
  }

  return { kind: "found", booking };
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1 border-t border-line-light py-4 sm:grid-cols-[180px_1fr] sm:gap-6">
      <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-600">
        {label}
      </dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

export default async function CekStatusPage({
  searchParams,
}: CekStatusPageProps) {
  const { nomor } = (await searchParams) ?? {};
  const inputValue = Array.isArray(nomor) ? (nomor[0] ?? "") : (nomor ?? "");
  const [venue, result] = await Promise.all([
    getPublicVenue(),
    resolveStatusCheck(nomor),
  ]);

  return (
    <PublicShell venue={venue} activeHref="/cek-status">
      <section className="bg-ivory">
        <div className="mx-auto w-full max-w-[1240px] px-6 pb-14 pt-20 lg:pb-16 lg:pt-24">
          <SectionLabel>Cek Status / Reservasi</SectionLabel>
          <h1 className="mt-8 max-w-3xl font-display text-5xl leading-[1.04] text-ink sm:text-6xl lg:text-[76px]">
            Status
            <span className="mt-1 block">reservasi Anda.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Masukkan nomor booking yang diterima saat reservasi dikonfirmasi.
            Cek status hanya tersedia untuk reservasi yang memiliki nomor
            booking.
          </p>
        </div>
      </section>

      <section className="bg-ivory">
        <div className="mx-auto w-full max-w-[1240px] px-6 pb-20 lg:pb-24">
          <div className="max-w-2xl border-t border-line-light pt-10">
            <form action="/cek-status" method="get" className="flex flex-col gap-4">
              <label
                htmlFor="nomor"
                className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink"
              >
                Nomor booking
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="nomor"
                  name="nomor"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  defaultValue={inputValue}
                  placeholder="HADCC-2027-0001"
                  aria-describedby="nomor-bantuan"
                  className="min-w-0 flex-1 border border-ink/20 bg-white px-4 py-3 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center border border-gold-500 bg-gold-500 px-5 py-3 text-xs font-medium tracking-[0.08em] text-ink transition-colors hover:border-gold-700 hover:bg-gold-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Cek Status
                </button>
              </div>
              <p
                id="nomor-bantuan"
                className="text-xs leading-relaxed text-gray-600"
              >
                Format nomor booking: HADCC-YYYY-NNNN. Nomor hanya diberikan
                untuk reservasi yang sudah diterima.
              </p>
            </form>

            {result.kind === "error" ? (
              <div
                role="alert"
                className="mt-8 border border-status-cancelled bg-status-cancelled/40 px-5 py-4 text-sm leading-relaxed text-ink"
              >
                {GENERIC_STATUS_CHECK_ERROR}
              </div>
            ) : null}

            {result.kind === "found" ? (
              <div className="mt-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-600">
                      Hasil pencarian
                    </p>
                    <h2 className="mt-3 font-display text-3xl leading-tight text-ink">
                      {result.booking.packageName}
                    </h2>
                  </div>
                  <span className="border border-status-accepted bg-status-accepted px-3 py-1.5 text-xs font-medium text-ink">
                    {RESERVATION_STATUS_LABELS[result.booking.status]}
                  </span>
                </div>

                <dl className="mt-6">
                  <SummaryRow
                    label="Nomor booking"
                    value={result.booking.bookingNumber}
                  />
                  <SummaryRow
                    label="Nama customer"
                    value={result.booking.maskedCustomerName}
                  />
                  <SummaryRow
                    label="Tanggal acara"
                    value={formatEventDate(result.booking.eventDate)}
                  />
                  <SummaryRow
                    label="Jenis acara"
                    value={eventTypeLabel(result.booking.eventType)}
                  />
                  <SummaryRow label="Paket" value={result.booking.packageName} />
                  <SummaryRow
                    label="Total reservasi"
                    value={formatRupiah(result.booking.totalRupiah)}
                  />
                  <SummaryRow
                    label="DP terverifikasi"
                    value={formatRupiah(result.booking.verifiedPaymentRupiah)}
                  />
                  <SummaryRow
                    label="Sisa pembayaran"
                    value={formatRupiah(result.booking.remainingRupiah)}
                  />
                  <SummaryRow
                    label="Status pembayaran"
                    value={PAYMENT_STATUS_LABELS[result.booking.paymentStatus]}
                  />
                  <SummaryRow
                    label="Status booking"
                    value={RESERVATION_STATUS_LABELS[result.booking.status]}
                  />
                </dl>

                <PublicButton
                  href={`/bukti-booking/${result.booking.bookingNumber}`}
                  withArrow
                  className="mt-8"
                >
                  Cetak Bukti
                </PublicButton>
              </div>
            ) : null}

            {result.kind === "idle" ? (
              <p className="mt-8 text-xs leading-relaxed text-gray-600">
                Hasil status akan tampil di halaman ini setelah nomor booking
                dikirim.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
