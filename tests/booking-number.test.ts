import { describe, expect, it } from "vitest";

import {
  bookingNumberYear,
  formatBookingNumber,
} from "@/modules/reservation/booking-number";

describe("tahun nomor booking", () => {
  it("memakai tahun konfirmasi WIB pada batas akhir tahun", () => {
    expect(bookingNumberYear(new Date("2026-12-31T16:59:59.000Z"))).toBe(
      "2026",
    );
  });

  it("berpindah tahun tepat pada tengah malam WIB", () => {
    expect(bookingNumberYear(new Date("2026-12-31T17:00:00.000Z"))).toBe(
      "2027",
    );
  });
});

describe("format nomor booking", () => {
  it("memformat urutan pertama menjadi empat digit", () => {
    expect(formatBookingNumber(2026, 1)).toBe("HADCC-2026-0001");
  });

  it("mempertahankan empat digit pada urutan 9999", () => {
    expect(formatBookingNumber(2026, 9999)).toBe("HADCC-2026-9999");
  });

  it("menambah lebar angka setelah urutan 9999", () => {
    expect(formatBookingNumber(2026, 10000)).toBe("HADCC-2026-10000");
  });
});
