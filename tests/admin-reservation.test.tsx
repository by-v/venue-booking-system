// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.hoisted(() =>
  vi.fn(async () => ({
    user: { id: "admin-1", email: "admin@example.test" },
  })),
);
const listReservations = vi.hoisted(() => vi.fn());
const getReservationDetail = vi.hoisted(() => vi.fn());
const getReservationConfirmationContext = vi.hoisted(() => vi.fn());
const listActivePackageSummaries = vi.hoisted(() => vi.fn());
const addFollowUpNoteMutation = vi.hoisted(() =>
  vi.fn(async () => undefined),
);
const addReservationItemMutation = vi.hoisted(() =>
  vi.fn(async () => undefined),
);
const markDownPaymentMutation = vi.hoisted(() => vi.fn(async () => undefined));
const markPaidOffMutation = vi.hoisted(() => vi.fn(async () => undefined));
const suspendReservationMutation = vi.hoisted(() =>
  vi.fn(async () => undefined),
);
const cancelReservationMutation = vi.hoisted(() =>
  vi.fn(async () => undefined),
);
const confirmReservationMutation = vi.hoisted(() =>
  vi.fn(async () => ({ bookingNumber: "HADCC-2027-0001" })),
);
const cancelAcceptedReservationMutation = vi.hoisted(() =>
  vi.fn(async () => undefined),
);
const rescheduleReservationMutation = vi.hoisted(() =>
  vi.fn(async () => undefined),
);
const revalidatePath = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
const redirect = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
);

vi.mock("@/modules/auth", () => ({ requireAdminSession }));
vi.mock("@/modules/reservation/queries", () => ({
  listReservations,
  getReservationDetail,
  getReservationConfirmationContext,
}));
vi.mock("@/modules/venue/queries", () => ({ listActivePackageSummaries }));
vi.mock("@/modules/reservation/mutations", () => ({
  addFollowUpNote: addFollowUpNoteMutation,
  addReservationItem: addReservationItemMutation,
  markDownPayment: markDownPaymentMutation,
  markPaidOff: markPaidOffMutation,
  suspendReservation: suspendReservationMutation,
  cancelReservation: cancelReservationMutation,
  confirmReservation: confirmReservationMutation,
  cancelAcceptedReservation: cancelAcceptedReservationMutation,
  rescheduleReservation: rescheduleReservationMutation,
  saveSetupNote: vi.fn(async () => undefined),
  updatePaymentDueDate: vi.fn(async () => undefined),
  updateReservationData: vi.fn(async () => undefined),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ notFound, redirect }));
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

import ReservasiAdminPage from "@/app/admin/reservasi/page";
import ReservasiBaruPage from "@/app/admin/reservasi/baru/page";
import ReservasiDetailPage from "@/app/admin/reservasi/[id]/page";
import { addFollowUpNote, rescheduleReservation } from "@/app/admin/reservasi/actions";
import { addDays, todayInJakarta } from "@/modules/availability/dates";
import type {
  ReservationConfirmationContext,
  ReservationDetail,
  ReservationListItem,
  ReservationStatus,
} from "@/modules/reservation/types";

const listItem: ReservationListItem = {
  id: "res-1",
  customerName: "Siti Aminah",
  customerWhatsapp: "6281234567890",
  eventDate: "2027-03-20",
  eventType: "PERNIKAHAN",
  packageName: "Full Service",
  packagePriceRupiah: 20_000_000,
  totalRupiah: 20_000_000,
  verifiedPaymentRupiah: 0,
  paymentStatus: "BELUM_DP",
  status: "PENDING",
  source: "FORM_PUBLIK",
  bookingNumber: null,
  createdAt: new Date("2026-10-21T03:00:00Z"),
};

