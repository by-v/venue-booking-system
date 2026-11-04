"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { requireAdminSession } from "@/modules/auth";
import { ReservationError } from "@/modules/reservation/errors";
import {
  addFollowUpNote as addFollowUpNoteMutation,
  addReservationItem as addReservationItemMutation,
  cancelAcceptedReservation as cancelAcceptedReservationMutation,
  cancelReservation as cancelReservationMutation,
  cancelReservationForLatePayment as cancelReservationForLatePaymentMutation,
  completeReservation as completeReservationMutation,
  confirmReservation as confirmReservationMutation,
  createAdminReservation as createAdminReservationMutation,
  markDownPayment as markDownPaymentMutation,
  markPaidOff as markPaidOffMutation,
  recordManualPayment as recordManualPaymentMutation,
  rescheduleReservation as rescheduleReservationMutation,
  saveSetupNote as saveSetupNoteMutation,
  suspendReservation as suspendReservationMutation,
  updatePaymentDueDate as updatePaymentDueDateMutation,
  updateReservationData as updateReservationDataMutation,
} from "@/modules/reservation/mutations";
import {
  adminReservationInputSchema,
  acceptedReservationCancellationSchema,
  followUpNoteSchema,
  latePaymentCancellationSchema,
  paymentActionSchema,
  paymentDueDateUpdateSchema,
  reservationCancellationSchema,
  reservationCompletionSchema,
  reservationConfirmationSchema,
  reservationDataUpdateSchema,
  reservationItemInputSchema,
  reservationRescheduleSchema,
  reservationSuspensionSchema,
  setupNoteInputSchema,
} from "@/modules/reservation/schema";

function detailPath(reservationId: string): string {
  return reservationId.length > 0
    ? `/admin/reservasi/${encodeURIComponent(reservationId)}`
    : "/admin/reservasi";
}

function editPath(reservationId: string): string {
  return reservationId.length > 0
    ? `/admin/reservasi/${encodeURIComponent(reservationId)}/edit`
    : "/admin/reservasi";
}

function redirectWithError(reservationId: string, code: string): never {
  const separator = detailPath(reservationId).includes("?") ? "&" : "?";
  redirect(
    `${detailPath(reservationId)}${separator}galat=${encodeURIComponent(code)}`,
  );
}

function redirectEditWithError(reservationId: string, code: string): never {
  const separator = editPath(reservationId).includes("?") ? "&" : "?";
  redirect(
    `${editPath(reservationId)}${separator}galat=${encodeURIComponent(code)}`,
  );
}

function redirectNewReservationWithError(code: string): never {
  redirect(`/admin/reservasi/baru?galat=${encodeURIComponent(code)}`);
}

async function runReservationAction(
  reservationId: string,
  action: () => Promise<void>,
  options: { revalidateAvailability?: boolean } = {},
): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof ReservationError) {
      redirectWithError(reservationId, error.code);
    }
    if (error instanceof ZodError) {
      redirectWithError(reservationId, "INPUT_TIDAK_VALID");
    }
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reservasi");
  revalidatePath(detailPath(reservationId));
  if (options.revalidateAvailability) {
    revalidatePath("/admin/kalender");
    revalidatePath("/reservasi");
  }
  redirect(detailPath(reservationId));
}

/** Server Action catatan tindak lanjut admin (design D8). */
export async function addFollowUpNote(formData: FormData): Promise<void> {
  const session = await requireAdminSession();

  const parsed = followUpNoteSchema.parse({
    reservationId: formData.get("reservationId"),
    note: formData.get("note"),
  });

  await addFollowUpNoteMutation({
    reservationId: parsed.reservationId,
    note: parsed.note,
    actorUserId: session.user.id,
  });

  revalidatePath("/admin/reservasi");
  revalidatePath(`/admin/reservasi/${parsed.reservationId}`);
}

/** Server Action catatan setup internal admin (design D4). */
export async function saveSetupNote(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(reservationId, async () => {
    const parsed = setupNoteInputSchema.parse({
      reservationId: formData.get("reservationId"),
      note: formData.get("note"),
    });

    await saveSetupNoteMutation({
      ...parsed,
      actorUserId: session.user.id,
    });
  });
}

