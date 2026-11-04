// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
import type { AvailabilityDay } from "@/modules/availability/types";

afterEach(() => {
  cleanup();
});

const days: AvailabilityDay[] = [
  { date: "2027-03-15", status: "TERSEDIA" },
  { date: "2027-03-16", status: "TERSEDIA" },
  { date: "2027-03-18", status: "TERISI" },
  { date: "2027-03-20", status: "TERISI" },
  { date: "2027-03-21", status: "TERSEDIA" },
];

describe("kalender publik", () => {
  it("tanggal Tersedia dapat dipilih", () => {
    const onSelect = vi.fn();
    render(
      <AvailabilityCalendar
        days={days}
        monthLabel="Maret 2027"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /2027-03-16/ }));
    expect(onSelect).toHaveBeenCalledWith("2027-03-16");
  });

  it("tanggal Terisi tidak memicu pemilihan", () => {
    const onSelect = vi.fn();
    render(
      <AvailabilityCalendar
        days={days}
        monthLabel="Maret 2027"
        onSelect={onSelect}
      />,
    );

    const locked = screen.getByRole("button", {
      name: /2027-03-18/,
    }) as HTMLButtonElement;

    expect(locked.disabled).toBe(true);
    fireEvent.click(locked);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("tanggal terpilih ditandai Dipilih", () => {
    render(
      <AvailabilityCalendar
        days={days}
        monthLabel="Maret 2027"
        selectedDate="2027-03-16"
      />,
    );

    const selected = screen.getByRole("button", { name: /2027-03-16/ });
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(selected.getAttribute("aria-label")).toContain("Dipilih");
  });

  it("tidak menampilkan jenis kunci atau hari setup", () => {
    const { container } = render(
      <AvailabilityCalendar days={days} monthLabel="Maret 2027" />,
    );

    expect(container.textContent).not.toMatch(/EVENT|SETUP|setup/i);
  });

  it("menampilkan keadaan kosong tanpa data", () => {
    render(<AvailabilityCalendar days={[]} monthLabel="April 2027" />);

    expect(screen.getByText("Belum ada data ketersediaan.")).toBeTruthy();
  });
});
