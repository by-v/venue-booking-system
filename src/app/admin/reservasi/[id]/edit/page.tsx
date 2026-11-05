import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { todayInJakarta } from "@/modules/availability/dates";
import { requireAdminSession } from "@/modules/auth";
import { getReservationDetail } from "@/modules/reservation/queries";
import type { ReservationStatus } from "@/modules/reservation/types";
import { listAllPackages } from "@/modules/venue/queries";
import {
  GALLERY_CATEGORIES,
  GALLERY_CATEGORY_LABELS,
} from "@/modules/venue/types";

import { AdminPageHeader } from "../../../admin-page-header";
import { updateReservationData } from "../../actions";

const FINAL_STATUSES: readonly ReservationStatus[] = [
  "DIBATALKAN",
  "AUTO_CANCELLED",
  "SELESAI",
];

const ERROR_MESSAGES: Record<string, string> = {
  PACKAGE_UNAVAILABLE: "Paket tidak tersedia.",
  DATE_NOT_BOOKABLE: "Tanggal tidak dapat dipesan.",
  DATE_CONFLICT:
    "Tanggal acara atau setup sudah terkunci. Periksa daftar bentrok sebelum mencoba lagi.",
  RESERVATION_NOT_FOUND: "Reservasi tidak ditemukan.",
  INVALID_STATE: "Data reservasi tidak dapat diubah pada status saat ini.",
  CUSTOMER_WHATSAPP_TAKEN:
    "Nomor WhatsApp sudah dipakai customer lain. Periksa kembali nomor tersebut.",
  TOTAL_BELOW_VERIFIED_PAYMENT:
    "Total paket baru lebih kecil dari pembayaran yang sudah terverifikasi.",
  INPUT_TIDAK_VALID: "Input tidak valid. Periksa kembali isian Anda.",
};

function errorMessage(code: string | undefined): string | null {
  if (!code) {
    return null;
  }
  return ERROR_MESSAGES[code] ?? "Terjadi kesalahan. Coba lagi.";
}

export default async function EditReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ galat?: string }>;
}) {
  await requireAdminSession();

  const { id } = await params;
  const { galat } = (await searchParams) ?? {};
  const [reservation, packages] = await Promise.all([
    getReservationDetail(id),
    listAllPackages(),
  ]);

  if (!reservation) {
    notFound();
  }

  const bannerMessage = errorMessage(galat);
  const canEdit = !FINAL_STATUSES.includes(reservation.status);
  const today = todayInJakarta();

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        overline="Koreksi data"
        title="Edit data reservasi"
        description="Perbaiki data yang diisi customer tanpa perlu membuat reservasi baru. Data customer dipakai bersama oleh seluruh reservasi dengan nomor WhatsApp yang sama."
        backHref={`/admin/reservasi/${reservation.id}`}
        backLabel="Kembali ke detail reservasi"
      />

      {bannerMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/60 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-[inset_3px_3px_7px_rgba(159,145,126,0.25),inset_-3px_-3px_7px_rgba(255,255,255,0.7)]"
        >
          {bannerMessage}
        </p>
      ) : null}

      {!canEdit ? (
        <Card>
          <p className="text-sm text-gray-600">
            Reservasi berstatus akhir tidak dapat diedit. Hubungi pengembang
            bila perlu koreksi administratif khusus.
          </p>
        </Card>
      ) : (
        <Card>
          <form action={updateReservationData} className="grid gap-5">
            <input
              type="hidden"
              name="reservationId"
              value={reservation.id}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                id="edit-name"
                label="Nama lengkap"
                name="name"
                autoComplete="name"
                maxLength={100}
                defaultValue={reservation.customer.name}
                required
              />
              <Input
                id="edit-whatsapp"
                label="Nomor WhatsApp"
                name="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="08xxxxxxxxxx"
                defaultValue={reservation.customer.whatsapp}
                required
              />
            </div>

            <Input
              id="edit-address"
              label="Alamat"
              name="address"
              autoComplete="street-address"
              maxLength={200}
              defaultValue={reservation.address}
              required
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Select
                id="edit-event-type"
                label="Jenis acara"
                name="eventType"
                defaultValue={reservation.eventType}
                required
              >
                {GALLERY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {GALLERY_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </Select>

              <Select
                id="edit-package"
                label="Paket"
                name="packageId"
                defaultValue={reservation.packageId}
                required
              >
                {packages.map((pkg) => (
                  <option
                    key={pkg.id}
                    value={pkg.id}
                    disabled={!pkg.active && pkg.id !== reservation.packageId}
                  >
                    {pkg.name}
                    {pkg.active ? "" : " (nonaktif)"}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              id="edit-event-date"
              label="Tanggal acara"
              name="eventDate"
              type="date"
              defaultValue={reservation.eventDate}
              required
            />
            <p className="-mt-2 text-xs text-gray-600">
              Hari ini {today} (WIB). Bila tanggal diubah, tanggal harus setelah
              hari ini dan tidak boleh bentrok dengan reservasi lain.
            </p>

            <Textarea
              id="edit-notes"
              label="Catatan (opsional)"
              name="notes"
              maxLength={1000}
              defaultValue={reservation.notes ?? ""}
            />

            <p className="rounded-xl border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-[inset_3px_3px_7px_rgba(159,145,126,0.2),inset_-3px_-3px_7px_rgba(255,255,255,0.65)]">
              Mengubah paket memperbarui harga snapshot. Mengubah paket atau
              tanggal pada reservasi yang sudah diterima akan mengganti kunci
              tanggal acara dan setup sesuai paket baru.
            </p>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line-light pt-5">
              <Link
                href={`/admin/reservasi/${reservation.id}`}
                className="neu-button neu-button-ghost px-4 py-2 text-sm font-medium"
              >
                Batal
              </Link>
              <Button type="submit">Simpan perubahan</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
