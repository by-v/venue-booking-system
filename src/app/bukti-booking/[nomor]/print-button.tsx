"use client";

/**
 * Tombol cetak Bukti Booking (D6). PDF dihasilkan dari dialog cetak peramban;
 * tidak ada PDF server-side.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center border border-gold-500 bg-gold-500 px-5 py-3 text-xs font-medium tracking-[0.08em] text-ink transition-colors hover:border-gold-700 hover:bg-gold-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      Cetak Bukti
    </button>
  );
}
