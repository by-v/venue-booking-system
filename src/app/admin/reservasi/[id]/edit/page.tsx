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
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/admin/reservasi/${reservation.id}`}
          className="text-sm font-medium text-gold-700 underline"
        >
          ← Kembali ke detail reservasi
        </Link>
        <h1 className="mt-4 font-heading text-2xl font-semibold text-ink">
          Edit data reservasi
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Perbaiki data yang diisi customer tanpa perlu membuat reservasi baru.
          Data customer dipakai bersama oleh seluruh reservasi dengan nomor
          WhatsApp yang sama.
        </p>
      </div>

      {bannerMessage ? (
        <p
          role="alert"
          className="rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700"
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

            <p className="rounded-md border border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Mengubah paket memperbarui harga snapshot. Mengubah paket atau
              tanggal pada reservasi yang sudah diterima akan mengganti kunci
              tanggal acara dan setup sesuai paket baru.
            </p>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line-light pt-5">
              <Link
                href={`/admin/reservasi/${reservation.id}`}
                className="text-sm font-medium text-gold-700 underline"
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
