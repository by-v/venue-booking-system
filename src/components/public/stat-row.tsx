import { Fragment } from "react";

export interface StatRowProps {
  items: string[];
  tone?: "light" | "dark";
  /** Tampilkan nilai dengan tipografi serif (dipakai halaman Tentang). */
  serif?: boolean;
  className?: string;
}

/** Baris fakta ringkas dengan pemisah garis miring, mis. kapasitas/paket/fasilitas. */
export function StatRow({
  items,
  tone = "light",
  serif = false,
  className = "",
}: StatRowProps) {
  const textClass = tone === "dark" ? "text-ivory" : "text-ink";
  const separatorClass = tone === "dark" ? "text-gold-500/60" : "text-gold-500";
  const valueClass = serif ? "font-display text-lg sm:text-xl" : "";

  return (
    <div
      className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-base ${textClass} ${className}`.trim()}
    >
      {items.map((item, index) => (
        <Fragment key={item}>
          <span className={valueClass || undefined}>{item}</span>
          {index < items.length - 1 ? (
            <span aria-hidden="true" className={separatorClass}>
              /
            </span>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
