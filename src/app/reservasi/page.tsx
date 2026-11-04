import { SectionLabel } from "@/components/public";
import { PublicShell } from "@/components/public-shell";
import { EmptyState } from "@/components/ui";
import { todayInJakarta } from "@/modules/availability/dates";
import {
  getPublicVenue,
  listActivePackageSummaries,
} from "@/modules/venue/queries";

import { ReservationForm } from "./reservation-form";

export const dynamic = "force-dynamic";

export default async function ReservasiPage() {
  const [venue, packages] = await Promise.all([
    getPublicVenue(),
    listActivePackageSummaries(),
  ]);

  if (!venue) {
    return (
      <PublicShell venue={null} activeHref="/reservasi">
        <section className="mx-auto w-full max-w-3xl px-6 py-24">
          <EmptyState
            title="Data venue belum tersedia"
            description="Form reservasi akan tampil setelah admin mengisi data venue."
          />
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell venue={venue} activeHref="/reservasi">
      <section className="bg-ivory">
        <div className="mx-auto w-full max-w-[1240px] px-6 pb-14 pt-20 lg:pb-16 lg:pt-24">
          <SectionLabel>Reservasi / Pengajuan</SectionLabel>
          <h1 className="mt-8 max-w-3xl font-display text-5xl leading-[1.04] text-ink sm:text-6xl lg:text-[76px]">
            Rencanakan
            <span className="mt-1 block">kehadiran Anda.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Pilih paket, tentukan tanggal, lalu lengkapi detail acara. Pengajuan
            belum dikonfirmasi dan belum mengunci tanggal sampai admin
            menghubungi Anda.
          </p>
        </div>
      </section>

      <section className="bg-ivory">
        <div className="mx-auto w-full max-w-[1240px] px-6 pb-20 lg:pb-24">
          <ReservationForm
            packages={packages}
            today={todayInJakarta()}
            adminWhatsapp={venue.adminWhatsapp}
          />
        </div>
      </section>
    </PublicShell>
  );
}
