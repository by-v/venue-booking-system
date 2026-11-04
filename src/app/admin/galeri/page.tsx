import Link from "next/link";

import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { requireAdminSession } from "@/modules/auth";
import { listAllGallery } from "@/modules/venue/queries";
import {
  GALLERY_CATEGORIES,
  GALLERY_CATEGORY_LABELS,
} from "@/modules/venue/types";

import { saveGalleryItem, toggleGalleryItem } from "./actions";

const cancelClass =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-gold-100";

export default async function GaleriAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdminSession();

  const { edit } = await searchParams;
  const items = await listAllGallery();
  const editing = edit
    ? (items.find((item) => item.id === edit) ?? null)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ink">Galeri</h1>
        <p className="mt-1 text-sm text-gray-600">
          Kelola metadata foto: judul, jenis acara, urutan, status, dan lokasi
          gambar. Tidak ada unggah berkas.
        </p>
      </div>

      <Card>
        <h2 className="font-heading text-lg font-semibold text-ink">
          {editing ? `Ubah foto: ${editing.title}` : "Tambah foto"}
        </h2>
        <form action={saveGalleryItem} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="ID item"
            name="id"
            defaultValue={editing?.id ?? ""}
            readOnly={Boolean(editing)}
            required
          />
          <Input
            label="Judul"
            name="title"
            defaultValue={editing?.title ?? ""}
            required
          />
          <Select
            label="Jenis acara"
            name="category"
            defaultValue={editing?.category ?? "PERNIKAHAN"}
            required
          >
            {GALLERY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {GALLERY_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
          <Input
            label="Lokasi gambar"
            name="imagePath"
            placeholder="/galeri/venue-01.jpeg atau https://…"
            defaultValue={editing?.imagePath ?? ""}
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
              label="Keterangan (opsional)"
              name="caption"
              defaultValue={editing?.caption ?? ""}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">
              {editing ? "Simpan perubahan" : "Tambah foto"}
            </Button>
            {editing ? (
              <Link href="/admin/galeri" className={cancelClass}>
                Batal
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-heading text-lg font-semibold text-ink">
          Daftar foto
        </h2>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">Belum ada foto.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="py-2">Judul</th>
                <th className="py-2">Jenis acara</th>
                <th className="py-2">Gambar</th>
                <th className="py-2">Urutan</th>
                <th className="py-2">Status</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-gray-300">
                  <td className="py-2 text-ink">{item.title}</td>
                  <td className="py-2 text-gray-600">
                    {GALLERY_CATEGORY_LABELS[item.category]}
                  </td>
                  <td className="max-w-xs truncate py-2 text-gray-600">
                    {item.imagePath}
                  </td>
                  <td className="py-2 text-gray-600">{item.sortOrder}</td>
                  <td className="py-2 text-gray-600">
                    {item.active ? "Aktif" : "Nonaktif"}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/galeri?edit=${encodeURIComponent(item.id)}`}
                        className="text-sm font-medium text-gold-700 underline"
                      >
                        Ubah
                      </Link>
                      <form action={toggleGalleryItem}>
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={item.active ? "false" : "true"}
                        />
                        <Button type="submit" variant="ghost">
                          {item.active ? "Nonaktifkan" : "Aktifkan"}
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
