import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark, PublicButton } from "@/components/public";
import type { Venue } from "@/modules/venue/types";
import { buildWhatsAppLink } from "@/modules/venue/whatsapp";

// Elemen bersama halaman publik (ui-spec 4.1). Menu utama tanpa change tidak
// ditampilkan; "Cek Status Reservasi" tersedia di footer.
const NAV_ITEMS = [
  { href: "/", label: "Beranda" },
  { href: "/tentang", label: "Tentang Kami" },
  { href: "/fasilitas", label: "Fasilitas" },
  { href: "/galeri", label: "Galeri" },
  { href: "/kontak", label: "Kontak" },
] as const;

export interface PublicShellProps {
  venue: Venue | null;
  /** Rute menu yang sedang aktif; ditandai garis bawah emas. */
  activeHref?: string;
  children: ReactNode;
}

export function PublicShell({
  venue,
  activeHref,
  children,
}: PublicShellProps) {
  const whatsappHref = buildWhatsAppLink(venue?.adminWhatsapp ?? null);
  const name = venue?.name ?? "H.A. Djunaid Convention Center";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-ink">
      <header data-public-shell-header className="bg-ink text-ivory">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark className="h-10 w-10 shrink-0 text-gold-500" />
            <span className="max-w-[19ch] font-display text-sm uppercase leading-snug tracking-[0.12em] text-ivory">
              {name}
            </span>
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activeHref === item.href ? "page" : undefined}
                className={`border-b pb-0.5 transition-colors hover:border-gold-500 hover:text-ivory ${
                  activeHref === item.href
                    ? "border-gold-500 text-ivory"
                    : "border-transparent text-ivory/70"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <PublicButton
              href="/reservasi"
              withArrow
              className="px-4 py-2.5"
            >
              Pesan Sekarang
            </PublicButton>
          </nav>
        </div>
      </header>

      <main data-public-shell-main className="flex-1 bg-ivory">{children}</main>

      <footer data-public-shell-footer className="bg-ink text-ivory/60">
        <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-6 py-16 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <p className="max-w-[16ch] font-display text-2xl leading-snug text-ivory">
              {name}
            </p>
          </div>

          <nav
            aria-label="Navigasi footer"
            className="flex flex-col gap-3 text-sm"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-ivory"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/cek-status"
              className="transition-colors hover:text-ivory"
            >
              Cek Status Reservasi
            </Link>
          </nav>

          <div className="flex flex-col gap-3 text-sm leading-relaxed">
            <p>
              {whatsappHref
                ? "Kanal WhatsApp admin terhubung."
                : "Kanal WhatsApp menunggu konfirmasi."}
            </p>
            {venue?.address ? <p>{venue.address}</p> : null}
            {venue?.email ? (
              <a
                href={`mailto:${venue.email}`}
                className="transition-colors hover:text-ivory"
              >
                {venue.email}
              </a>
            ) : null}
            {venue?.instagramUrl ? (
              <a
                href={venue.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-ivory"
              >
                Instagram
              </a>
            ) : null}
            <Link
              href="/kontak"
              className="mt-1 inline-flex text-xs text-gold-500 transition-colors hover:text-gold-100"
            >
              Lihat halaman kontak
            </Link>
          </div>
        </div>

        <div className="border-t border-line-dark">
          <div className="mx-auto w-full max-w-[1240px] px-6 py-6 text-xs text-ivory/40">
            © {name}
          </div>
        </div>
      </footer>
    </div>
  );
}
