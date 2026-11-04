import Image from "next/image";

import {
  PublicButton,
  SectionLabel,
  StatRow,
} from "@/components/public";
import { PublicShell } from "@/components/public-shell";
import { EmptyState } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import {
  getPublicVenue,
  listActivePackages,
  listFacilitiesWithPackages,
} from "@/modules/venue/queries";

export const dynamic = "force-dynamic";

/** Nama pendek untuk judul, mis. "H.A. Djunaid" dari nama venue lengkap. */
function shortVenueName(name: string): string {
  return name.replace(/\s+Convention Center\s*$/i, "").trim() || name;
}

/** Wilayah diambil dari bagian terakhir alamat (setelah koma terakhir). */
function areaLabel(address: string, fallback: string): string {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts[parts.length - 1] : fallback;
}

export default async function TentangPage() {
  const [venue, packages, facilities] = await Promise.all([
    getPublicVenue(),
    listActivePackages(),
    listFacilitiesWithPackages(),
  ]);

  if (!venue) {
    return (
      <PublicShell venue={null} activeHref="/tentang">
        <section className="mx-auto w-full max-w-3xl px-6 py-24">
          <EmptyState
            title="Data venue belum tersedia"
            description="Informasi venue akan tampil setelah admin mengisinya."
          />
        </section>
      </PublicShell>
    );
  }

  const name = shortVenueName(venue.name);
  const area = areaLabel(venue.address, venue.name);

  const stats = [
    `${formatNumber(venue.capacityMin)}–${formatNumber(venue.capacityMax)} tamu`,
    `${packages.length} paket aktif`,
    `${facilities.length} fasilitas`,
  ];

  return (
    <PublicShell venue={venue} activeHref="/tentang">
      {/* 1. Judul halaman */}
      <section className="bg-ivory">
        <div className="mx-auto w-full max-w-[1240px] px-6 pb-10 pt-20 lg:pt-24">
          <SectionLabel>Tentang / Profil Venue</SectionLabel>
          <h1 className="mt-8 max-w-3xl font-display text-5xl leading-[1.04] text-ink sm:text-6xl lg:text-[76px]">
            Mengenal
            <span className="mt-1 block">{name}.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Profil gedung, kapasitas, dan informasi lokasi dalam satu pandangan.
          </p>
        </div>

        <div className="mx-auto w-full max-w-[1240px] px-6">
          <figure>
            <div className="relative aspect-[16/10] overflow-hidden bg-ink-soft sm:aspect-[16/9]">
              <Image
                src="/galeri/gedung-malam.png"
                alt={`Tampak luar ${venue.name} pada malam hari`}
                fill
                preload
                sizes="(min-width: 1240px) 1192px, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-[10px] uppercase tracking-[0.2em] text-gray-600">
              <span>Tampak luar {venue.name}</span>
              <span>Eksterior · dokumentasi venue</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 2. Profil gedung */}
      <section className="bg-ivory">
        <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-6 py-20 lg:grid-cols-2 lg:gap-20 lg:py-24">
          <div>
            <SectionLabel>Profil Gedung</SectionLabel>
            <h2 className="mt-6 font-display text-4xl leading-[1.08] text-ink sm:text-5xl">
              Cerita ruang,
              <br />
              dari sumbernya.
            </h2>
          </div>

          <div>
            <div className="border border-line-light bg-white p-6 sm:p-8">
              <SectionLabel>Deskripsi Resmi</SectionLabel>
              <p className="mt-4 text-sm leading-relaxed text-ink sm:text-base">
                {venue.description}
              </p>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-gray-600">
              Riwayat, keunggulan, dan detail layanan belum dicantumkan tanpa
              sumber yang terkonfirmasi.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Informasi yang tersedia */}
      <section className="bg-gold-100">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-12">
          <SectionLabel>Informasi yang tersedia</SectionLabel>
          <StatRow items={stats} serif className="mt-6" />
        </div>
      </section>

      {/* 4. Lokasi */}
      <section className="bg-ivory">
        <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-6 py-20 lg:grid-cols-2 lg:gap-20 lg:py-24">
          <div>
            <SectionLabel>Lokasi</SectionLabel>
            <h2 className="mt-6 font-display text-4xl leading-[1.08] text-ink sm:text-5xl">
              {area}.
            </h2>
            <p className="mt-5 max-w-sm text-xs leading-relaxed text-gray-600">
              Area lokasi mengikuti alamat venue pada data. Alamat lengkap tetap
              perlu dikonfirmasi sebelum dipublikasikan sebagai patokan
              perjalanan.
            </p>
          </div>

          <div>
            <div className="border-t border-line-light py-6">
              <SectionLabel>Alamat Lengkap</SectionLabel>
              <p className="mt-3 text-sm leading-relaxed text-ink sm:text-base">
                {venue.address}
              </p>
            </div>

            <div className="border-t border-line-light py-6">
              <SectionLabel>Tautan Peta</SectionLabel>
              {venue.mapUrl ? (
                <a
                  href={venue.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-gold-700 underline transition-colors hover:text-ink"
                >
                  Lihat di peta
                </a>
              ) : (
                <p className="mt-3 text-sm text-gray-600">
                  Belum tersedia. Tidak ada tujuan peta yang ditautkan.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Ajakan menjelajah */}
      <section className="bg-gold-100">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-6 px-6 py-14">
          <div>
            <SectionLabel>Fasilitas &amp; Paket</SectionLabel>
            <h2 className="mt-4 max-w-xl font-display text-3xl leading-[1.1] text-ink sm:text-4xl">
              Telusuri fasilitas
              <br />
              dan pilihan paket.
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <PublicButton href="/fasilitas" withArrow>
              Lihat Fasilitas
            </PublicButton>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
