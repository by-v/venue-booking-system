import { PublicShell } from "@/components/public-shell";
import { EmptyState } from "@/components/ui";
import { getPublicVenue } from "@/modules/venue/queries";
import { buildWhatsAppLink } from "@/modules/venue/whatsapp";

export const dynamic = "force-dynamic";

/** Kecamatan dari alamat, mis. "Pekalongan Selatan" dari "Kec. Pekalongan Selatan". */
function districtLabel(address: string): string | null {
  const match = address.match(/\bKec(?:amatan)?\.?\s*([^,]+)/i);
  return match ? match[1].trim() : null;
}

export default async function KontakPage() {
  const venue = await getPublicVenue();

  if (!venue) {
    return (
      <PublicShell venue={null} activeHref="/kontak">
        <section className="mx-auto w-full max-w-3xl px-6 py-24">
          <EmptyState
            title="Data venue belum tersedia"
            description="Informasi kontak akan tampil setelah admin mengisinya."
          />
        </section>
      </PublicShell>
    );
  }

  const whatsappHref = buildWhatsAppLink(venue.adminWhatsapp);
  const district = districtLabel(venue.address);
  const locationHeading = district ? `${district}.` : "Lokasi gedung.";

  return (
    <PublicShell venue={venue} activeHref="/kontak">
      {/* Hero Section */}
      <section className="bg-ivory">
        <div className="mx-auto w-full max-w-[1440px] px-6 pb-14 pt-20 lg:pb-16 lg:pt-24">
          <h1 className="max-w-4xl font-display text-5xl leading-[1.04] text-ink sm:text-6xl lg:text-[76px]">
            Langkah berikutnya,
            <span className="mt-1 block">dengan kepastian.</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Hubungi kami melalui saluran komunikasi berikut untuk reservasi atau pertanyaan.
          </p>
        </div>
      </section>

      {/* Contact Channels */}
      <section className="bg-ink">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 lg:py-24">
          <h2 className="mb-12 font-display text-3xl leading-tight text-ivory sm:text-4xl">
            Hubungi Kami
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* WhatsApp */}
            <div className="flex flex-col rounded-xl border border-line-dark bg-ink-soft p-6 transition-all hover:border-gold-500">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/10">
                <svg className="h-8 w-8 text-gold-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-ivory">WhatsApp</h3>
              {whatsappHref ? (
                <>
                  <p className="mb-4 text-sm text-ivory/60">{venue.adminWhatsapp}</p>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto block rounded-lg bg-gold-500 px-4 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-gold-700 hover:text-white"
                  >
                    Chat Sekarang
                  </a>
                </>
              ) : (
                <p className="text-sm text-ivory/40">Belum tersedia</p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col rounded-xl border border-line-dark bg-ink-soft p-6 transition-all hover:border-gold-500">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/10">
                <svg className="h-8 w-8 text-gold-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-ivory">Email</h3>
              {venue.email ? (
                <>
                  <p className="mb-4 break-all text-sm text-ivory/60">{venue.email}</p>
                  <a
                    href={`mailto:${venue.email}`}
                    className="mt-auto block rounded-lg bg-gold-500 px-4 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-gold-700 hover:text-white"
                  >
                    Kirim Email
                  </a>
                </>
              ) : (
                <p className="text-sm text-ivory/40">Belum tersedia</p>
              )}
            </div>

            {/* Instagram */}
            <div className="flex flex-col rounded-xl border border-line-dark bg-ink-soft p-6 transition-all hover:border-gold-500">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/10">
                <svg className="h-8 w-8 text-gold-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-ivory">Instagram</h3>
              {venue.instagramUrl ? (
                <>
                  <p className="mb-4 text-sm text-ivory/60">@h.a.djunaid</p>
                  <a
                    href={venue.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto block rounded-lg bg-gold-500 px-4 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-gold-700 hover:text-white"
                  >
                    Lihat Profil
                  </a>
                </>
              ) : (
                <p className="text-sm text-ivory/40">Belum tersedia</p>
              )}
            </div>

            {/* Telepon */}
            <div className="flex flex-col rounded-xl border border-line-dark bg-ink-soft p-6 transition-all hover:border-gold-500">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/10">
                <svg className="h-8 w-8 text-gold-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-ivory">Telepon</h3>
              {venue.contact ? (
                <>
                  <p className="mb-4 text-sm text-ivory/60">{venue.contact}</p>
                  <a
                    href={`tel:${venue.contact}`}
                    className="mt-auto block rounded-lg bg-gold-500 px-4 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-gold-700 hover:text-white"
                  >
                    Hubungi
                  </a>
                </>
              ) : (
                <p className="text-sm text-ivory/40">Belum tersedia</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="bg-ivory">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20">
          <h2 className="mb-8 font-display text-3xl leading-tight text-ink sm:text-4xl">
            {locationHeading}
          </h2>

          <div className="overflow-hidden rounded-xl border border-line-light bg-white shadow-sm">
            <div className="p-6">
              <p className="mb-4 text-base leading-relaxed text-ink">
                {venue.address}
              </p>
              {venue.mapUrl ? (
                <a
                  href={venue.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-gold-700 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Buka di Google Maps
                </a>
              ) : null}
            </div>

            {venue.mapUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  src={venue.mapUrl.replace('/maps/', '/maps/embed/')}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Lokasi gedung"
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
