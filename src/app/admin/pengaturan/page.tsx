import { Button, Card, Input } from "@/components/ui";
import { requireAdminSession } from "@/modules/auth";
import { getPublicVenue } from "@/modules/venue/queries";

import { saveVenueContact } from "./actions";

export default async function PengaturanPage() {
  await requireAdminSession();

  const venue = await getPublicVenue();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ink">
          Pengaturan
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Nomor WhatsApp admin dan data kontak yang tampil di halaman publik.
        </p>
      </div>

      <Card>
        <form action={saveVenueContact} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nomor WhatsApp admin"
            name="adminWhatsapp"
            placeholder="08xxxxxxxxxx"
            defaultValue={venue?.adminWhatsapp ?? ""}
          />
          <Input
            label="Kontak tambahan"
            name="contact"
            defaultValue={venue?.contact ?? ""}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            defaultValue={venue?.email ?? ""}
          />
          <Input
            label="Instagram (URL)"
            name="instagramUrl"
            defaultValue={venue?.instagramUrl ?? ""}
          />
          <div className="sm:col-span-2">
            <Input
              label="Tautan peta (URL)"
              name="mapUrl"
              defaultValue={venue?.mapUrl ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Simpan pengaturan</Button>
          </div>
        </form>
        <p className="mt-4 text-xs text-gray-600">
          Bila nomor WhatsApp kosong, tombol kontak tidak membuka tautan
          WhatsApp.
        </p>
      </Card>
    </div>
  );
}
