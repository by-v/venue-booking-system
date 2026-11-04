import { describe, expect, it } from "vitest";

import {
  calculateMinimumDp,
  calculateRemainingPayment,
  calculateReservationTotal,
  derivePaymentStatus,
  estimateMinimumDp,
} from "@/modules/reservation/pricing";

describe("perhitungan keuangan reservasi", () => {
  it("menghitung total dari harga paket snapshot dan seluruh item biaya", () => {
    expect(calculateReservationTotal(20_000_000, [])).toBe(20_000_000);
    expect(calculateReservationTotal(20_000_000, [1_500_000])).toBe(
      21_500_000,
    );
    expect(
      calculateReservationTotal(20_000_000, [1_500_000, 500_000]),
    ).toBe(22_000_000);
  });

  it("menghitung dan membulatkan DP minimum 25% ke atas", () => {
    expect(calculateMinimumDp(20_000_000)).toBe(5_000_000);
    expect(calculateMinimumDp(22_000_001)).toBe(5_500_001);
    expect(calculateMinimumDp(10_000_001)).toBe(2_500_001);
    expect(calculateMinimumDp(0)).toBe(0);
    expect(calculateMinimumDp(1)).toBe(1);
  });

  it("menurunkan status pembayaran dari total terverifikasi", () => {
    const total = 20_000_000;

    expect(derivePaymentStatus(total, 4_000_000)).toBe("BELUM_DP");
    expect(derivePaymentStatus(total, 5_000_000)).toBe("DP");
    expect(derivePaymentStatus(total, 19_999_999)).toBe("DP");
    expect(derivePaymentStatus(total, 20_000_000)).toBe("LUNAS");
    expect(derivePaymentStatus(total, 21_000_000)).toBe("LUNAS");
  });

  it("menghitung sisa pembayaran tanpa nilai negatif", () => {
    expect(calculateRemainingPayment(20_000_000, 5_000_000)).toBe(
      15_000_000,
    );
    expect(calculateRemainingPayment(20_000_000, 20_000_000)).toBe(0);
    expect(calculateRemainingPayment(20_000_000, 0)).toBe(20_000_000);
    expect(calculateRemainingPayment(20_000_000, 21_000_000)).toBe(0);
  });
});

describe("perkiraan DP minimum form publik", () => {
  it("tetap memakai perhitungan DP minimum yang sama", () => {
    expect(estimateMinimumDp(20_000_000)).toBe(5_000_000);
    expect(estimateMinimumDp(10_000_001)).toBe(2_500_001);
    expect(estimateMinimumDp(0)).toBe(0);
    expect(estimateMinimumDp(1)).toBe(1);
  });
});
