import { Button, Card, Input } from "@/components/ui";
import { requireAdminSession } from "@/modules/auth";
import { getPublicVenue } from "@/modules/venue/queries";

import { AdminPageHeader } from "../admin-page-header";
import { saveVenueContact } from "./actions";

export default async function PengaturanPage() {
  await requireAdminSession();

  const venue = await getPublicVenue();

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        overline="Konfigurasi"
        title="Pengaturan"
        description="Nomor WhatsApp admin dan data kontak yang tampil di halaman publik."
      />

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <span aria-hidden="true" className="neu-icon h-10 w-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="h-5 w-5">
              <path d="M4 7h7" />
              <path d="M15 7h5" />
              <circle cx="13" cy="7" r="2" />
              <path d="M4 17h5" />
              <path d="M13 17h7" />
              <circle cx="11" cy="17" r="2" />
            </svg>
          </span>
          <h2 className="font-heading text-lg font-semibold text-ink">
            Kontak dan tautan publik
          </h2>
        </div>
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
        <p className="neu-inset mt-5 px-4 py-3 text-xs text-gray-600">
          Bila nomor WhatsApp kosong, tombol kontak tidak membuka tautan
          WhatsApp.
        </p>
      </Card>
    </div>
  );
}