const detail: ReservationDetail = {
  id: "res-1",
  customer: {
    id: "cust-1",
    name: "Siti Aminah",
    whatsapp: "6281234567890",
  },
  packageId: "full-service",
  packageName: "Full Service",
  packagePriceRupiah: 20_000_000,
  packageDurationHours: 5,
  packageSessionCount: 1,
  eventDate: "2027-03-20",
  eventType: "PERNIKAHAN",
  address: "Jl. Pelita II No. 1, Pekalongan",
  notes: "Mohon konfirmasi siang hari.",
  status: "PENDING",
  paymentDueDate: "2027-03-06",
  paymentDueDateOverride: null,
  paymentOverdue: false,
  source: "FORM_PUBLIK",
  bookingNumber: null,
  dpForfeited: false,
  perluPemeriksaanAdmin: true,
  rescheduleCount: 0,
  setupNote: null,
  createdAt: new Date("2026-10-21T03:00:00Z"),
  items: [
    {
      id: "item-1",
      reservationId: "res-1",
      description: "Sewa tenda tambahan",
      amountRupiah: 1_500_000,
      createdAt: new Date("2026-10-21T04:00:00Z"),
    },
  ],
  payments: [
    {
      id: "pay-1",
      reservationId: "res-1",
      amountRupiah: 2_000_000,
      verificationStatus: "TERVERIFIKASI",
      recordedByUserId: "admin-1",
      createdAt: new Date("2026-10-21T05:00:00Z"),
      updatedAt: new Date("2026-10-21T05:00:00Z"),
    },
    {
      id: "pay-2",
      reservationId: "res-1",
      amountRupiah: 6_000_000,
      verificationStatus: "TERVERIFIKASI",
      recordedByUserId: "admin-1",
      createdAt: new Date("2026-10-21T06:00:00Z"),
      updatedAt: new Date("2026-10-21T06:00:00Z"),
    },
  ],
  financials: {
    packagePriceRupiah: 20_000_000,
    itemTotalRupiah: 1_500_000,
    totalRupiah: 21_500_000,
    minimumDpRupiah: 5_375_000,
    verifiedPaymentRupiah: 6_000_000,
    remainingRupiah: 15_500_000,
    paymentStatus: "DP",
  },
  activities: [
    {
      id: "act-1",
      type: "SUBMISSION",
      note: null,
      actorType: "CUSTOMER",
      isSubstantive: true,
      createdAt: new Date("2026-10-21T03:00:00Z"),
    },
    {
      id: "act-2",
      type: "FOLLOW_UP_NOTE",
      note: "Sudah dihubungi via WhatsApp.",
      actorType: "ADMIN",
      isSubstantive: true,
      createdAt: new Date("2026-10-21T04:00:00Z"),
    },
    {
      id: "act-3",
      type: "ITEM_ADDED",
      note: 'Item biaya "Sewa tenda tambahan" ditambahkan.',
      actorType: "ADMIN",
      isSubstantive: true,
      createdAt: new Date("2026-10-21T04:30:00Z"),
    },
    {
      id: "act-4",
      type: "PAYMENT_RECORDED",
      note: "Pembayaran dicatat.",
      actorType: "ADMIN",
      isSubstantive: true,
      createdAt: new Date("2026-10-21T05:00:00Z"),
    },
    {
      id: "act-5",
      type: "PAYMENT_STATUS_CHANGED",
      note: "Pembayaran diverifikasi.",
      actorType: "ADMIN",
      isSubstantive: true,
      createdAt: new Date("2026-10-21T06:00:00Z"),
    },
  ],
  statusHistory: [
    {
      id: "hist-1",
      fromStatus: null,
      toStatus: "PENDING",
      reason: "Pengajuan form publik",
      reasonCode: null,
      actorType: "CUSTOMER",
      createdAt: new Date("2026-10-21T03:00:00Z"),
    },
  ],
};

const confirmationContext: ReservationConfirmationContext = {
  lockDates: [{ date: "2027-03-20", kind: "EVENT" }],
  hasDateConflict: false,
  conflicts: [],
};

function detailWithStatus(status: ReservationStatus): ReservationDetail {
  return { ...detail, status };
}

