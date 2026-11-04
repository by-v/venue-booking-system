import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({ headerStore: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => mockState.headerStore,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string): never => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveFacility, removeFacility, saveVenueProfile } from "@/app/admin/venue/actions";
import { saveVenueContact } from "@/app/admin/pengaturan/actions";
import { savePackage, togglePackage } from "@/app/admin/paket/actions";
import { saveGalleryItem, toggleGalleryItem } from "@/app/admin/galeri/actions";
import {
  addFollowUpNote,
  addReservationItem,
  cancelAcceptedReservation,
  cancelReservation,
  completeReservation,
  confirmReservation,
  createAdminReservation,
  markDownPayment,
  markPaidOff,
  saveSetupNote,
  suspendReservation,
  updatePaymentDueDate,
  updateReservationData,
  rescheduleReservation,
} from "@/app/admin/reservasi/actions";

const cases: Array<[string, (formData: FormData) => Promise<void>]> = [
  ["saveVenueProfile", saveVenueProfile],
  ["saveVenueContact", saveVenueContact],
  ["savePackage", savePackage],
  ["togglePackage", togglePackage],
  ["saveFacility", saveFacility],
  ["removeFacility", removeFacility],
  ["saveGalleryItem", saveGalleryItem],
  ["toggleGalleryItem", toggleGalleryItem],
  ["addFollowUpNote", addFollowUpNote],
  ["saveSetupNote", saveSetupNote],
  ["addReservationItem", addReservationItem],
  ["markDownPayment", markDownPayment],
  ["markPaidOff", markPaidOff],
  ["suspendReservation", suspendReservation],
  ["cancelReservation", cancelReservation],
  ["completeReservation", completeReservation],
  ["confirmReservation", confirmReservation],
  ["cancelAcceptedReservation", cancelAcceptedReservation],
  ["rescheduleReservation", rescheduleReservation],
  ["createAdminReservation", createAdminReservation],
  ["updateReservationData", updateReservationData],
  ["updatePaymentDueDate", updatePaymentDueDate],
];

beforeEach(() => {
  mockState.headerStore = new Headers({ "x-original-pathname": "/admin" });
});

describe("aksi admin tanpa sesi", () => {
  it.each(cases)(
    "%s dialihkan ke /login sebelum logika aksi berjalan",
    async (_name, action) => {
      await expect(action(new FormData())).rejects.toThrow(
        "REDIRECT:/login?redirect=%2Fadmin",
      );
    },
    30000,
  );
});
