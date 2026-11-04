import Image from "next/image";
import Link from "next/link";

import {
  ArrowLink,
  EventCategoryCard,
  MediaFrame,
  PackagePriceList,
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
import { GALLERY_CATEGORY_LABELS } from "@/modules/venue/types";

// Harga dan konten harus tampil dari database tanpa deploy (SK-4).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [venue, packages, facilities] = await Promise.all([
    getPublicVenue(),
    listActivePackages(),
    listFacilitiesWithPackages(),
  ]);

  if (!venue) {
    return (
      <PublicShell venue={null}>
        <section className="mx-auto w-full max-w-3xl px-6 py-24">
          <EmptyState
            title="Data venue belum tersedia"
            description="Informasi venue akan tampil setelah admin mengisinya."
          />
        </section>
      </PublicShell>
    );
  }

  const categories = Object.entries(GALLERY_CATEGORY_LABELS);
  const primaryCategories = categories.slice(0, 3);
  const secondaryCategories = categories.slice(3);

  const stats = [
    `${formatNumber(venue.capacityMin)}–${formatNumber(venue.capacityMax)} tamu`,
    `${packages.length} paket aktif`,
    `${facilities.length} fasilitas`,
  ];

  const ctaButton = (
    <PublicButton href="/reservasi" withArrow>
      Pesan Sekarang
    </PublicButton>
  );

  return (
    <PublicShell venue={venue} activeHref="/">
      {/* 1. Hero */}
      <section className="bg-ink px-4 pt-4">
        <div className="relative mx-auto max-w-[1240px] overflow-hidden border border-line-dark">
          <Image
            src="/galeri/gedung-malam.png"
            alt="Tampak luar gedung H.A. Djunaid Convention Center pada malam hari"
            fill
            preload
            sizes="100vw"
            className="object-cover opacity-50"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/25"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent"
          />

          <div className="relative px-6 py-20 sm:px-10 lg:px-16 lg:py-28">
            <SectionLabel tone="dark">
              Pekalongan Selatan / Convention Center
            </SectionLabel>

            <h1 className="mt-10 max-w-4xl font-display text-5xl leading-[1.04] text-ivory sm:text-6xl lg:text-[76px]">
              Gedung
              <span className="mt-1 block">{venue.name}</span>
            </h1>

            <p className="mt-8 max-w-xl text-sm leading-relaxed text-ivory/70 sm:text-base">
              {venue.description}
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <PublicButton href="/reservasi" withArrow>
                Pesan Sekarang
              </PublicButton>
              <PublicButton href="/fasilitas" variant="outline">
                Lihat Fasilitas
              </PublicButton>
            </div>

            <p className="mt-16 max-w-md text-[10px] uppercase leading-relaxed tracking-[0.2em] text-ivory/45">
              {venue.address}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Tentang gedung */}
      <section className="bg-ivory">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <SectionLabel>Tentang Gedung</SectionLabel>
              <h2 className="mt-6 font-display text-4xl leading-[1.08] text-ink sm:text-5xl">
                Mengenal ruang,
                <br />
                merencanakan momen.
              </h2>
              <p className="mt-6 max-w-lg text-sm leading-relaxed text-gray-600 sm:text-base">
                {venue.description}
              </p>
              <ArrowLink href="/tentang" className="mt-8">
                Tentang Gedung
              </ArrowLink>
            </div>

            <MediaFrame
              src="/galeri/venue-02.jpeg"
              alt="Aisle dan panggung acara di dalam gedung"
              label="Tampak dalam gedung"
            />
          </div>

          <div className="mt-14 border-t border-line-light pt-8">
            <StatRow items={stats} />
          </div>
        </div>
      </section>

      {/* 3. Ragam acara */}
      <section className="bg-ink text-ivory">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-20 lg:py-24">
          <SectionLabel tone="dark">Ragam Acara</SectionLabel>
          <h2 className="mt-6 max-w-2xl font-display text-4xl leading-[1.08] sm:text-5xl">
            Sebuah tempat.
            <br />
            Beragam pertemuan.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-ivory/60">
            Tujuh kategori acara pada situs. Dokumentasi visual tiap kategori
            mengikuti aset autentik yang tersedia.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {primaryCategories.map(([key, label]) => (
              <EventCategoryCard key={key} label={label} />
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {secondaryCategories.map(([key, label]) => (
              <EventCategoryCard key={key} label={label} />
            ))}
          </div>

          <p className="mt-8 text-[10px] uppercase tracking-[0.2em] text-ivory/40">
            Kategori informasi · bukan tautan pemesanan
          </p>
        </div>
      </section>

      {/* 4. Fasilitas dan paket */}
      <section className="bg-ivory">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
            <div>
              <SectionLabel>Fasilitas &amp; Paket</SectionLabel>
              <h2 className="mt-6 max-w-lg font-display text-4xl leading-[1.08] text-ink sm:text-5xl">
                Mulai dari kebutuhan
                <br />
                acara Anda.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-gray-600 sm:text-base">
                Lihat daftar {facilities.length} fasilitas dan {packages.length}{" "}
                paket aktif. Rincian yang belum dilampirkan ditandai agar mudah
                ditinjau.
              </p>
              <ArrowLink href="/fasilitas" className="mt-8">
                Jelajahi Fasilitas &amp; Paket
              </ArrowLink>
            </div>

            <div>
              {packages.length > 0 ? (
                <PackagePriceList packages={packages} />
              ) : (
                <p className="text-sm text-gray-600">
                  Belum ada paket aktif untuk ditampilkan.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Ajakan menghubungi */}
      <section className="bg-ink px-4 pb-4">
        <div className="mx-auto max-w-[1240px] border border-line-dark">
          <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:items-center lg:p-16">
            <div>
              <SectionLabel tone="dark">Gedung H.A. Djunaid</SectionLabel>
              <h2 className="mt-6 font-display text-4xl leading-[1.08] text-ivory sm:text-5xl">
                Rencana Anda,
                <br />
                dimulai di sini.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-ivory/60">
                Periksa informasi yang tersedia sebelum melanjutkan. Status kanal
                komunikasi dapat dilihat di halaman Kontak.
              </p>
              <div className="mt-8">{ctaButton}</div>
              <Link
                href="/tentang"
                className="mt-6 inline-block text-[10px] uppercase tracking-[0.2em] text-ivory/40 transition-colors hover:text-ivory/70"
              >
                Tentang H.A. Djunaid Convention Center
              </Link>
            </div>

            <MediaFrame
              src="/galeri/venue-04.jpeg"
              alt="Dekorasi dan meja tamu di dalam gedung"
              label="Latar visual gedung"
            />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
