import { describe, expect, it } from "vitest";

import {
  isPaymentOverdue,
  PAYMENT_DEADLINE_DAYS,
  paymentDueDate,
  resolvePaymentDueDate,
  shortNoticePaymentDueDate,
} from "@/modules/reservation/payment-deadline";

describe("batas pelunasan", () => {
  it("memakai jarak H-14", () => {
    expect(PAYMENT_DEADLINE_DAYS).toBe(14);
  });

  it("menurunkan batas 30 Maret 2026 menjadi 16 Maret 2026", () => {
    expect(paymentDueDate("2026-03-30")).toBe("2026-03-16");
  });

  it("menurunkan batas 1 Maret 2026 menjadi 15 Februari 2026", () => {
    expect(paymentDueDate("2026-03-01")).toBe("2026-02-15");
  });

  it("menyeberangi pergantian tahun", () => {
    expect(paymentDueDate("2026-01-05")).toBe("2025-12-22");
  });

  it("menangani tahun kabisat", () => {
    expect(paymentDueDate("2024-03-01")).toBe("2024-02-16");
  });
});

describe("penanda pelunasan terlambat", () => {
  const eventDate = "2026-03-30";
  const dueDate = "2026-03-16";

  it("tidak menandai status DP tepat pada batas", () => {
    expect(
      isPaymentOverdue({ eventDate, paymentStatus: "DP", today: dueDate }),
    ).toBe(false);
  });

  it("menandai status DP sehari setelah batas", () => {
    expect(
      isPaymentOverdue({
        eventDate,
        paymentStatus: "DP",
        today: "2026-03-17",
      }),
    ).toBe(true);
  });

  it("menandai status BELUM_DP setelah batas", () => {
    expect(
      isPaymentOverdue({
        eventDate,
        paymentStatus: "BELUM_DP",
        today: "2026-03-17",
      }),
    ).toBe(true);
  });

  it("tidak menandai reservasi LUNAS meski sudah melewati batas", () => {
    expect(
      isPaymentOverdue({
        eventDate,
        paymentStatus: "LUNAS",
        today: "2026-04-01",
      }),
    ).toBe(false);
  });

  it("tidak menandai reservasi LUNAS tepat pada batas", () => {
    expect(
      isPaymentOverdue({
        eventDate,
        paymentStatus: "LUNAS",
        today: dueDate,
      }),
    ).toBe(false);
  });

  it("memakai batas manual yang disepakati admin", () => {
    expect(
      isPaymentOverdue({
        eventDate,
        paymentStatus: "DP",
        today: "2026-03-22",
        paymentDueDateOverride: "2026-03-25",
      }),
    ).toBe(false);
    expect(
      isPaymentOverdue({
        eventDate,
        paymentStatus: "DP",
        today: "2026-03-26",
        paymentDueDateOverride: "2026-03-25",
      }),
    ).toBe(true);
  });

  it("mengembalikan batas default saat override kosong", () => {
    expect(resolvePaymentDueDate(eventDate, null)).toBe(dueDate);
    expect(resolvePaymentDueDate(eventDate, "2026-03-25")).toBe("2026-03-25");
  });
});

describe("batas pelunasan booking mendadak", () => {
  it("memakai tiga hari sejak hari ini bila acara masih lebih jauh", () => {
    expect(shortNoticePaymentDueDate("2026-03-30", "2026-03-20")).toBe(
      "2026-03-23",
    );
  });

  it("tidak melewati tanggal acara", () => {
    expect(shortNoticePaymentDueDate("2026-03-21", "2026-03-20")).toBe(
      "2026-03-21",
    );
  });

  it("memakai tanggal acara bila acara kurang dari tiga hari lagi", () => {
    expect(shortNoticePaymentDueDate("2026-03-22", "2026-03-20")).toBe(
      "2026-03-22",
    );
  });
});
