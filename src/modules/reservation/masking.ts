/**
 * Penyamaran data customer untuk halaman publik (BR-32, design D2). Fungsi
 * murni supaya dapat diuji tanpa database.
 */

export function maskCustomerName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "***";
  }

  return words.map((word) => `${word.charAt(0)}***`).join(" ");
}
