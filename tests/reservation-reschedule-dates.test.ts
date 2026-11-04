import { describe, expect, it } from "vitest";

import { subtractOneCalendarMonth } from "@/modules/availability/dates";
import {
  canReschedule,
  isRescheduleDeadlinePassed,
  rescheduleDeadline,
} from "@/modules/reservation/reschedule";

describe("aturan tanggal reschedule", () => {
  it("mengurangi satu bulan kalender dengan hari yang sama", () => {
    expect(subtractOneCalendarMonth("2026-03-20")).toBe("2026-02-20");
    expect(subtractOneCalendarMonth("2026-01-15")).toBe("2025-12-15");
  });

  it("memakai hari terakhir bulan tujuan bila tanggal tidak ada", () => {
    expect(subtractOneCalendarMonth("2026-03-31")).toBe("2026-02-28");
    expect(subtractOneCalendarMonth("2026-03-30")).toBe("2026-02-28");
    expect(subtractOneCalendarMonth("2026-05-31")).toBe("2026-04-30");
  });

  it("menangani tahun kabisat", () => {
    expect(subtractOneCalendarMonth("2028-03-31")).toBe("2028-02-29");
    expect(subtractOneCalendarMonth("2028-03-30")).toBe("2028-02-29");
  });

  it("memakai batas yang inklusif", () => {
    const deadline = rescheduleDeadline("2026-03-20");

    expect(deadline).toBe("2026-02-20");
    expect(
      isRescheduleDeadlinePassed({
        eventDate: "2026-03-20",
        today: "2026-02-19",
      }),
    ).toBe(false);
    expect(
      isRescheduleDeadlinePassed({
        eventDate: "2026-03-20",
        today: "2026-02-20",
      }),
    ).toBe(false);
    expect(
      isRescheduleDeadlinePassed({
        eventDate: "2026-03-20",
        today: "2026-02-21",
      }),
    ).toBe(true);
  });

  it("menolak permintaan setelah batas akhir bulan", () => {
    expect(
      isRescheduleDeadlinePassed({
        eventDate: "2026-03-31",
        today: "2026-02-28",
      }),
    ).toBe(false);
    expect(
      isRescheduleDeadlinePassed({
        eventDate: "2026-03-31",
        today: "2026-03-01",
      }),
    ).toBe(true);
  });

  it("hanya mengizinkan DITERIMA dengan jatah dan sebelum batas", () => {
    const base = {
      status: "DITERIMA" as const,
      rescheduleCount: 0,
      eventDate: "2026-03-20",
      today: "2026-02-20",
    };

    expect(canReschedule(base)).toBe(true);
    expect(canReschedule({ ...base, rescheduleCount: 1 })).toBe(false);
    expect(canReschedule({ ...base, status: "PENDING" })).toBe(false);
    expect(canReschedule({ ...base, today: "2026-02-21" })).toBe(false);
  });
});
