import { describe, expect, it } from "vitest";

import {
  evaluateAutoCancellationCandidate,
  inactivityDeadline,
  isReservationCompletionDue,
} from "@/modules/reservation/lifecycle";

const submittedFirstJanuary = new Date("2025-12-31T17:00:00Z");

describe("kandidat auto-cancel", () => {
  it("menjadikan pengajuan 1 Januari sebagai kandidat pada 1 April", () => {
    expect(
      inactivityDeadline({
        createdAt: submittedFirstJanuary,
        lastSubstantiveActivityAt: null,
      }),
    ).toBe("2026-04-01");

    expect(
      evaluateAutoCancellationCandidate({
        status: "PENDING",
        eventDate: "2026-05-01",
        createdAt: submittedFirstJanuary,
        lastSubstantiveActivityAt: null,
        today: "2026-03-31",
      }),
    ).toMatchObject({ candidate: false, reasonCode: null });

    expect(
      evaluateAutoCancellationCandidate({
        status: "PENDING",
        eventDate: "2026-05-01",
        createdAt: submittedFirstJanuary,
        lastSubstantiveActivityAt: null,
        today: "2026-04-01",
      }),
    ).toMatchObject({
      candidate: true,
      reasonCode: "INACTIVITY_3M",
    });
  });

  it("memakai hari terakhir bulan tujuan pada batas akhir bulan", () => {
    const lastActivity = new Date("2026-11-30T03:00:00Z");

    expect(
      inactivityDeadline({
        createdAt: submittedFirstJanuary,
        lastSubstantiveActivityAt: lastActivity,
      }),
    ).toBe("2027-02-28");

    expect(
      evaluateAutoCancellationCandidate({
        status: "DITANGGUHKAN",
        eventDate: "2027-05-01",
        createdAt: submittedFirstJanuary,
        lastSubstantiveActivityAt: lastActivity,
        today: "2027-02-27",
      }).candidate,
    ).toBe(false);

    expect(
      evaluateAutoCancellationCandidate({
        status: "DITANGGUHKAN",
        eventDate: "2027-05-01",
        createdAt: submittedFirstJanuary,
        lastSubstantiveActivityAt: lastActivity,
        today: "2027-02-28",
      }),
    ).toMatchObject({
      candidate: true,
      reasonCode: "INACTIVITY_3M",
    });
  });

  it("memakai 29 Februari pada tahun kabisat", () => {
    expect(
      inactivityDeadline({
        createdAt: submittedFirstJanuary,
        lastSubstantiveActivityAt: new Date("2027-11-30T03:00:00Z"),
      }),
    ).toBe("2028-02-29");
  });

  it("menggeser batas oleh catatan tindak lanjut 20 Februari ke 20 Mei", () => {
    const lastActivity = new Date("2026-02-20T03:00:00Z");

    expect(
      inactivityDeadline({
        createdAt: submittedFirstJanuary,
        lastSubstantiveActivityAt: lastActivity,
      }),
    ).toBe("2026-05-20");

    expect(
      evaluateAutoCancellationCandidate({
        status: "PENDING",
        eventDate: "2026-08-01",
        createdAt: submittedFirstJanuary,
        lastSubstantiveActivityAt: lastActivity,
        today: "2026-05-19",
      }).candidate,
    ).toBe(false);

    expect(
      evaluateAutoCancellationCandidate({
        status: "PENDING",
        eventDate: "2026-08-01",
        createdAt: submittedFirstJanuary,
        lastSubstantiveActivityAt: lastActivity,
        today: "2026-05-20",
      }),
    ).toMatchObject({
      candidate: true,
      reasonCode: "INACTIVITY_3M",
    });
  });

  it("menjadikan acara 15 Februari kandidat pada 16 Februari", () => {
    const base = {
      status: "PENDING" as const,
      eventDate: "2026-02-15",
      createdAt: new Date("2026-01-01T03:00:00Z"),
      lastSubstantiveActivityAt: null,
    };

    expect(
      evaluateAutoCancellationCandidate({
        ...base,
        today: "2026-02-15",
      }).candidate,
    ).toBe(false);

    expect(
      evaluateAutoCancellationCandidate({
        ...base,
        today: "2026-02-16",
      }),
    ).toMatchObject({
      candidate: true,
      reasonCode: "EVENT_DATE_PASSED",
    });
  });

  it("memprioritaskan EVENT_DATE_PASSED bila dua pemicu terpenuhi", () => {
    expect(
      evaluateAutoCancellationCandidate({
        status: "PENDING",
        eventDate: "2026-01-15",
        createdAt: submittedFirstJanuary,
        lastSubstantiveActivityAt: null,
        today: "2026-06-01",
      }),
    ).toMatchObject({
      candidate: true,
      reasonCode: "EVENT_DATE_PASSED",
    });
  });

  it("tidak menjadikan status final atau DITERIMA sebagai kandidat", () => {
    for (const status of [
      "DITERIMA",
      "DIBATALKAN",
      "AUTO_CANCELLED",
      "SELESAI",
    ] as const) {
      expect(
        evaluateAutoCancellationCandidate({
          status,
          eventDate: "2026-01-15",
          createdAt: submittedFirstJanuary,
          lastSubstantiveActivityAt: null,
          today: "2026-06-01",
        }),
      ).toMatchObject({ candidate: false, reasonCode: null });
    }
  });
});

describe("kandidat penyelesaian", () => {
  it("hanya DITERIMA setelah tanggal acara yang selesai", () => {
    expect(
      isReservationCompletionDue({
        status: "DITERIMA",
        eventDate: "2026-02-15",
        today: "2026-02-15",
      }),
    ).toBe(false);
    expect(
      isReservationCompletionDue({
        status: "DITERIMA",
        eventDate: "2026-02-15",
        today: "2026-02-16",
      }),
    ).toBe(true);
    expect(
      isReservationCompletionDue({
        status: "PENDING",
        eventDate: "2026-02-15",
        today: "2026-02-16",
      }),
    ).toBe(false);
  });
});
