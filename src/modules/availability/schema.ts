import { z } from "zod";

/**
 * Validasi parameter bulan untuk halaman kalender admin (`?bulan=YYYY-MM`).
 * Nilai tidak valid diganti bulan berjalan, bukan menghasilkan galat.
 */

export const monthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Bulan harus berformat YYYY-MM");

export function resolveMonth(value: string | undefined, today: string): string {
  const parsed = monthSchema.safeParse(value);
  return parsed.success ? parsed.data : today.slice(0, 7);
}
