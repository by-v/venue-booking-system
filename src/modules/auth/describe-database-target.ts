/**
 * Membangun deskripsi aman dari connection string PostgreSQL untuk ditampilkan
 * ke terminal (skrip seed, grup 11).
 *
 * Fungsi murni: mengembalikan host (dengan port bila ada) dan nama database
 * SAJA. Username dan password TIDAK PERNAH disertakan di keluaran. URL yang
 * tidak valid menghasilkan pesan generik tanpa menyalin isi URL (URL dapat
 * memuat kredensial).
 */
export function describeDatabaseTarget(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "URL database tidak valid";
  }

  const host = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
  const database = parsed.pathname.replace(/^\//, "");

  if (!host || !database) {
    return "URL database tidak valid";
  }

  return `${host} / ${database}`;
}
