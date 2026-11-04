import {
  FacilityRecords,
  PackageRecords,
} from "@/components/public";
import { PublicShell } from "@/components/public-shell";
import { EmptyState } from "@/components/ui";
import {
  getPublicVenue,
  listActivePackages,
  listFacilitiesWithPackages,
} from "@/modules/venue/queries";

export const dynamic = "force-dynamic";

export default async function FasilitasPage() {
  const [venue, packages, facilities] = await Promise.all([
    getPublicVenue(),
    listActivePackages(),
    listFacilitiesWithPackages(),
  ]);

  return (
    <PublicShell venue={venue} activeHref="/fasilitas">
      {/* Pilihan paket */}
      <section className="bg-ink text-ivory">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 lg:py-24">
          <div className="mb-12">
            <h2 className="font-display text-4xl leading-tight text-ivory sm:text-5xl">
              Paket & Harga
            </h2>
            <p className="mt-4 max-w-2xl text-sm text-ivory/60">
              {packages.length} paket tersedia dengan harga dan fasilitas lengkap.
            </p>
          </div>

          {packages.length > 0 ? (
            <PackageRecords
              packages={packages}
              facilities={facilities}
            />
          ) : (
            <p className="text-sm text-ivory/60">
              Belum ada paket aktif untuk ditampilkan.
            </p>
          )}
        </div>
      </section>

      {/* Fasilitas gedung */}
      <section className="bg-ivory">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-16">
          <h2 className="mb-8 font-display text-3xl leading-tight text-ink">
            Fasilitas Gedung
          </h2>

          {facilities.length > 0 ? (
            <FacilityRecords facilities={facilities} packages={packages} />
          ) : (
            <EmptyState
              title="Belum ada fasilitas"
              description="Data fasilitas akan tampil setelah admin mengisinya."
            />
          )}
        </div>
      </section>
    </PublicShell>
  );
}
