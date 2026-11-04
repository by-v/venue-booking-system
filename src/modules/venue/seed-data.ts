/**
 * Seed data venue (SK-6). Fungsi murni tanpa database, dipakai oleh
 * `scripts/seed-venue.ts` dan diuji tanpa database.
 *
 * Data hanya dari handoff/venue; tanpa data demo, customer, atau reservasi
 * (T-17). "Fasilitas SDA" disimpan apa adanya (T-09).
 */

export interface VenueSeed {
  venue: {
    id: number;
    name: string;
    address: string;
    capacityMin: number;
    capacityMax: number;
    description: string;
    adminWhatsapp: string | null;
    contact: string | null;
    email: string | null;
    instagramUrl: string | null;
    mapUrl: string | null;
  };
  packages: Array<{
    id: string;
    name: string;
    priceRupiah: number;
    durationHours: number;
    sessionCount: number;
    setupDaysBefore: number;
    active: boolean;
    sortOrder: number;
  }>;
  facilities: Array<{
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    sortOrder: number;
  }>;
  packageFacilities: Array<{ packageId: string; facilityId: string }>;
}

const VENUE_ADDRESS =
  "Jl. Pelita II, Buaran, Kawasan Pondok Pesantren Modern Al-Qur'an, Kec. Pekalongan Selatan, Kota Pekalongan, Jawa Tengah 51171";

const BASE_FACILITY_IDS = [
  "ac",
  "sound-system",
  "kursi-futura-250",
  "panggung-hiburan-4x6",
  "ruang-rias-transit",
  "pembersihan",
  "keamanan",
  "fasilitas-sda",
] as const;

const OUTDOOR_FACILITY_ID = "area-parkir-timur";

const ALL_PACKAGE_IDS = [
  "full-service",
  "full-service-acara-malam",
  "full-service-outdoor",
  "full-service-walimah-resepsi",
] as const;

export function buildVenueSeed(): VenueSeed {
  const packages: VenueSeed["packages"] = [
    {
      id: "full-service",
      name: "Full Service",
      priceRupiah: 20_000_000,
      durationHours: 5,
      sessionCount: 1,
      setupDaysBefore: 0,
      active: true,
      sortOrder: 1,
    },
    {
      id: "full-service-acara-malam",
      name: "Full Service Acara Malam",
      priceRupiah: 22_000_000,
      durationHours: 5,
      sessionCount: 1,
      setupDaysBefore: 0,
      active: true,
      sortOrder: 2,
    },
    {
      id: "full-service-outdoor",
      name: "Full Service + Outdoor",
      priceRupiah: 25_000_000,
      durationHours: 5,
      sessionCount: 1,
      setupDaysBefore: 2,
      active: true,
      sortOrder: 3,
    },
    {
      id: "full-service-walimah-resepsi",
      name: "Full Service + Walimah & Resepsi",
      priceRupiah: 35_000_000,
      durationHours: 5,
      sessionCount: 2,
      setupDaysBefore: 3,
      active: true,
      sortOrder: 4,
    },
  ];

  const facilities: VenueSeed["facilities"] = [
    { id: "ac", name: "AC", description: null, active: true, sortOrder: 1 },
    {
      id: "sound-system",
      name: "Sound system",
      description: null,
      active: true,
      sortOrder: 2,
    },
    {
      id: "kursi-futura-250",
      name: "250 kursi Futura",
      description: null,
      active: true,
      sortOrder: 3,
    },
    {
      id: "panggung-hiburan-4x6",
      name: "Panggung hiburan 4x6 m",
      description: null,
      active: true,
      sortOrder: 4,
    },
    {
      id: "ruang-rias-transit",
      name: "Ruang rias/transit",
      description: null,
      active: true,
      sortOrder: 5,
    },
    {
      id: "pembersihan",
      name: "Pembersihan sebelum dan sesudah",
      description: null,
      active: true,
      sortOrder: 6,
    },
    {
      id: "keamanan",
      name: "Keamanan",
      description: null,
      active: true,
      sortOrder: 7,
    },
    {
      id: "fasilitas-sda",
      name: "Fasilitas SDA",
      description: null,
      active: true,
      sortOrder: 8,
    },
    {
      id: "area-parkir-timur",
      name: "Area parkir sisi timur",
      description: null,
      active: true,
      sortOrder: 9,
    },
  ];

  const packageFacilities: VenueSeed["packageFacilities"] = [];
  for (const packageId of ALL_PACKAGE_IDS) {
    for (const facilityId of BASE_FACILITY_IDS) {
      packageFacilities.push({ packageId, facilityId });
    }
  }
  packageFacilities.push({
    packageId: "full-service-outdoor",
    facilityId: OUTDOOR_FACILITY_ID,
  });

  return {
    venue: {
      id: 1,
      name: "H.A. Djunaid Convention Center",
      address: VENUE_ADDRESS,
      capacityMin: 200,
      capacityMax: 2000,
      description:
        "H.A. Djunaid Convention Center adalah gedung pertemuan di Pekalongan Selatan dengan kapasitas 200 hingga 2.000 tamu. Tersedia empat paket layanan untuk pernikahan, walimah dan resepsi, seminar, konser, acara malam, serta acara outdoor.",
      adminWhatsapp: null,
      contact: null,
      email: "wawangcc@gmail.com",
      instagramUrl: "https://www.instagram.com/h.a.djunaid",
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        VENUE_ADDRESS,
      )}`,
    },
    packages,
    facilities,
    packageFacilities,
  };
}
