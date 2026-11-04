import Image from "next/image";

export interface EventCategoryCardProps {
  label: string;
  /** Foto kategori; bila kosong tampil placeholder berlabel. */
  src?: string | null;
}

/**
 * Kartu kategori acara. Kategori bersifat informasi, bukan tautan pemesanan
 * (ui-spec 4.1), sehingga tidak dibungkus tautan.
 */
export function EventCategoryCard({ label, src }: EventCategoryCardProps) {
  return (
    <article className="relative overflow-hidden border border-line-dark bg-ink-soft">
      <div className="relative aspect-[5/4] sm:aspect-[4/3]">
        {src ? (
          <>
            <Image
              src={src}
              alt={`Suasana acara ${label}`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
          </>
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(199,164,106,0.1),transparent_65%)]"
          />
        )}

        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 text-center font-display text-lg text-ivory">
          {label}
        </p>

        {src ? null : (
          <p className="absolute inset-x-0 bottom-4 px-4 text-[9px] uppercase leading-relaxed tracking-[0.18em] text-ivory/40">
            Foto kategori belum tersedia. Akan ditampilkan setelah aset autentik
            tersedia.
          </p>
        )}
      </div>
    </article>
  );
}
