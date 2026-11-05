import Link from "next/link";

import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { requireAdminSession } from "@/modules/auth";
import { listAllGallery } from "@/modules/venue/queries";
import {
  GALLERY_CATEGORIES,
  GALLERY_CATEGORY_LABELS,
} from "@/modules/venue/types";

import { AdminPageHeader } from "../admin-page-header";
import { saveGalleryItem, toggleGalleryItem } from "./actions";

const cancelClass =
  "neu-button neu-button-ghost px-4 py-2 text-sm font-medium";

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
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        overline="Konten visual"
        title="Galeri"
        description="Kelola metadata foto: judul, jenis acara, urutan, status, dan lokasi gambar. Tidak ada unggah berkas."
      />

      <Card>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="neu-icon h-10 w-10 text-sm font-semibold">
            {editing ? "✎" : "+"}
          </span>
          <h2 className="font-heading text-lg font-semibold text-ink">
            {editing ? `Ubah foto: ${editing.title}` : "Tambah foto"}
          </h2>
        </div>
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
              className="neu-input-check"
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-ink">
            Daftar foto
          </h2>
          <span className="neu-pill px-3 py-1 text-xs text-gray-600">
            {items.length} item
          </span>
        </div>
        {items.length === 0 ? (
          <p className="neu-inset mt-4 px-4 py-6 text-center text-sm text-gray-600">
            Belum ada foto.
          </p>
        ) : (
          <div className="neu-table-wrap mt-4 overflow-x-auto p-2">
            <table className="neu-table w-full text-left text-sm">
              <thead className="text-gray-600">
                <tr>
                  <th className="px-3 py-2">Judul</th>
                  <th className="px-3 py-2">Jenis acara</th>
                  <th className="px-3 py-2">Gambar</th>
                  <th className="px-3 py-2">Urutan</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 text-ink">{item.title}</td>
                    <td className="px-3 py-3 text-gray-600">
                      {GALLERY_CATEGORY_LABELS[item.category]}
                    </td>
                    <td className="max-w-xs truncate px-3 py-3 text-gray-600">
                      {item.imagePath}
                    </td>
                    <td className="px-3 py-3 text-gray-600">{item.sortOrder}</td>
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
                          href={`/admin/galeri?edit=${encodeURIComponent(item.id)}`}
                          className="neu-button neu-button-ghost px-3 py-1.5 text-sm font-medium"
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
          </div>
        )}
      </Card>
    </div>
  );
}
