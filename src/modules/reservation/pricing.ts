import type { PaymentStatus } from "./types";

/**
 * Perhitungan keuangan reservasi (BR-06, BR-07, BR-09, BR-20). Semua nilai
 * berupa integer rupiah dan tidak menyentuh database.
 */

export const MINIMUM_DP_PERCENT = 25;

export function calculateReservationTotal(
  packagePriceRupiah: number,
  itemAmounts: readonly number[],
): number {
  return itemAmounts.reduce(
    (total, amountRupiah) => total + amountRupiah,
    packagePriceRupiah,
  );
}

export function calculateMinimumDp(totalRupiah: number): number {
  return Math.ceil((totalRupiah * MINIMUM_DP_PERCENT) / 100);
}

export function derivePaymentStatus(
  totalRupiah: number,
  verifiedRupiah: number,
): PaymentStatus {
  if (verifiedRupiah >= totalRupiah) {
    return "LUNAS";
  }
  if (verifiedRupiah >= calculateMinimumDp(totalRupiah)) {
    return "DP";
  }
  return "BELUM_DP";
}

export function calculateRemainingPayment(
  totalRupiah: number,
  verifiedRupiah: number,
): number {
  return Math.max(0, totalRupiah - verifiedRupiah);
}

/**
 * Perkiraan DP minimum untuk ringkasan form publik (ui-spec 4.1). Perhitungan
 * ini hanya tampilan; nominal final memakai total reservasi pada change 5a.
 */
export function estimateMinimumDp(priceRupiah: number): number {
  return calculateMinimumDp(priceRupiah);
}
