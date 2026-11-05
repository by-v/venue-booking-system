import Link from "next/link";

import { Button, Card, Input } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { requireAdminSession } from "@/modules/auth";
import { listAllPackages } from "@/modules/venue/queries";

import { AdminPageHeader } from "../admin-page-header";
import { savePackage, togglePackage } from "./actions";

const cancelClass =
  "neu-button neu-button-ghost px-4 py-2 text-sm font-medium";

export default async function PaketPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdminSession();

  const { edit } = await searchParams;
  const packages = await listAllPackages();
  const editing = edit
    ? (packages.find((item) => item.id === edit) ?? null)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        overline="Katalog venue"
        title="Paket"
        description="Buat, ubah, dan aktifkan/nonaktifkan paket. Paket nonaktif tidak tampil di halaman publik."
      />

      <Card>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="neu-icon h-10 w-10 text-sm font-semibold">
            {editing ? "✎" : "+"}
          </span>
          <h2 className="font-heading text-lg font-semibold text-ink">
            {editing ? `Ubah paket: ${editing.name}` : "Tambah paket"}
          </h2>
        </div>
        <form action={savePackage} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="ID paket"
            name="id"
            defaultValue={editing?.id ?? ""}
            readOnly={Boolean(editing)}
            required
          />
          <Input
            label="Nama paket"
            name="name"
            defaultValue={editing?.name ?? ""}
            required
          />
          <Input
            label="Harga (rupiah)"
            name="priceRupiah"
            type="number"
            min={0}
            step={1}
            defaultValue={editing?.priceRupiah ?? 0}
            required
          />
          <Input
            label="Durasi per sesi (jam)"
            name="durationHours"
            type="number"
            min={1}
            step={1}
            defaultValue={editing?.durationHours ?? 1}
            required
          />
          <Input
            label="Jumlah sesi"
            name="sessionCount"
            type="number"
            min={1}
            step={1}
            defaultValue={editing?.sessionCount ?? 1}
            required
          />
          <Input
            label="Hari setup sebelum acara"
            name="setupDaysBefore"
            type="number"
            min={0}
            step={1}
            defaultValue={editing?.setupDaysBefore ?? 0}
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
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">
              {editing ? "Simpan perubahan" : "Tambah paket"}
            </Button>
            {editing ? (
              <Link href="/admin/paket" className={cancelClass}>
                Batal
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-ink">
            Daftar paket
          </h2>
          <span className="neu-pill px-3 py-1 text-xs text-gray-600">
            {packages.length} paket
          </span>
        </div>
        {packages.length === 0 ? (
          <p className="neu-inset mt-4 px-4 py-6 text-center text-sm text-gray-600">
            Belum ada paket.
          </p>
        ) : (
          <div className="neu-table-wrap mt-4 overflow-x-auto p-2">
            <table className="neu-table w-full text-left text-sm">
              <thead className="text-gray-600">
                <tr>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Harga</th>
                  <th className="px-3 py-2">Durasi</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td className="px-3 py-3 text-ink">{pkg.name}</td>
                    <td className="px-3 py-3 text-gray-600">
                      {formatRupiah(pkg.priceRupiah)}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {pkg.durationHours} jam · {pkg.sessionCount} sesi
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className={`neu-accent-dot ${
                            pkg.active ? "bg-emerald-500" : "bg-red-400"
                          }`}
                        />
                        {pkg.active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/paket?edit=${encodeURIComponent(pkg.id)}`}
                          className="neu-button neu-button-ghost px-3 py-1.5 text-sm font-medium"
                        >
                          Ubah
                        </Link>
                        <form action={togglePackage}>
                          <input type="hidden" name="id" value={pkg.id} />
                          <input
                            type="hidden"
                            name="active"
                            value={pkg.active ? "false" : "true"}
                          />
                          <Button type="submit" variant="ghost">
                            {pkg.active ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