beforeEach(() => {
  listReservations.mockResolvedValue([listItem]);
  getReservationDetail.mockResolvedValue(detail);
  getReservationConfirmationContext.mockResolvedValue(confirmationContext);
  listActivePackageSummaries.mockResolvedValue([
    {
      id: "full-service",
      name: "Full Service",
      priceRupiah: 20_000_000,
      durationHours: 5,
      sessionCount: 1,
    },
  ]);
  addFollowUpNoteMutation.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("halaman admin reservasi", () => {
  it("menampilkan daftar default dengan total dan status pembayaran", async () => {
    render(
      await ReservasiAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(listReservations).toHaveBeenCalledWith({
      filter: "proses",
      search: "",
    });
    expect(
      screen.getByRole("heading", { name: "Reservasi diproses" }),
    ).toBeTruthy();
    expect(screen.getByText("Siti Aminah")).toBeTruthy();
    expect(screen.getByText("6281234567890")).toBeTruthy();
    expect(screen.getByText("20 Maret 2027")).toBeTruthy();
    expect(screen.getByText("Full Service")).toBeTruthy();
    expect(screen.getByText("Rp20.000.000")).toBeTruthy();
    expect(screen.getByText("Belum DP")).toBeTruthy();
    expect(screen.getAllByText("Menunggu").length).toBeGreaterThan(0);

    const detailLink = screen.getByRole("link", {
      name: "Detail reservasi Siti Aminah",
    });
    expect(detailLink.getAttribute("href")).toBe("/admin/reservasi/res-1");
  });

  it("menampilkan nomor booking dan placeholder pencarian yang diperbarui", async () => {
    listReservations.mockResolvedValue([
      {
        ...listItem,
        bookingNumber: "HADCC-2027-0001",
      },
    ]);

    render(
      await ReservasiAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("HADCC-2027-0001")).toBeTruthy();
    expect(
      screen.getByPlaceholderText(
        "Nama, nomor WhatsApp, atau nomor booking",
      ),
    ).toBeTruthy();
  });

  it("meneruskan filter status dan pencarian ke query", async () => {
    listReservations.mockResolvedValue([
      {
        ...listItem,
        id: "res-2",
        customerName: "Budi Santoso",
        status: "DITERIMA",
        verifiedPaymentRupiah: 20_000_000,
        paymentStatus: "LUNAS",
      },
    ]);

    render(
      await ReservasiAdminPage({
        searchParams: Promise.resolve({ q: "budi", filter: "diterima" }),
      }),
    );

    expect(listReservations).toHaveBeenCalledWith({
      filter: "diterima",
      search: "budi",
    });
    expect(
      screen.getByRole("heading", { name: "Reservasi diterima" }),
    ).toBeTruthy();
    expect(screen.getByText("Budi Santoso")).toBeTruthy();
    expect(screen.getByText("Lunas")).toBeTruthy();
    expect(screen.getAllByText("Diterima").length).toBeGreaterThan(0);
  });

  it("menampilkan keadaan kosong sesuai filter", async () => {
    listReservations.mockResolvedValue([]);

    render(
      await ReservasiAdminPage({
        searchParams: Promise.resolve({ filter: "dibatalkan" }),
      }),
    );

    expect(listReservations).toHaveBeenCalledWith({
      filter: "dibatalkan",
      search: "",
    });
    expect(
      screen.getByText("Belum ada reservasi dibatalkan"),
    ).toBeTruthy();
    expect(screen.getByText("0 reservasi")).toBeTruthy();
  });

  it("menampilkan ringkasan, item, pembayaran, form, dan label aktivitas", async () => {
    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
      }),
    );

    expect(getReservationDetail).toHaveBeenCalledWith("res-1");
    expect(
      screen.getByRole("heading", { name: "Siti Aminah" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Ringkasan keuangan" }),
    ).toBeTruthy();
    expect(screen.getByText("Rp21.500.000")).toBeTruthy();
    expect(
      screen.getAllByText("Rp5.375.000").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Rp6.000.000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rp2.000.000").length).toBeGreaterThan(0);
    expect(screen.getByText("Rp15.500.000")).toBeTruthy();
    expect(screen.getByText("DP minimum 25%")).toBeTruthy();
    expect(screen.getByText("Perlu pemeriksaan admin")).toBeTruthy();
    expect(screen.getAllByText("DP").length).toBeGreaterThan(0);

    expect(screen.getByText("Jl. Pelita II No. 1, Pekalongan")).toBeTruthy();
    expect(screen.getByText("Mohon konfirmasi siang hari.")).toBeTruthy();
    expect(screen.getByText("Pengajuan form publik")).toBeTruthy();
    expect(screen.getByText("Form publik")).toBeTruthy();

    expect(screen.getByText("Sewa tenda tambahan")).toBeTruthy();
    expect(screen.getByLabelText("Deskripsi item")).toBeTruthy();
    expect(screen.getByLabelText("Nominal item (Rp)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tambah item" })).toBeTruthy();

    expect(screen.getByText("Catatan pembayaran")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lunas" })).toBeTruthy();
    expect(screen.queryByLabelText("Nominal pembayaran (Rp)")).toBeNull();
    expect(screen.queryByRole("button", { name: "Verifikasi" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Tandai tidak valid" }),
    ).toBeNull();

    expect(screen.getByLabelText("Catatan")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Simpan catatan" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Tangguhkan reservasi" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Batalkan reservasi" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Kode alasan pembatalan")).toBeTruthy();
    expect(screen.getByLabelText("Alasan penangguhan")).toBeTruthy();
    expect(screen.getByLabelText("Alasan pembatalan")).toBeTruthy();

    expect(screen.getByText("Pengajuan dikirim")).toBeTruthy();
    expect(
      screen.getAllByText("Catatan tindak lanjut").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Item biaya ditambahkan")).toBeTruthy();
    expect(screen.getByText("Pembayaran dicatat")).toBeTruthy();
    expect(screen.getByText("Status pembayaran berubah")).toBeTruthy();
  });

  it("menampilkan kartu konfirmasi untuk PENDING dengan tanggal target", async () => {
    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(getReservationConfirmationContext).toHaveBeenCalledWith("res-1");
    expect(
      screen.getByRole("heading", { name: "Konfirmasi reservasi" }),
    ).toBeTruthy();
    expect(screen.getByText("Tanggal setup")).toBeTruthy();
    expect(screen.queryByText("Daftar bentrok")).toBeNull();
    const button = screen.getByRole("button", {
      name: "Konfirmasi reservasi",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("menonaktifkan tombol konfirmasi saat DP kurang", async () => {
    getReservationDetail.mockResolvedValue({
      ...detail,
      financials: {
        ...detail.financials,
        verifiedPaymentRupiah: 2_000_000,
      },
    });

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByText(/DP terverifikasi belum memenuhi/),
    ).toBeTruthy();
    const button = screen.getByRole("button", {
      name: "Konfirmasi reservasi",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("menampilkan daftar bentrok dan menonaktifkan tombol konfirmasi", async () => {
    getReservationConfirmationContext.mockResolvedValue({
      lockDates: [{ date: "2027-03-20", kind: "EVENT" }],
      hasDateConflict: true,
      conflicts: [
        {
          id: "res-2",
          customerName: "Budi Santoso",
          customerWhatsapp: "6281311112222",
          eventDate: "2027-03-20",
          status: "DITERIMA",
          verifiedPaymentRupiah: 8_000_000,
          occupiedDates: [{ date: "2027-03-20", kind: "EVENT" }],
        },
      ],
    });

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("Daftar bentrok")).toBeTruthy();
    expect(screen.getByText(/Budi Santoso/)).toBeTruthy();
    expect(screen.getByText(/Sudah dibayar Rp8\.000\.000/)).toBeTruthy();
    expect(screen.getByText(/Menempati: 20 Maret 2027/)).toBeTruthy();
    expect(
      screen.getByText("Tanggal acara atau setup sudah terkunci."),
    ).toBeTruthy();
    const button = screen.getByRole("button", {
      name: "Konfirmasi reservasi",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("menampilkan pesan kunci manual saat tanggal bentrok tanpa baris reservasi", async () => {
    getReservationConfirmationContext.mockResolvedValue({
      lockDates: [{ date: "2027-03-20", kind: "EVENT" }],
      hasDateConflict: true,
      conflicts: [],
    });

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText(/terkunci secara manual/)).toBeTruthy();
    expect(screen.queryByText("Daftar bentrok")).toBeNull();
    const button = screen.getByRole("button", {
      name: "Konfirmasi reservasi",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("menampilkan banner galat DP minimum dan konflik tanggal", async () => {
    const { unmount } = render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({ galat: "DP_BELOW_MINIMUM" }),
      }),
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "DP terverifikasi belum memenuhi",
    );
    unmount();

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({ galat: "DATE_CONFLICT" }),
      }),
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Tanggal acara atau setup sudah terkunci",
    );
  });

  it("menampilkan banner galat dari parameter ?galat=", async () => {
    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({ galat: "PAYMENT_EXCEEDS_TOTAL" }),
      }),
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("melebihi total reservasi");
  });

  it("hanya menampilkan tindakan yang diizinkan untuk status DITANGGUHKAN", async () => {
    getReservationDetail.mockResolvedValue(
      detailWithStatus("DITANGGUHKAN"),
    );

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.queryByRole("button", { name: "Tangguhkan reservasi" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Batalkan reservasi" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Konfirmasi reservasi" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Konfirmasi reservasi" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Simpan catatan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tambah item" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Lunas" }),
    ).toBeTruthy();
  });

  it("menyembunyikan tindakan status untuk DITERIMA tetapi tetap mengizinkan pembayaran", async () => {
    getReservationDetail.mockResolvedValue(detailWithStatus("DITERIMA"));

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.queryByRole("button", { name: "Tangguhkan reservasi" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Batalkan reservasi" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Simpan catatan" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tambah item" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Lunas" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Konfirmasi reservasi" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Konfirmasi reservasi" }),
    ).toBeNull();
    expect(getReservationConfirmationContext).not.toHaveBeenCalled();
    expect(screen.getByText("Pihak: Customer")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Batalkan dan tandai DP hangus",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        "Tidak ada tindakan status yang tersedia untuk reservasi ini.",
      ),
    ).toBeNull();
  });

  it("menampilkan form reschedule untuk DITERIMA dengan jatah tersisa", async () => {
    const eventDate = addDays(todayInJakarta(), 90);
    getReservationDetail.mockResolvedValue({
      ...detailWithStatus("DITERIMA"),
      eventDate,
      bookingNumber: "HADCC-2027-0001",
      rescheduleCount: 0,
    });

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Reschedule" }),
    ).toBeTruthy();
    expect(screen.getByText("Tanggal acara saat ini")).toBeTruthy();
    expect(screen.getByText("Batas permintaan reschedule")).toBeTruthy();
    expect(screen.getByText("1 dari 1")).toBeTruthy();
    expect(screen.getByLabelText("Tanggal acara baru")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Pindahkan tanggal" }),
    ).toBeTruthy();
  });

  it("menampilkan pesan jatah reschedule habis tanpa form", async () => {
    getReservationDetail.mockResolvedValue({
      ...detailWithStatus("DITERIMA"),
      eventDate: addDays(todayInJakarta(), 90),
      bookingNumber: "HADCC-2027-0001",
      rescheduleCount: 1,
    });

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("0 dari 1")).toBeTruthy();
    expect(screen.getByText(/Reschedule sudah digunakan/)).toBeTruthy();
    expect(screen.queryByLabelText("Tanggal acara baru")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Pindahkan tanggal" }),
    ).toBeNull();
  });

  it("menampilkan pesan batas reschedule lewat tanpa form", async () => {
    getReservationDetail.mockResolvedValue({
      ...detailWithStatus("DITERIMA"),
      eventDate: addDays(todayInJakarta(), 10),
      bookingNumber: "HADCC-2027-0001",
      rescheduleCount: 0,
    });

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("1 dari 1")).toBeTruthy();
    expect(screen.getByText(/Batas reschedule sudah lewat/)).toBeTruthy();
    expect(screen.queryByLabelText("Tanggal acara baru")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Pindahkan tanggal" }),
    ).toBeNull();
  });

  it("tidak menampilkan kartu reschedule untuk status selain DITERIMA", async () => {
    getReservationDetail.mockResolvedValue(detailWithStatus("PENDING"));

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.queryByRole("heading", { name: "Reschedule" }),
    ).toBeNull();
    expect(screen.queryByLabelText("Tanggal acara baru")).toBeNull();
  });

  it("menampilkan nomor booking dan badge DP hangus pada status final", async () => {
    getReservationDetail.mockResolvedValue({
      ...detailWithStatus("DIBATALKAN"),
      bookingNumber: "HADCC-2027-0009",
      dpForfeited: true,
    });

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("HADCC-2027-0009")).toBeTruthy();
    expect(screen.getByText("DP hangus")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Konfirmasi reservasi" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "Batalkan dan tandai DP hangus",
      }),
    ).toBeNull();
    expect(
      screen.getByText(
        "Tidak ada tindakan status yang tersedia untuk reservasi ini.",
      ),
    ).toBeTruthy();
    expect(getReservationConfirmationContext).not.toHaveBeenCalled();
  });

  it("menolak catatan kosong dan menyimpan catatan valid sebagai aktivitas admin", async () => {
    const empty = new FormData();
    empty.set("reservationId", "res-1");
    empty.set("note", "   ");

    await expect(addFollowUpNote(empty)).rejects.toThrow(
      "Catatan wajib diisi",
    );
    expect(addFollowUpNoteMutation).not.toHaveBeenCalled();

    const valid = new FormData();
    valid.set("reservationId", "res-1");
    valid.set("note", "Sudah dihubungi via WhatsApp.");

    await addFollowUpNote(valid);

    expect(addFollowUpNoteMutation).toHaveBeenCalledWith({
      reservationId: "res-1",
      note: "Sudah dihubungi via WhatsApp.",
      actorUserId: "admin-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/reservasi");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/reservasi/res-1");
  });

  it("menolak input reschedule tidak valid sebelum memanggil mutasi", async () => {
    const formData = new FormData();
    formData.set("reservationId", "res-1");
    formData.set("newEventDate", "2027-02-30");

    await expect(rescheduleReservation(formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(rescheduleReservationMutation).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      "/admin/reservasi/res-1?galat=INPUT_TIDAK_VALID",
    );
  });

  it("memanggil mutasi reschedule dengan aktor sesi dan merevalidasi halaman", async () => {
    const formData = new FormData();
    formData.set("reservationId", "res-1");
    formData.set("newEventDate", "2027-04-10");

    await expect(rescheduleReservation(formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(rescheduleReservationMutation).toHaveBeenCalledWith({
      reservationId: "res-1",
      newEventDate: "2027-04-10",
      actorUserId: "admin-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/reservasi");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/reservasi/res-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/kalender");
    expect(revalidatePath).toHaveBeenCalledWith("/reservasi");
    expect(redirect).toHaveBeenCalledWith("/admin/reservasi/res-1");
  });

  it("menampilkan tombol input reservasi menuju form baru", async () => {
    render(
      await ReservasiAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    const link = screen.getByRole("link", { name: "Input reservasi" });
    expect(link.getAttribute("href")).toBe("/admin/reservasi/baru");
  });

  it("menampilkan label sumber input admin pada daftar", async () => {
    listReservations.mockResolvedValue([
      {
        ...listItem,
        id: "res-admin",
        customerName: "Budi Santoso",
        source: "INPUT_ADMIN",
      },
    ]);

    render(
      await ReservasiAdminPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("Input admin")).toBeTruthy();
  });

  it("menampilkan label sumber input admin pada detail", async () => {
    getReservationDetail.mockResolvedValue({
      ...detail,
      source: "INPUT_ADMIN",
    });

    render(
      await ReservasiDetailPage({
        params: Promise.resolve({ id: "res-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("Input admin")).toBeTruthy();
  });

  it("menampilkan form input langsung dengan dua tombol simpan", async () => {
    render(
      await ReservasiBaruPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Input reservasi" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Paket")).toBeTruthy();
    expect(screen.getByLabelText("Nama lengkap")).toBeTruthy();
    expect(screen.getByLabelText("Nomor WhatsApp")).toBeTruthy();
    expect(screen.getByLabelText("Alamat")).toBeTruthy();
    expect(screen.getByLabelText("Jenis acara")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Simpan sebagai PENDING" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Simpan & Terima" }),
    ).toBeTruthy();
  });

  it("menampilkan banner galat pada form input langsung", async () => {
    render(
      await ReservasiBaruPage({
        searchParams: Promise.resolve({ galat: "INPUT_TIDAK_VALID" }),
      }),
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Input tidak valid");
  });
});
