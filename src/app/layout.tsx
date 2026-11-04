import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

// Body dan antarmuka memakai Inter; judul editorial halaman publik memakai
// Playfair Display. Keduanya dimuat lewat next/font (tanpa tautan eksternal).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

// Catatan: nilai identitas venue masih ditulis tetap di sini karena modul
// domain venue baru dibuat pada grup 3. Nilainya berasal dari data venue nyata.
export const metadata: Metadata = {
  title: "H.A. Djunaid Convention Center",
  description:
    "Gedung pertemuan di Pekalongan Selatan dengan kapasitas 200 sampai 2.000 tamu untuk pernikahan, walimah dan resepsi, seminar, konser, acara malam, serta acara outdoor.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
