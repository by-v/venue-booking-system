import { GALLERY_CATEGORY_LABELS, type GalleryCategory } from "./types";

/**
 * Kontak WhatsApp (SK-2, T-12). Fungsi murni, tanpa database dan tanpa UI.
 */

/** Templat pesan tetap (T-12). Disetujui pemilik proyek 19 Okt 2026. */
export const WHATSAPP_MESSAGE_TEMPLATE =
  "Halo, saya ingin bertanya tentang reservasi di H.A. Djunaid Convention Center.";

export interface ReservationWhatsAppData {
  name: string;
  whatsapp: string;
  address: string;
  eventType: string;
  packageName: string;
  eventDate: string;
  notes?: string | null;
}

function formatEventDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * Menyusun pesan WhatsApp dari kolom formulir reservasi. Setiap kolom ditulis
 * pada barisnya sendiri agar mudah dibaca admin, bukan sebagai satu paragraf.
 */
export function buildReservationWhatsAppMessage(
  data: ReservationWhatsAppData,
): string {
  const eventTypeLabel =
    GALLERY_CATEGORY_LABELS[data.eventType as GalleryCategory] ??
    data.eventType;
  const notes = data.notes?.trim();

  return [
    "Halo Admin H.A. Djunaid Convention Center,",
    "",
    "Saya ingin mengajukan reservasi dengan data berikut:",
    `Nama lengkap: ${data.name.trim()}`,
    `Nomor WhatsApp: ${data.whatsapp.trim()}`,
    `Alamat: ${data.address.trim()}`,
    `Jenis acara: ${eventTypeLabel}`,
    `Paket: ${data.packageName}`,
    `Tanggal acara: ${formatEventDate(data.eventDate)}`,
    `Catatan: ${notes && notes.length > 0 ? notes : "-"}`,
    "",
    "Mohon dibantu untuk proses selanjutnya. Terima kasih.",
  ].join("\n");
}

/**
 * Membangun tautan `wa.me` dengan pesan ter-encode.
 * Mengembalikan `null` bila nomor kosong sehingga tombol tidak membuka
 * tautan dengan nomor kosong (ui-spec penyesuaian 3).
 */
export function buildWhatsAppLink(
  number: string | null | undefined,
  message: string = WHATSAPP_MESSAGE_TEMPLATE,
): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length === 0) {
    return null;
  }

  // Nomor lokal 08... dinormalisasi ke format internasional 62...
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
