import Link from "next/link";

import { Button, Card, Input, Textarea } from "@/components/ui";
import { requireAdminSession } from "@/modules/auth";
import {
  getPublicVenue,
  listAllFacilitiesWithPackages,
  listAllPackages,
} from "@/modules/venue/queries";

import { removeFacility, saveFacility, saveVenueProfile } from "./actions";

const cancelClass =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-gold-100";

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
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ink">
          Venue dan Fasilitas
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Data identitas venue dan daftar fasilitas beserta relasinya ke paket.
        </p>
      </div>

      <Card>
        <h2 className="font-heading text-lg font-semibold text-ink">
          Data venue
        </h2>
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
        <h2 className="font-heading text-lg font-semibold text-ink">
          {editing ? `Ubah fasilitas: ${editing.name}` : "Tambah fasilitas"}
        </h2>
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
        <h2 className="font-heading text-lg font-semibold text-ink">
          Daftar fasilitas
        </h2>
        {facilities.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">Belum ada fasilitas.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="py-2">Nama</th>
                <th className="py-2">Paket terkait</th>
                <th className="py-2">Status</th>
                <th className="py-2">Aksi</th>
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
                  <tr key={item.id} className="border-t border-gray-300">
                    <td className="py-2 text-ink">{item.name}</td>
                    <td className="py-2 text-gray-600">
                      {related.length > 0 ? related.join(", ") : "—"}
                    </td>
                    <td className="py-2 text-gray-600">
                      {item.active ? "Aktif" : "Nonaktif"}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/venue?editFacility=${encodeURIComponent(item.id)}`}
                          className="text-sm font-medium text-gold-700 underline"
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
        )}
      </Card>
    </div>
  );
}
