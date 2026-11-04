import Link from "next/link";

import { formatRupiah } from "@/lib/format";
import type { FacilityWithPackages, Package } from "@/modules/venue/types";

export interface PackageRecordsProps {
  packages: Package[];
  facilities: FacilityWithPackages[];
}

/**
 * Daftar paket aktif dalam grid 4 kolom horizontal, tanpa foto,
 * fokus pada harga dan item yang included.
 */
export function PackageRecords({
  packages,
  facilities,
}: PackageRecordsProps) {
  const facilityNamesByPackage = new Map(
    packages.map((pkg) => [
      pkg.id,
      facilities
        .filter((facility) => facility.packageIds.includes(pkg.id))
        .map((facility) => facility.name),
    ]),
  );

  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {packages.map((pkg) => {
        const items = facilityNamesByPackage.get(pkg.id) ?? [];

        return (
          <div
            key={pkg.id}
            className="flex flex-col rounded-xl border border-line-dark bg-ink-soft p-6 transition-all hover:border-gold-500 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-ivory">
              {pkg.name}
            </h3>

            <p className="mt-4 text-3xl font-bold text-gold-500">
              {formatRupiah(pkg.priceRupiah)}
            </p>

            <p className="mt-2 text-xs text-ivory/60">
              {pkg.durationHours} jam • {pkg.sessionCount} sesi
            </p>

            {items.length > 0 ? (
              <ul className="mt-6 flex-1 space-y-2 text-sm text-ivory/80">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <Link
              href="/reservasi"
              className="mt-6 block rounded-lg bg-gold-500 px-4 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-gold-700 hover:text-white"
            >
              Pilih Paket
            </Link>
          </div>
        );
      })}
    </div>
  );
}
