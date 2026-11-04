import Image from "next/image";

export interface MediaFrameProps {
  /** Path gambar di `public/`. Bila kosong, tampil placeholder berlabel. */
  src?: string | null;
  alt: string;
  /** Label yang tampil di placeholder atau sebagai keterangan gambar. */
  label: string;
  aspect?: string;
  sizes?: string;
  preload?: boolean;
  className?: string;
}

/**
 * Bingkai media dengan rasio tetap. Foto yang belum tersedia ditandai
 * sebagai placeholder berlabel (ui-spec prinsip 3).
 */
export function MediaFrame({
  src,
  alt,
  label,
  aspect = "aspect-[4/3]",
  sizes = "(min-width: 1024px) 50vw, 100vw",
  preload = false,
  className = "",
}: MediaFrameProps) {
  return (
    <figure
      className={`relative overflow-hidden bg-ink-soft ${aspect} ${className}`.trim()}
    >
      {src ? (
        <>
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            preload={preload}
            className="object-cover"
          />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-5 pb-4 pt-10 text-[10px] uppercase tracking-[0.2em] text-ivory/70">
            {label}
          </figcaption>
        </>
      ) : (
        <figcaption className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(199,164,106,0.12),transparent_65%)]"
          />
          <span className="relative font-display text-lg text-ivory/85">
            {label}
          </span>
          <span className="relative text-[10px] uppercase tracking-[0.2em] text-ivory/40">
            Foto belum tersedia
          </span>
        </figcaption>
      )}
    </figure>
  );
}