/** Server Action koreksi data reservasi yang diisi customer. */
export async function updateReservationData(
  formData: FormData,
): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  try {
    const parsed = reservationDataUpdateSchema.parse({
      reservationId: formData.get("reservationId"),
      name: formData.get("name"),
      whatsapp: formData.get("whatsapp"),
      address: formData.get("address"),
      eventType: formData.get("eventType"),
      packageId: formData.get("packageId"),
      eventDate: formData.get("eventDate"),
      notes: formData.get("notes"),
    });

    await updateReservationDataMutation({
      ...parsed,
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (error instanceof ReservationError) {
      redirectEditWithError(reservationId, error.code);
    }
    if (error instanceof ZodError) {
      redirectEditWithError(reservationId, "INPUT_TIDAK_VALID");
    }
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reservasi");
  revalidatePath(detailPath(reservationId));
  revalidatePath(editPath(reservationId));
  revalidatePath("/admin/kalender");
  revalidatePath("/reservasi");
  redirect(detailPath(reservationId));
}

/** Server Action batas pelunasan manual pada detail reservasi admin. */
export async function updatePaymentDueDate(
  formData: FormData,
): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(reservationId, async () => {
    const parsed = paymentDueDateUpdateSchema.parse({
      reservationId: formData.get("reservationId"),
      paymentDueDate: formData.get("paymentDueDate"),
    });

    await updatePaymentDueDateMutation({
      ...parsed,
      actorUserId: session.user.id,
    });
  });
}

export async function addReservationItem(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(reservationId, async () => {
    const parsed = reservationItemInputSchema.parse({
      reservationId: formData.get("reservationId"),
      description: formData.get("description"),
      amountRupiah: formData.get("amountRupiah"),
    });

    await addReservationItemMutation({
      ...parsed,
      actorUserId: session.user.id,
    });
  });
}

export async function markDownPayment(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(reservationId, async () => {
    const parsed = paymentActionSchema.parse({
      reservationId: formData.get("reservationId"),
    });

    await markDownPaymentMutation({
      ...parsed,
      actorUserId: session.user.id,
    });
  });
}

export async function markPaidOff(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(reservationId, async () => {
    const parsed = paymentActionSchema.parse({
      reservationId: formData.get("reservationId"),
    });

    await markPaidOffMutation({
      ...parsed,
      actorUserId: session.user.id,
    });
  });
}

export async function recordManualPayment(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");
  const amountRupiah = Number(formData.get("amountRupiah") ?? "0");
  const reason = String(formData.get("reason") ?? "");

  await runReservationAction(reservationId, async () => {
    await recordManualPaymentMutation({
      reservationId,
      actorUserId: session.user.id,
      amountRupiah,
      reason,
    });
  });
}

export async function suspendReservation(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(reservationId, async () => {
    const parsed = reservationSuspensionSchema.parse({
      reservationId: formData.get("reservationId"),
      reason: formData.get("reason"),
    });

    await suspendReservationMutation({
      ...parsed,
      actorUserId: session.user.id,
    });
  });
}

export async function cancelReservation(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(reservationId, async () => {
    const parsed = reservationCancellationSchema.parse({
      reservationId: formData.get("reservationId"),
      reason: formData.get("reason"),
      reasonCode: formData.get("reasonCode"),
    });

    await cancelReservationMutation({
      ...parsed,
      actorUserId: session.user.id,
    });
  });
}

export async function confirmReservation(formData: FormData): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(
    reservationId,
    async () => {
      const parsed = reservationConfirmationSchema.parse({
        reservationId: formData.get("reservationId"),
      });

      await confirmReservationMutation({
        ...parsed,
        actorUserId: session.user.id,
      });
    },
    { revalidateAvailability: true },
  );
}

export async function completeReservation(
  formData: FormData,
): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(reservationId, async () => {
    const parsed = reservationCompletionSchema.parse({
      reservationId: formData.get("reservationId"),
    });

    await completeReservationMutation({
      ...parsed,
      actorUserId: session.user.id,
    });
  });
}

export async function cancelAcceptedReservation(
  formData: FormData,
): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(
    reservationId,
    async () => {
      const parsed = acceptedReservationCancellationSchema.parse({
        reservationId: formData.get("reservationId"),
        reason: formData.get("reason"),
        reasonCode: formData.get("reasonCode"),
      });

      await cancelAcceptedReservationMutation({
        ...parsed,
        actorUserId: session.user.id,
      });
    },
    { revalidateAvailability: true },
  );
}

export async function cancelReservationForLatePayment(
  formData: FormData,
): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(
    reservationId,
    async () => {
      const parsed = latePaymentCancellationSchema.parse({
        reservationId: formData.get("reservationId"),
        reason: formData.get("reason"),
        dpDecision: formData.get("dpDecision"),
      });

      await cancelReservationForLatePaymentMutation({
        ...parsed,
        actorUserId: session.user.id,
      });
    },
    { revalidateAvailability: true },
  );
}

export async function rescheduleReservation(
  formData: FormData,
): Promise<void> {
  const session = await requireAdminSession();
  const reservationId = String(formData.get("reservationId") ?? "");

  await runReservationAction(
    reservationId,
    async () => {
      const parsed = reservationRescheduleSchema.parse({
        reservationId: formData.get("reservationId"),
        newEventDate: formData.get("newEventDate"),
      });

      await rescheduleReservationMutation({
        ...parsed,
        actorUserId: session.user.id,
      });
    },
    { revalidateAvailability: true },
  );
}

/** Server Action input reservasi langsung oleh admin (design D7). */
export async function createAdminReservation(
  formData: FormData,
): Promise<void> {
  const session = await requireAdminSession();

  const parsed = adminReservationInputSchema.safeParse({
    name: formData.get("name"),
    whatsapp: formData.get("whatsapp"),
    address: formData.get("address"),
    eventType: formData.get("eventType"),
    packageId: formData.get("packageId"),
    eventDate: formData.get("eventDate"),
    notes: formData.get("notes"),
    accept: formData.get("accept") === "on",
  });

  if (!parsed.success) {
    redirectNewReservationWithError("INPUT_TIDAK_VALID");
  }

  let reservationId: string;
  try {
    const created = await createAdminReservationMutation({
      ...parsed.data,
      actorUserId: session.user.id,
    });
    reservationId = created.id;
  } catch (error) {
    if (error instanceof ReservationError) {
      redirectNewReservationWithError(error.code);
    }
    throw error;
  }

  let accepted = false;
  if (parsed.data.accept) {
    try {
      await confirmReservationMutation({
        reservationId,
        actorUserId: session.user.id,
      });
      accepted = true;
    } catch (error) {
      if (error instanceof ReservationError) {
        redirectWithError(reservationId, error.code);
      }
      throw error;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reservasi");
  revalidatePath(detailPath(reservationId));
  if (accepted) {
    revalidatePath("/admin/kalender");
    revalidatePath("/reservasi");
  }
  redirect(detailPath(reservationId));
}

