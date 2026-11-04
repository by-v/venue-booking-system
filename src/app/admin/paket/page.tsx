import Link from "next/link";

import { Button, Card, Input } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { requireAdminSession } from "@/modules/auth";
import { listAllPackages } from "@/modules/venue/queries";

import { savePackage, togglePackage } from "./actions";

const cancelClass =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-gold-100";

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
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ink">Paket</h1>
        <p className="mt-1 text-sm text-gray-600">
          Buat, ubah, dan aktifkan/nonaktifkan paket. Paket nonaktif tidak
          tampil di halaman publik.
        </p>
      </div>

      <Card>
        <h2 className="font-heading text-lg font-semibold text-ink">
          {editing ? `Ubah paket: ${editing.name}` : "Tambah paket"}
        </h2>
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
        <h2 className="font-heading text-lg font-semibold text-ink">
          Daftar paket
        </h2>
        {packages.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">Belum ada paket.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="py-2">Nama</th>
                <th className="py-2">Harga</th>
                <th className="py-2">Durasi</th>
                <th className="py-2">Status</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} className="border-t border-gray-300">
                  <td className="py-2 text-ink">{pkg.name}</td>
                  <td className="py-2 text-gray-600">
                    {formatRupiah(pkg.priceRupiah)}
                  </td>
                  <td className="py-2 text-gray-600">
                    {pkg.durationHours} jam · {pkg.sessionCount} sesi
                  </td>
                  <td className="py-2 text-gray-600">
                    {pkg.active ? "Aktif" : "Nonaktif"}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/paket?edit=${encodeURIComponent(pkg.id)}`}
                        className="text-sm font-medium text-gold-700 underline"
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
        )}
      </Card>
    </div>
  );
}
