import { ArrowLink } from "@/components/public";
import { PublicShell } from "@/components/public-shell";
import { EmptyState } from "@/components/ui";
import { getPublicVenue, listActiveGallery } from "@/modules/venue/queries";

import { GalleryBrowser } from "./gallery-browser";

export const dynamic = "force-dynamic";

export default async function GaleriPage() {
  const [venue, items] = await Promise.all([
    getPublicVenue(),
    listActiveGallery(),
  ]);

  return (
    <PublicShell venue={venue} activeHref="/galeri">
      <section className="bg-ivory">
        <div className="mx-auto w-full max-w-[1440px] px-6 pb-20 pt-16 lg:pt-20">
          {items.length === 0 ? (
            <EmptyState
              title="Belum ada foto"
              description="Foto galeri akan tampil setelah admin mengisinya."
            />
          ) : (
            <GalleryBrowser items={items} />
          )}
        </div>
      </section>

      <section className="bg-gold-100">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-16">
          <h2 className="font-display text-3xl leading-[1.1] text-ink sm:text-4xl">
            Kenali gedung lebih dekat.
          </h2>
          <ArrowLink href="/tentang" className="mt-5">
            Tentang Gedung
          </ArrowLink>
        </div>
      </section>
    </PublicShell>
  );
}
