import Link from "next/link";
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
  formatPrintTimestamp,
} from "@/modules/reservation/presentation";
import type { PublicBookingProof } from "@/modules/reservation/types";
import {
  RateLimitError,
  consumeStatusCheckLimit,
} from "@/modules/reservation/rate-limit";
import { getPublicBookingByNumber } from "@/modules/reservation/queries";
import { getClientIp, hashClientIp } from "@/modules/reservation/request-ip";
import { getPublicVenue } from "@/modules/venue/queries";

import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

interface BuktiBookingPageProps {
  params: Promise<{ nomor: string }>;
}

async function resolveBookingProof(
  bookingNumber: string,
): Promise<PublicBookingProof | null> {
  try {
    const requestHeaders = await headers();
    const ip = getClientIp(requestHeaders);
    await consumeStatusCheckLimit({
      key: `bukti-booking:${hashClientIp(ip)}`,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return null;
    }
    throw error;
  }

  if (!isValidBookingNumber(bookingNumber)) {
    return null;
  }

  return getPublicBookingByNumber(bookingNumber);
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-line-light py-3.5 sm:grid-cols-[190px_1fr] sm:gap-6">
      <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-600">
        {label}
      </dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

export default async function BuktiBookingPage({
  params,
}: BuktiBookingPageProps) {
  const { nomor } = await params;
  const [venue, booking] = await Promise.all([
    getPublicVenue(),
    resolveBookingProof(nomor),
  ]);
  const venueName = venue?.name ?? "H.A. Djunaid Convention Center";

  if (!booking) {
    return (
      <PublicShell venue={venue} activeHref="/cek-status">
        <section className="mx-auto w-full max-w-2xl px-6 py-24">
          <SectionLabel>Bukti Booking</SectionLabel>
          <h1 className="mt-6 font-display text-4xl leading-tight text-ink">
            Bukti Booking tidak tersedia.
          </h1>
          <div
            role="alert"
            className="mt-6 border border-status-cancelled bg-status-cancelled/40 px-5 py-4 text-sm leading-relaxed text-ink"
          >
            {GENERIC_STATUS_CHECK_ERROR}
          </div>
          <PublicButton href="/cek-status" withArrow className="mt-8">
            Kembali ke Cek Status
          </PublicButton>
        </section>
      </PublicShell>
    );
  }

  const printTimestamp = formatPrintTimestamp(new Date());
  const durationLabel = `${booking.packageDurationHours} jam, ${booking.packageSessionCount} sesi`;
  const facilitiesLabel =
    booking.facilities.length > 0
      ? booking.facilities.join(", ")
      : "Tidak ada fasilitas tambahan.";

  return (
    <PublicShell venue={venue} activeHref="/cek-status">
      <section className="print-page bg-ivory">
        <div className="print-page-inner mx-auto w-full max-w-3xl px-6 py-16 lg:py-20">
          <div className="no-print">
            <SectionLabel>Bukti Booking / Siap Cetak</SectionLabel>
            <h1 className="mt-6 font-display text-4xl leading-tight text-ink sm:text-5xl">
              Bukti Booking.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-600">
              Periksa isi bukti di bawah, lalu cetak melalui dialog cetak
              peramban. Dokumen ini disiapkan untuk reservasi yang sudah
              diterima.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <PrintButton />
              <Link
                href={`/cek-status?nomor=${encodeURIComponent(
                  booking.bookingNumber,
                )}`}
                className="text-xs font-medium text-gold-700 underline transition-colors hover:text-ink"
              >
                Kembali ke Cek Status
              </Link>
            </div>
          </div>

          <article className="print-proof mt-10 border border-line-light bg-white px-6 py-8 sm:px-10 sm:py-12">
            <header className="border-b border-line-light pb-6">
              <p className="font-display text-2xl leading-snug text-ink">
                {venueName}
              </p>
              <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.24em] text-gray-600">
                Bukti Booking
              </p>
              <h2 className="mt-3 font-mono text-xl text-ink">
                {booking.bookingNumber}
              </h2>
            </header>

            <dl className="mt-6">
              <ProofRow
                label="Nomor booking"
                value={booking.bookingNumber}
              />
              <ProofRow
                label="Nama customer"
                value={booking.maskedCustomerName}
              />
              <ProofRow
                label="Tanggal acara"
                value={formatEventDate(booking.eventDate)}
              />
              <ProofRow
                label="Jenis acara"
                value={eventTypeLabel(booking.eventType)}
              />
              <ProofRow label="Paket" value={booking.packageName} />
              <ProofRow label="Durasi" value={durationLabel} />
              <ProofRow label="Fasilitas paket" value={facilitiesLabel} />
              <ProofRow
                label="Total reservasi"
                value={formatRupiah(booking.totalRupiah)}
              />
              <ProofRow
                label="DP minimum"
                value={formatRupiah(booking.minimumDpRupiah)}
              />
              <ProofRow
                label="Pembayaran terverifikasi"
                value={formatRupiah(booking.verifiedPaymentRupiah)}
              />
              <ProofRow
                label="Sisa pembayaran"
                value={formatRupiah(booking.remainingRupiah)}
              />
              <ProofRow
                label="Status pembayaran"
                value={PAYMENT_STATUS_LABELS[booking.paymentStatus]}
              />
              <ProofRow
                label="Status booking"
                value={RESERVATION_STATUS_LABELS[booking.status]}
              />
            </dl>

            <footer className="mt-8 border-t border-line-light pt-4 text-xs leading-relaxed text-gray-600">
              <p>Dicetak pada {printTimestamp}</p>
              <p className="mt-1">
                Bukti Booking ini merupakan dokumen customer untuk reservasi
                dengan nomor di atas.
              </p>
            </footer>
          </article>
        </div>
      </section>
    </PublicShell>
  );
}
