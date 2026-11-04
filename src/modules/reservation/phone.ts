/**
 * Normalisasi nomor WhatsApp (design RS-2). Fungsi murni tanpa database.
 * Nomor disimpan sebagai digit internasional `62...` (BR-25).
 */

const MIN_DIGITS = 10;
const MAX_DIGITS = 15;

export function normalizeWhatsApp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) {
    return null;
  }

  let normalized = digits;
  if (normalized.startsWith("0")) {
    normalized = `62${normalized.slice(1)}`;
  } else if (normalized.startsWith("8")) {
    normalized = `62${normalized}`;
  }

  if (!normalized.startsWith("62")) {
    return null;
  }

  if (normalized.length < MIN_DIGITS || normalized.length > MAX_DIGITS) {
    return null;
  }

  return normalized;
}
