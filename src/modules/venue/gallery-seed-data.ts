import type { GalleryCategory } from "./types";

/**
 * Seed galeri dari foto venue di `public/galeri` (TDR D7: gambar dari
 * `public/`). Data hanya dokumentasi venue; tanpa data customer atau demo.
 * Id stabil membuat seed idempoten.
 */
export interface GallerySeedItem {
  id: string;
  title: string;
  category: GalleryCategory;
  imagePath: string;
  caption: string | null;
  sortOrder: number;
  active: boolean;
}

export function buildGallerySeed(): GallerySeedItem[] {
  return [
    {
      id: "galeri-01",
      title: "Resepsi dengan pencahayaan panggung",
      category: "WALIMAH_RESEPSI",
      imagePath: "/galeri/venue-01.jpeg",
      caption:
        "Meja tamu dan panggung dengan tata cahaya pada salah satu resepsi.",
      sortOrder: 1,
      active: true,
    },
    {
      id: "galeri-02",
      title: "Prosesi menuju pelaminan",
      category: "PERNIKAHAN",
      imagePath: "/galeri/venue-02.jpeg",
      caption: "Lorong utama dengan rangkaian bunga menuju panggung.",
      sortOrder: 2,
      active: true,
    },
    {
      id: "galeri-03",
      title: "Area prasmanan dan hidangan",
      category: "LAINNYA",
      imagePath: "/galeri/venue-03.jpeg",
      caption: "Deretan meja hidangan dengan dekorasi bunga.",
      sortOrder: 3,
      active: true,
    },
    {
      id: "galeri-04",
      title: "Meja tamu dan dekorasi resepsi",
      category: "WALIMAH_RESEPSI",
      imagePath: "/galeri/venue-04.jpeg",
      caption: "Penataan meja bundar untuk tamu resepsi.",
      sortOrder: 4,
      active: true,
    },
    {
      id: "galeri-05",
      title: "Prasmanan dengan latar tirai",
      category: "WALIMAH_RESEPSI",
      imagePath: "/galeri/venue-05.jpeg",
      caption: "Area hidangan dengan latar tirai gelap dan dekorasi.",
      sortOrder: 5,
      active: true,
    },
    {
      id: "galeri-06",
      title: "Ruang utama dengan dekorasi langit-langit",
      category: "PERNIKAHAN",
      imagePath: "/galeri/venue-06.jpeg",
      caption:
        "Panggung dan lorong dengan rangkaian bunga di langit-langit.",
      sortOrder: 6,
      active: true,
    },
    {
      id: "galeri-07",
      title: "Lorong bunga menuju panggung",
      category: "PERNIKAHAN",
      imagePath: "/galeri/venue-07.jpeg",
      caption: "Lorong masuk dengan lengkungan bunga dan pencahayaan.",
      sortOrder: 7,
      active: true,
    },
    {
      id: "galeri-08",
      title: "Detail kristal dan pelaminan",
      category: "WALIMAH_RESEPSI",
      imagePath: "/galeri/venue-08.jpeg",
      caption: "Lampu kristal dan dekorasi pelaminan di ruang utama.",
      sortOrder: 8,
      active: true,
    },
    {
      id: "galeri-09",
      title: "Panggung putih dengan rangkaian bunga",
      category: "PERNIKAHAN",
      imagePath: "/galeri/venue-09.jpeg",
      caption: "Panggung dengan rangkaian bunga putih dan kursi pengantin.",
      sortOrder: 9,
      active: true,
    },
    {
      id: "galeri-10",
      title: "Suasana panggung dengan tata cahaya",
      category: "ACARA_MALAM",
      imagePath: "/galeri/venue-10.jpeg",
      caption: "Panggung dengan tata cahaya biru dan ornamen dekorasi.",
      sortOrder: 10,
      active: true,
    },
    {
      id: "galeri-11",
      title: "Area luar dengan gerbang bunga",
      category: "ACARA_OUTDOOR",
      imagePath: "/galeri/venue-11.jpeg",
      caption: "Gerbang bunga di area luar gedung.",
      sortOrder: 11,
      active: true,
    },
    {
      id: "galeri-12",
      title: "Tampak depan gedung pada siang hari",
      category: "LAINNYA",
      imagePath: "/galeri/venue-12.jpeg",
      caption: "Fasad gedung H.A. Djunaid Convention Center.",
      sortOrder: 12,
      active: true,
    },
    {
      id: "galeri-13",
      title: "Rangkaian momen resepsi",
      category: "WALIMAH_RESEPSI",
      imagePath: "/galeri/venue-13.jpeg",
      caption: "Kumpulan dokumentasi momen resepsi di gedung.",
      sortOrder: 13,
      active: true,
    },
    {
      id: "galeri-14",
      title: "Dua tata panggung pernikahan",
      category: "PERNIKAHAN",
      imagePath: "/galeri/venue-14.jpeg",
      caption: "Dua variasi tata panggung dengan ornamen klasik.",
      sortOrder: 14,
      active: true,
    },
    {
      id: "galeri-15",
      title: "Prosesi dengan dekorasi janur",
      category: "PERNIKAHAN",
      imagePath: "/galeri/venue-15.jpeg",
      caption: "Prosesi pengantin dengan dekorasi janur dan lampu kristal.",
      sortOrder: 15,
      active: true,
    },
    {
      id: "galeri-16",
      title: "Kedua mempelai di atas panggung",
      category: "PERNIKAHAN",
      imagePath: "/galeri/venue-16.jpeg",
      caption: "Momen di panggung utama setelah prosesi.",
      sortOrder: 16,
      active: true,
    },
    {
      id: "galeri-17",
      title: "Panggung malam dengan sorot lampu",
      category: "ACARA_MALAM",
      imagePath: "/galeri/venue-17.jpeg",
      caption: "Panggung dengan sorot lampu dan dekorasi malam.",
      sortOrder: 17,
      active: true,
    },
  ];
}
