// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReservationForm } from "@/app/reservasi/reservation-form";
import type { PackageSummary } from "@/modules/venue/types";

const PACKAGES: PackageSummary[] = [
  {
    id: "full-service",
    name: "Full Service",
    priceRupiah: 20_000_000,
    durationHours: 5,
    sessionCount: 1,
  },
  {
    id: "full-service-outdoor",
    name: "Full Service + Outdoor",
    priceRupiah: 25_000_000,
    durationHours: 5,
    sessionCount: 2,
  },
];

const AVAILABILITY_DAYS = [
  { date: "2026-10-24", status: "TERSEDIA" as const },
  { date: "2026-10-25", status: "TERSEDIA" as const },
  { date: "2026-10-26", status: "TERISI" as const },
];

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/ketersediaan")) {
        return new Response(JSON.stringify({ days: AVAILABILITY_DAYS }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url === "/api/reservasi" && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`Permintaan tidak terduga: ${url}`);
    },
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

function renderForm(adminWhatsapp: string | null = "6281234567890") {
  render(
    <ReservationForm
      packages={PACKAGES}
      today="2026-10-21"
      adminWhatsapp={adminWhatsapp}
    />,
  );
}

async function openDetailsStep(): Promise<void> {
  renderForm();
  fireEvent.click(
    screen.getByRole("button", { name: "Pilih paket Full Service" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: /2026-10-25/ }),
  );
}

function fillRequiredFields(): void {
  fireEvent.change(screen.getByLabelText("Nama lengkap"), {
    target: { value: "Siti Aminah" },
  });
  fireEvent.change(screen.getByLabelText("Nomor WhatsApp"), {
    target: { value: "0812-3456-7890" },
  });
  fireEvent.change(screen.getByLabelText("Alamat"), {
    target: { value: "Jl. Pelita II No. 1, Pekalongan" },
  });
  fireEvent.change(screen.getByLabelText("Jenis acara"), {
    target: { value: "PERNIKAHAN" },
  });
}

function reservationPostCalls() {
  return fetchMock.mock.calls.filter(
    ([url, init]) =>
      url === "/api/reservasi" &&
      (init as RequestInit | undefined)?.method === "POST",
  );
}

describe("form pengajuan reservasi publik", () => {
  it("menampilkan paket aktif dari data form", () => {
    renderForm();

    expect(
      screen.getByRole("button", { name: "Pilih paket Full Service" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Pilih paket Full Service + Outdoor",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Rp20.000.000")).toBeTruthy();
  });

  it("memilih paket lalu tanggal memanggil API ketersediaan", async () => {
    renderForm();

    fireEvent.click(
      screen.getByRole("button", { name: "Pilih paket Full Service" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/ketersediaan?packageId=full-service&bulan=2026-10",
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /2026-10-25/ }),
    );

    expect(screen.getByText("Detail acara")).toBeTruthy();
    expect(screen.getByText("Rp5.000.000")).toBeTruthy();
  });

  it("memvalidasi field wajib sebelum mengirim", async () => {
    await openDetailsStep();

    fireEvent.click(screen.getByRole("button", { name: "Kirim Pengajuan" }));

    expect(
      await screen.findByText("Nama lengkap minimal 2 karakter"),
    ).toBeTruthy();
    expect(
      screen.getByText("Nomor WhatsApp wajib diisi"),
    ).toBeTruthy();
    expect(screen.getByText("Alamat minimal 5 karakter")).toBeTruthy();
    expect(
      screen.getByText("Jenis acara harus salah satu pilihan"),
    ).toBeTruthy();
    expect(reservationPostCalls()).toHaveLength(0);
  });

  it("mengirim data valid dan menampilkan sukses tanpa kode dengan tombol WhatsApp", async () => {
    await openDetailsStep();
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Catatan (opsional)"), {
      target: { value: "Resepsi keluarga" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Kirim Pengajuan" }));

    expect(await screen.findByText(/Terima kasih, Siti Aminah/)).toBeTruthy();
    expect(
      screen.getByText(/belum dikonfirmasi dan belum mengunci tanggal/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Lanjutkan ke WhatsApp untuk mengirim ringkasan/),
    ).toBeTruthy();
    expect(screen.queryByText(/kode pengajuan/i)).toBeNull();
    expect(screen.queryByText(/nomor booking/i)).toBeNull();

    const posts = reservationPostCalls();
    expect(posts).toHaveLength(1);
    const requestBody = JSON.parse(
      (posts[0]?.[1] as RequestInit).body as string,
    );
    expect(requestBody).toMatchObject({
      name: "Siti Aminah",
      whatsapp: "6281234567890",
      address: "Jl. Pelita II No. 1, Pekalongan",
      eventType: "PERNIKAHAN",
      packageId: "full-service",
      eventDate: "2026-10-25",
      notes: "Resepsi keluarga",
    });

    const link = screen.getByRole("link", {
      name: /Pesan Sekarang/,
    });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("https://wa.me/6281234567890?text=");
    const decoded = decodeURIComponent(href);
    expect(decoded).toContain("Nama lengkap: Siti Aminah");
    expect(decoded).toContain("Nomor WhatsApp: 0812-3456-7890");
    expect(decoded).toContain("Alamat: Jl. Pelita II No. 1, Pekalongan");
    expect(decoded).toContain("Jenis acara: Pernikahan");
    expect(decoded).toContain("Paket: Full Service");
    expect(decoded).toContain("Tanggal acara: 25 Oktober 2026");
    expect(decoded).toContain("Catatan: Resepsi keluarga");
    expect(decoded).toContain("\n");
  });

  it("tidak menampilkan tombol WhatsApp saat nomor admin kosong", async () => {
    renderForm(null);
    fireEvent.click(
      screen.getByRole("button", { name: "Pilih paket Full Service" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /2026-10-25/ }),
    );
    fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: "Kirim Pengajuan" }));

    expect(await screen.findByText(/Terima kasih, Siti Aminah/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /WhatsApp/i })).toBeNull();
    expect(document.querySelector('a[href*="wa.me"]')).toBeNull();
  });
});
