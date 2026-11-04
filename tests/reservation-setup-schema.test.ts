import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { setupNote } from "@/lib/db/schema";

import { seedReservation } from "./helpers/seed-reservation";

describe("constraint catatan setup", () => {
  it("menerima satu catatan dan menolak reservation_id duplikat", async () => {
    const { reservationId, actorUserId } = await seedReservation();

    await db.insert(setupNote).values({
      id: "setup-note-1",
      reservationId,
      note: "Meja registrasi di lobi utama.",
      updatedByUserId: actorUserId,
    });

    await expect(
      db.insert(setupNote).values({
        id: "setup-note-2",
        reservationId,
        note: "Catatan kedua.",
        updatedByUserId: actorUserId,
      }),
    ).rejects.toThrow();

    const rows = await db
      .select()
      .from(setupNote)
      .where(eq(setupNote.reservationId, reservationId));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      note: "Meja registrasi di lobi utama.",
      updatedByUserId: actorUserId,
    });
  });

  it("menerima catatan 1.000 karakter dan menolak catatan kosong atau lebih panjang", async () => {
    const { reservationId } = await seedReservation();
    const note = "a".repeat(1_000);

    await db.insert(setupNote).values({
      id: "setup-note-panjang",
      reservationId,
      note,
    });

    const rows = await db.select().from(setupNote);
    expect(rows[0]?.note).toHaveLength(1_000);

    for (const invalidNote of ["", "   ", "a".repeat(1_001)]) {
      await expect(
        db.insert(setupNote).values({
          id: `setup-note-invalid-${invalidNote.length}`,
          reservationId,
          note: invalidNote,
        }),
      ).rejects.toThrow();
    }
  });

  it("menolak catatan untuk reservasi yang tidak ada", async () => {
    await expect(
      db.insert(setupNote).values({
        id: "setup-note-tanpa-reservasi",
        reservationId: "reservasi-tidak-ada",
        note: "Catatan yatim.",
      }),
    ).rejects.toThrow();
  });

  it("memperbarui teks dan updated_at", async () => {
    const { reservationId, actorUserId } = await seedReservation();
    const createdAt = new Date("2026-10-22T01:00:00.000Z");
    const updatedAt = new Date("2026-10-22T02:00:00.000Z");

    await db.insert(setupNote).values({
      id: "setup-note-update",
      reservationId,
      note: "Catatan awal.",
      updatedByUserId: actorUserId,
      createdAt,
      updatedAt: createdAt,
    });

    await db
      .update(setupNote)
      .set({
        note: "Catatan baru.",
        updatedByUserId: actorUserId,
        updatedAt,
      })
      .where(eq(setupNote.reservationId, reservationId));

    const rows = await db
      .select()
      .from(setupNote)
      .where(eq(setupNote.reservationId, reservationId));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      note: "Catatan baru.",
      updatedByUserId: actorUserId,
      createdAt,
      updatedAt,
    });
  });
});
