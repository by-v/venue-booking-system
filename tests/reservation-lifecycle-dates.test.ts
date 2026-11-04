import { describe, expect, it } from "vitest";

import {
  addCalendarMonths,
  dateInJakarta,
  subtractOneCalendarMonth,
  todayInJakarta,
} from "@/modules/availability/dates";

describe("helper tanggal lifecycle reservasi", () => {
  it("menambahkan tiga bulan kalender dengan hari yang sama", () => {
    expect(addCalendarMonths("2026-01-01", 3)).toBe("2026-04-01");
    expect(addCalendarMonths("2026-02-20", 3)).toBe("2026-05-20");
    expect(addCalendarMonths("2026-10-15", 3)).toBe("2027-01-15");
  });

  it("memakai hari terakhir bulan tujuan bila tanggal tidak ada", () => {
    expect(addCalendarMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(addCalendarMonths("2027-11-30", 3)).toBe("2028-02-29");
    expect(addCalendarMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("mendelegasikan pengurangan satu bulan ke helper bulan kalender", () => {
    expect(subtractOneCalendarMonth("2026-03-31")).toBe("2026-02-28");
    expect(subtractOneCalendarMonth("2028-03-31")).toBe("2028-02-29");
  });

  it("membaca tanggal kalender WIB dari timestamp", () => {
    expect(dateInJakarta(new Date("2026-01-31T16:59:59Z"))).toBe(
      "2026-01-31",
    );
    expect(dateInJakarta(new Date("2026-01-31T17:00:00Z"))).toBe(
      "2026-02-01",
    );
    expect(dateInJakarta(new Date("2026-02-28T23:30:00Z"))).toBe(
      "2026-03-01",
    );
  });

  it("todayInJakarta memakai tanggal kalender WIB yang sama", () => {
    const value = new Date("2026-06-30T17:30:00Z");
    expect(todayInJakarta(value)).toBe("2026-07-01");
    expect(todayInJakarta(value)).toBe(dateInJakarta(value));
  });
});
