import { formatRupiah } from "@/lib/format";
import type { Package } from "@/modules/venue/types";

export interface PackagePriceListProps {
  packages: Package[];
  className?: string;
}

/**
 * Ringkasan paket aktif di Beranda. Harga tetap tampil di halaman publik
 * (Katalog Paket dan Harga) meski desain menyederhanakan section ini.
 */
export function PackagePriceList({
  packages,
  className = "",
}: PackagePriceListProps) {
  return (
    <ul
      className={`divide-y divide-line-light border-t border-line-light ${className}`.trim()}
    >
      {packages.map((pkg) => (
        <li
          key={pkg.id}
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-5"
        >
          <div>
            <p className="font-display text-lg text-ink">{pkg.name}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gray-600">
              {pkg.durationHours} jam · {pkg.sessionCount} sesi
            </p>
          </div>
          <p className="text-sm font-medium text-gold-700">
            {formatRupiah(pkg.priceRupiah)}
          </p>
        </li>
      ))}
    </ul>
  );
}
