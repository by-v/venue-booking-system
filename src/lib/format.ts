/**
 * Pemformatan angka dan mata uang (id-ID) untuk halaman publik.
 * Uang disimpan sebagai integer rupiah (konvensi register).
 */

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatRupiah(value: number): string {
  return `Rp${formatNumber(value)}`;
}
