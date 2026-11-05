import Link from "next/link";

import { Button, Card, Input, Textarea } from "@/components/ui";
import { requireAdminSession } from "@/modules/auth";
import {
  getPublicVenue,
  listAllFacilitiesWithPackages,
  listAllPackages,
} from "@/modules/venue/queries";

import { AdminPageHeader } from "../admin-page-header";
import { removeFacility, saveFacility, saveVenueProfile } from "./actions";

const cancelClass =
  "neu-button neu-button-ghost px-4 py-2 text-sm font-medium";

export default async function VenuePage({
  searchParams,
}: {
  searchParams: Promise<{ editFacility?: string }>;
}) {
  await requireAdminSession();

  const { editFacility } = await searchParams;
  const [venue, facilities, packages] = await Promise.all([
    getPublicVenue(),
    listAllFacilitiesWithPackages(),
    listAllPackages(),
  ]);

  const editing = editFacility
    ? (facilities.find((item) => item.id === editFacility) ?? null)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        overline="Identitas venue"
        title="Venue dan Fasilitas"
        description="Data identitas venue dan daftar fasilitas beserta relasinya ke paket."
      />

      <Card>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="neu-icon h-10 w-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="h-5 w-5">
              <path d="M4 20V9l8-4 8 4v11" />
              <path d="M3 20h18" />
              <path d="M8.5 20v-4.5a3.5 3.5 0 0 1 7 0V20" />
            </svg>
          </span>
          <h2 className="font-heading text-lg font-semibold text-ink">
            Data venue
          </h2>
        </div>
        <form action={saveVenueProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Nama venue"
            name="name"
            defaultValue={venue?.name ?? ""}
            required
          />
          <Input
            label="Alamat"
            name="address"
            defaultValue={venue?.address ?? ""}
            required
          />
          <Input
            label="Kapasitas minimum (tamu)"
            name="capacityMin"
            type="number"
            min={0}
            step={1}
            defaultValue={venue?.capacityMin ?? 0}
            required
          />
          <Input
            label="Kapasitas maksimum (tamu)"
            name="capacityMax"
            type="number"
            min={0}
            step={1}
            defaultValue={venue?.capacityMax ?? 0}
            required
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Deskripsi"
              name="description"
              defaultValue={venue?.description ?? ""}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Simpan data venue</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="neu-icon h-10 w-10 text-sm font-semibold">
            {editing ? "✎" : "+"}
          </span>
          <h2 className="font-heading text-lg font-semibold text-ink">
            {editing ? `Ubah fasilitas: ${editing.name}` : "Tambah fasilitas"}
          </h2>
        </div>
        <form action={saveFacility} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="ID fasilitas"
              name="id"
              defaultValue={editing?.id ?? ""}
              readOnly={Boolean(editing)}
              required
            />
            <Input
              label="Nama fasilitas"
              name="name"
              defaultValue={editing?.name ?? ""}
              required
            />
            <Input
              label="Urutan"
              name="sortOrder"
              type="number"
              min={0}
              step={1}
              defaultValue={editing?.sortOrder ?? 0}
              required
            />
            <label className="flex items-center gap-2 self-end text-sm text-ink">
              <input
                type="checkbox"
                name="active"
                className="neu-input-check"
                defaultChecked={editing ? editing.active : true}
              />
              Aktif
            </label>
            <div className="sm:col-span-2">
              <Textarea
                label="Deskripsi (opsional)"
                name="description"
                defaultValue={editing?.description ?? ""}
              />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink">
              Tersedia pada paket
            </legend>
            {packages.length === 0 ? (
              <p className="text-sm text-gray-600">Belum ada paket.</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {packages.map((pkg) => (
                  <label
                    key={pkg.id}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    <input
                      type="checkbox"
                      name="packageIds"
                      value={pkg.id}
                      className="neu-input-check"
                      defaultChecked={editing?.packageIds.includes(pkg.id)}
                    />
                    {pkg.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div className="flex gap-2">
            <Button type="submit">
              {editing ? "Simpan fasilitas" : "Tambah fasilitas"}
            </Button>
            {editing ? (
              <Link href="/admin/venue" className={cancelClass}>
                Batal
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-ink">
            Daftar fasilitas
          </h2>
          <span className="neu-pill px-3 py-1 text-xs text-gray-600">
            {facilities.length} fasilitas
          </span>
        </div>
        {facilities.length === 0 ? (
          <p className="neu-inset mt-4 px-4 py-6 text-center text-sm text-gray-600">
            Belum ada fasilitas.
          </p>
        ) : (
          <div className="neu-table-wrap mt-4 overflow-x-auto p-2">
            <table className="neu-table w-full text-left text-sm">
              <thead className="text-gray-600">
                <tr>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Paket terkait</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((item) => {
                  const related = item.packageIds
                    .map(
                      (id) =>
                        packages.find((pkg) => pkg.id === id)?.name ?? undefined,
                    )
                    .filter((name): name is string => Boolean(name));
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-3 text-ink">{item.name}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {related.length > 0 ? related.join(", ") : "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className={`neu-accent-dot ${
                              item.active ? "bg-emerald-500" : "bg-red-400"
                            }`}
                          />
                          {item.active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/venue?editFacility=${encodeURIComponent(item.id)}`}
                            className="neu-button neu-button-ghost px-3 py-1.5 text-sm font-medium"
                          >
                            Ubah
                          </Link>
                          <form action={removeFacility}>
                            <input type="hidden" name="id" value={item.id} />
                            <Button type="submit" variant="ghost">
                              Hapus
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
