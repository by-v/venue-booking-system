// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/modules/venue/queries", () => ({
  getPublicVenue: vi.fn(),
  listActivePackages: vi.fn(),
  listFacilitiesWithPackages: vi.fn(),
  listActiveGallery: vi.fn(),
  listAllPackages: vi.fn(),
  listAllFacilitiesWithPackages: vi.fn(),
  listAllGallery: vi.fn(),
}));

import FasilitasPage from "@/app/fasilitas/page";
import KontakPage from "@/app/kontak/page";
import TentangPage from "@/app/tentang/page";
import HomePage from "@/app/page";
import {
  getPublicVenue,
  listActivePackages,
  listFacilitiesWithPackages,
} from "@/modules/venue/queries";
import type {
  FacilityWithPackages,
  Package,
  Venue,
} from "@/modules/venue/types";
import { WHATSAPP_MESSAGE_TEMPLATE } from "@/modules/venue/whatsapp";

const venue: Venue = {
  id: 1,
  name: "H.A. Djunaid Convention Center",
  address: "Jl. Pelita II, Buaran, Pekalongan Selatan",
  capacityMin: 200,
  capacityMax: 2000,
  description: "Gedung pertemuan di Pekalongan Selatan.",
  adminWhatsapp: "6281234567890",
  contact: null,
  email: "wawangcc@gmail.com",
  instagramUrl: "https://www.instagram.com/h.a.djunaid",
  mapUrl: "https://maps.example.test/venue",
};

const packages: Package[] = [
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
    id: "full-service-outdoor",
    name: "Full Service + Outdoor",
    priceRupiah: 25_000_000,
    durationHours: 5,
    sessionCount: 2,
    setupDaysBefore: 2,
    active: true,
    sortOrder: 2,
  },
];

const facilities: FacilityWithPackages[] = [
  {
    id: "ac",
    name: "AC",
    description: null,
    active: true,
    sortOrder: 1,
    packageIds: ["full-service"],
  },
  {
    id: "fasilitas-sda",
    name: "Fasilitas SDA",
    description: null,
    active: true,
    sortOrder: 2,
    packageIds: [],
  },
];

beforeEach(() => {
  vi.mocked(getPublicVenue).mockResolvedValue(venue);
  vi.mocked(listActivePackages).mockResolvedValue(packages);
  vi.mocked(listFacilitiesWithPackages).mockResolvedValue(facilities);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("halaman publik", () => {
  it("Beranda menampilkan data venue, kapasitas, dan paket tanpa statistik fiktif", async () => {
    render(await HomePage());

    expect(
      screen.getAllByText(/H\.A\. Djunaid Convention Center/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/200–2\.000\s*tamu/)).toBeTruthy();
    expect(screen.getAllByText(/Jl\. Pelita II/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Rp20\.000\.000/)).toBeTruthy();

    for (const fake of ["1000+", "50+", "99%", "24/7"]) {
      expect(screen.queryByText(fake)).toBeNull();
    }
  });

  it("tombol Pesan Sekarang mengarah ke halaman reservasi, bukan langsung ke WhatsApp", async () => {
    render(await HomePage());

    const links = screen.getAllByRole("link", { name: /Pesan Sekarang/ });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute("href")).toBe("/reservasi");
    }
  });

  it("Tentang Kami menampilkan deskripsi, alamat, dan tautan peta", async () => {
    render(await TentangPage());

    expect(screen.getByText("Gedung pertemuan di Pekalongan Selatan.")).toBeTruthy();
    expect(screen.getAllByText(/Jl\. Pelita II/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Lihat di peta" }).getAttribute("href"),
    ).toBe("https://maps.example.test/venue");
  });

  it("Fasilitas menampilkan 'Fasilitas SDA' apa adanya tanpa setup_days_before", async () => {
    render(await FasilitasPage());

    expect(screen.getByText("Fasilitas SDA")).toBeTruthy();
    expect(screen.queryByText(/setup/i)).toBeNull();
    expect(screen.queryByText(/H-2|H-3/)).toBeNull();
    // Relasi paket-fasilitas tidak ditampilkan di layout baru (icon grid minimalis)
  });

  it("Kontak menampilkan tombol WhatsApp dengan pesan templat dan tanpa formulir", async () => {
    render(await KontakPage());

    const link = screen.getByRole("link", { name: /WhatsApp/i });
    expect(link.getAttribute("href")).toBe(
      `https://wa.me/6281234567890?text=${encodeURIComponent(
        WHATSAPP_MESSAGE_TEMPLATE,
      )}`,
    );
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("Kontak tidak membuka wa.me saat nomor WhatsApp kosong", async () => {
    vi.mocked(getPublicVenue).mockResolvedValueOnce({
      ...venue,
      adminWhatsapp: null,
    });

    render(await KontakPage());

    expect(screen.queryByRole("link", { name: /WhatsApp/i })).toBeNull();
    expect(screen.getByText(/belum tersedia/i)).toBeTruthy();
  });

  it("Beranda menampilkan keadaan kosong tanpa galat saat venue belum diisi", async () => {
    vi.mocked(getPublicVenue).mockResolvedValueOnce(null);

    render(await HomePage());

    expect(screen.getByText("Data venue belum tersedia")).toBeTruthy();
  });
});
