import { describe, expect, it } from "vitest";

import {
  addDays,
  buildAvailability,
  isBookableDate,
  isPastOrToday,
  lockDatesForEvent,
  todayInJakarta,
} from "@/modules/availability/dates";

describe("perhitungan tanggal ketersediaan", () => {
  it("Full Service hanya mengunci tanggal acara", () => {
    expect(
      lockDatesForEvent({ eventDate: "2027-03-20", setupDaysBefore: 0 }),
    ).toEqual([{ date: "2027-03-20", kind: "EVENT" }]);
  });

  it("setup standar malam H-1 tidak memblokir", () => {
    const locks = lockDatesForEvent({
      eventDate: "2027-03-20",
      setupDaysBefore: 0,
    });
    expect(locks.map((lock) => lock.date)).not.toContain("2027-03-19");
  });

  it("paket Outdoor mengunci H-2 sampai H", () => {
    expect(
      lockDatesForEvent({ eventDate: "2027-03-20", setupDaysBefore: 2 }),
    ).toEqual([
      { date: "2027-03-18", kind: "SETUP" },
      { date: "2027-03-19", kind: "SETUP" },
      { date: "2027-03-20", kind: "EVENT" },
    ]);
  });

  it("paket Walimah mengunci H-3 sampai H", () => {
    expect(
      lockDatesForEvent({ eventDate: "2027-03-20", setupDaysBefore: 3 }).map(
        (lock) => lock.date,
      ),
    ).toEqual([
      "2027-03-17",
      "2027-03-18",
      "2027-03-19",
      "2027-03-20",
    ]);
  });

  it("hari setup tambahan ikut terkunci", () => {
    expect(
      lockDatesForEvent({
        eventDate: "2027-03-20",
        setupDaysBefore: 0,
        extraSetupDates: ["2027-03-19"],
      }),
    ).toEqual([
      { date: "2027-03-19", kind: "SETUP" },
      { date: "2027-03-20", kind: "EVENT" },
    ]);
  });

  it("perhitungan melewati batas bulan", () => {
    expect(
      lockDatesForEvent({ eventDate: "2027-04-01", setupDaysBefore: 3 }).map(
        (lock) => lock.date,
      ),
    ).toEqual([
      "2027-03-29",
      "2027-03-30",
      "2027-03-31",
      "2027-04-01",
    ]);
  });

  it("mengenali tanggal lampau dan hari ini sebagai tidak dapat diajukan", () => {
    expect(isPastOrToday("2027-03-19", "2027-03-20")).toBe(true);
    expect(isPastOrToday("2027-03-20", "2027-03-20")).toBe(true);
    expect(isPastOrToday("2027-03-21", "2027-03-20")).toBe(false);

    expect(isBookableDate("2027-03-19", "2027-03-20")).toBe(false);
    expect(isBookableDate("2027-03-20", "2027-03-20")).toBe(false);
    expect(isBookableDate("2027-03-21", "2027-03-20")).toBe(true);
  });

  it("memakai WIB saat pergantian hari UTC", () => {
    expect(todayInJakarta(new Date("2027-03-19T16:59:00Z"))).toBe(
      "2027-03-19",
    );
    expect(todayInJakarta(new Date("2027-03-19T17:00:00Z"))).toBe(
      "2027-03-20",
    );
  });

  it("menambah dan mengurangi hari melewati batas bulan", () => {
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("tanggal terkunci, hari ini, dan tanggal lampau tampil Terisi", () => {
    const days = buildAvailability({
      month: "2027-03",
      today: "2027-03-10",
      lockedDates: ["2027-03-18", "2027-03-20"],
      setupDaysBefore: 0,
    });

    const byDate = new Map(days.map((day) => [day.date, day.status]));
    expect(byDate.get("2027-03-09")).toBe("TERISI");
    expect(byDate.get("2027-03-10")).toBe("TERISI");
    expect(byDate.get("2027-03-11")).toBe("TERSEDIA");
    expect(byDate.get("2027-03-18")).toBe("TERISI");
    expect(byDate.get("2027-03-19")).toBe("TERSEDIA");
    expect(byDate.get("2027-03-20")).toBe("TERISI");
    expect(days).toHaveLength(31);
  });

  it("ketersediaan bergantung pada jendela setup paket", () => {
    const days = buildAvailability({
      month: "2027-03",
      today: "2027-03-01",
      lockedDates: ["2027-03-18"],
      setupDaysBefore: 2,
    });

    const byDate = new Map(days.map((day) => [day.date, day.status]));
    expect(byDate.get("2027-03-18")).toBe("TERISI");
    expect(byDate.get("2027-03-19")).toBe("TERISI");
    expect(byDate.get("2027-03-20")).toBe("TERISI");
    expect(byDate.get("2027-03-21")).toBe("TERSEDIA");
  });
});
