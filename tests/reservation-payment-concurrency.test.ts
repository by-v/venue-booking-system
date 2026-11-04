import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { payment } from "@/lib/db/schema";
import { markDownPayment } from "@/modules/reservation/mutations";

import { seedReservation } from "./helpers/seed-reservation";

describe("konkurensi pencatatan DP", () => {
  it("hanya mencatat satu DP bila dua permintaan berjalan bersamaan", async () => {
    const { reservationId, actorUserId } = await seedReservation();

    const results = await Promise.allSettled([
      markDownPayment({ reservationId, actorUserId }),
      markDownPayment({ reservationId, actorUserId }),
    ]);

    const fulfilled = results.filter(
      (result) => result.status === "fulfilled",
    );
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      reason: { code: "INVALID_STATE" },
    });

    const rows = await db.select().from(payment);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.verificationStatus).toBe("TERVERIFIKASI");
    expect(rows[0]?.amountRupiah).toBe(5_000_000);
  });
});
