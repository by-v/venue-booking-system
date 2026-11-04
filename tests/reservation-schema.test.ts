import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  customer,
  dateLock,
  packageTable,
  payment,
  reservation,
  reservationActivity,
  reservationItem,
  reservationStatusHistory,
  submissionRateLimit,
} from "@/lib/db/schema";

function validPackage(id = "full-service") {
  return {
    id,
    name: "Full Service",
    priceRupiah: 20_000_000,
    durationHours: 5,
    sessionCount: 1,
    setupDaysBefore: 0,
    sortOrder: 1,
  };
}

function validCustomer(id = "customer-1", whatsapp = "6281234567890") {
  return { id, name: "Customer Uji", whatsapp };
}

function validReservation(id = "reservasi-1", customerId = "customer-1") {
  return {
    id,
    customerId,
    packageId: "full-service",
    packageName: "Full Service",
    packagePriceRupiah: 20_000_000,
    packageDurationHours: 5,
    packageSessionCount: 1,
    eventDate: "2027-03-20",
    eventType: "PERNIKAHAN",
    address: "Jl. Uji No. 1, Pekalongan",
  };
}

function validPayment(id = "payment-1") {
  return {
    id,
    reservationId: "reservasi-1",
    amountRupiah: 5_000_000,
  };
}

async function seedPackageAndCustomer(): Promise<void> {
  await db.insert(packageTable).values(validPackage());
  await db.insert(customer).values(validCustomer());
}

describe("constraint skema reservasi", () => {
  it("menolak nomor WhatsApp duplikat", async () => {
    await db.insert(customer).values(validCustomer("customer-1"));

    await expect(
      db.insert(customer).values(validCustomer("customer-2")),
    ).rejects.toThrow();

    const rows = await db.select().from(customer);
    expect(rows).toHaveLength(1);
  });

  it("menolak status customer di luar CALON dan CLIENT", async () => {
    await expect(
      db.insert(customer).values({
        ...validCustomer(),
        status: "BARU",
      }),
    ).rejects.toThrow();
  });

  it("menerima customer CALON dan reservasi PENDING yang valid", async () => {
    await seedPackageAndCustomer();

    await db.insert(reservation).values(validReservation());

    const rows = await db.select().from(reservation);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("PENDING");
    expect(rows[0]?.packagePriceRupiah).toBe(20_000_000);
    expect(rows[0]?.perluPemeriksaanAdmin).toBe(false);
    expect(rows[0]?.bookingNumber).toBeNull();
    expect(rows[0]?.dpForfeited).toBe(false);
    expect(rows[0]?.source).toBe("FORM_PUBLIK");
  });

  it("menerima sumber FORM_PUBLIK dan INPUT_ADMIN", async () => {
    await seedPackageAndCustomer();

    await db.insert(reservation).values(validReservation("reservasi-sumber-1"));
    await db.insert(reservation).values({
      ...validReservation("reservasi-sumber-2"),
      source: "INPUT_ADMIN",
    });

    const rows = await db.select().from(reservation);
    expect(rows.find((row) => row.id === "reservasi-sumber-1")?.source).toBe(
      "FORM_PUBLIK",
    );
    expect(rows.find((row) => row.id === "reservasi-sumber-2")?.source).toBe(
      "INPUT_ADMIN",
    );
  });

  it("menolak sumber reservasi di luar daftar", async () => {
    await seedPackageAndCustomer();

    await expect(
      db.insert(reservation).values({
        ...validReservation(),
        source: "IMPOR",
      }),
    ).rejects.toThrow();
  });

  it("menolak status reservasi di luar daftar status", async () => {
    await seedPackageAndCustomer();

    await expect(
      db
        .insert(reservation)
        .values({ ...validReservation(), status: "DITOLAK" }),
    ).rejects.toThrow();
  });

  it("menolak jenis acara di luar daftar kanonik", async () => {
    await seedPackageAndCustomer();

    await expect(
      db
        .insert(reservation)
        .values({ ...validReservation(), eventType: "TIDAK_ADA" }),
    ).rejects.toThrow();
  });

  it("menolak snapshot harga negatif dan snapshot durasi/sesi tidak positif", async () => {
    await seedPackageAndCustomer();

    await expect(
      db
        .insert(reservation)
        .values({ ...validReservation(), packagePriceRupiah: -1 }),
    ).rejects.toThrow();

    await expect(
      db
        .insert(reservation)
        .values({ ...validReservation("reservasi-2"), packageDurationHours: 0 }),
    ).rejects.toThrow();

    await expect(
      db
        .insert(reservation)
        .values({ ...validReservation("reservasi-3"), packageSessionCount: 0 }),
    ).rejects.toThrow();
  });

  it("menolak item biaya nol/negatif dan deskripsi kosong", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values(validReservation());

    for (const [index, amountRupiah] of [0, -1].entries()) {
      await expect(
        db.insert(reservationItem).values({
          id: `item-${index}`,
          reservationId: "reservasi-1",
          description: "Biaya tambahan",
          amountRupiah,
        }),
      ).rejects.toThrow();
    }

    await expect(
      db.insert(reservationItem).values({
        id: "item-kosong",
        reservationId: "reservasi-1",
        description: "   ",
        amountRupiah: 1_000_000,
      }),
    ).rejects.toThrow();
  });

  it("menerima pembayaran terverifikasi dan menolak nominal tidak positif", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values(validReservation());

    await db.insert(payment).values(validPayment());

    const rows = await db.select().from(payment);
    expect(rows[0]).toMatchObject({
      id: "payment-1",
      amountRupiah: 5_000_000,
      verificationStatus: "TERVERIFIKASI",
    });

    for (const [index, amountRupiah] of [0, -1].entries()) {
      await expect(
        db.insert(payment).values({
          ...validPayment(`payment-${index + 2}`),
          amountRupiah,
        }),
      ).rejects.toThrow();
    }
  });

  it("menolak status pembayaran di luar daftar", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values(validReservation());

    for (const [index, verificationStatus] of ["LUNAS", "DICATAT", "TIDAK_VALID"].entries()) {
      await expect(
        db.insert(payment).values({
          ...validPayment(`payment-status-${index}`),
          verificationStatus,
        }),
      ).rejects.toThrow();
    }
  });

  it("menolak catatan tindak lanjut tanpa isi dan pelaku di luar daftar", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values(validReservation());

    await expect(
      db.insert(reservationActivity).values({
        id: "aktivitas-1",
        reservationId: "reservasi-1",
        type: "FOLLOW_UP_NOTE",
        actorType: "ADMIN",
      }),
    ).rejects.toThrow();

    await expect(
      db.insert(reservationActivity).values({
        id: "aktivitas-2",
        reservationId: "reservasi-1",
        type: "SUBMISSION",
        actorType: "ROBOT",
      }),
    ).rejects.toThrow();
  });

  it("menolak hitungan pembatas laju negatif", async () => {
    await expect(
      db.insert(submissionRateLimit).values({
        key: "sumber-uji",
        count: -1,
        windowStartedAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  it("FK restrict menolak hapus customer dan paket yang masih dirujuk", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values(validReservation());

    await expect(
      db.delete(customer).where(eq(customer.id, "customer-1")),
    ).rejects.toThrow();

    await expect(
      db.delete(packageTable).where(eq(packageTable.id, "full-service")),
    ).rejects.toThrow();
  });

  it("riwayat status awal dan aktivitas pengajuan dapat disimpan", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values(validReservation());

    await db.insert(reservationStatusHistory).values({
      id: "riwayat-1",
      reservationId: "reservasi-1",
      fromStatus: null,
      toStatus: "PENDING",
      reason: "Pengajuan form publik",
      actorType: "CUSTOMER",
    });
    await db.insert(reservationActivity).values({
      id: "aktivitas-1",
      reservationId: "reservasi-1",
      type: "SUBMISSION",
      actorType: "CUSTOMER",
    });

    const history = await db.select().from(reservationStatusHistory);
    const activity = await db.select().from(reservationActivity);
    expect(history[0]?.toStatus).toBe("PENDING");
    expect(activity[0]?.isSubstantive).toBe(true);
  });

  it("menolak kode alasan pembatalan di luar daftar dan menerima kode yang sah", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values(validReservation());

    await expect(
      db.insert(reservationStatusHistory).values({
        id: "riwayat-invalid",
        reservationId: "reservasi-1",
        fromStatus: "PENDING",
        toStatus: "DIBATALKAN",
        reason: "Alasan lain",
        reasonCode: "LAINNYA",
        actorType: "ADMIN",
      }),
    ).rejects.toThrow();

    await db.insert(reservationStatusHistory).values({
      id: "riwayat-valid",
      reservationId: "reservasi-1",
      fromStatus: "PENDING",
      toStatus: "DIBATALKAN",
      reason: "Customer mundur",
      reasonCode: "MUNDUR_CUSTOMER",
      actorType: "ADMIN",
    });

    const rows = await db.select().from(reservationStatusHistory);
    expect(rows[0]?.reasonCode).toBe("MUNDUR_CUSTOMER");
  });

  it("menerima tipe aktivitas pengolahan baru", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values(validReservation());

    const types = [
      "STATUS_CHANGE",
      "ITEM_ADDED",
      "PAYMENT_RECORDED",
      "PAYMENT_STATUS_CHANGED",
    ] as const;

    await db.insert(reservationActivity).values(
      types.map((type, index) => ({
        id: `aktivitas-pengolahan-${index}`,
        reservationId: "reservasi-1",
        type,
        note: "Ringkasan aktivitas uji",
        actorType: "ADMIN",
      })),
    );

    const rows = await db.select().from(reservationActivity);
    expect(rows.map((row) => row.type).sort()).toEqual([...types].sort());
  });

  it("pengajuan PENDING tidak menulis date_lock", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values(validReservation());

    const locks = await db.select().from(dateLock);
    expect(locks).toHaveLength(0);
  });

  it("menerima DITERIMA dengan nomor booking valid", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values({
      ...validReservation(),
      status: "DITERIMA",
      bookingNumber: "HADCC-2026-0001",
    });

    const rows = await db.select().from(reservation);
    expect(rows[0]?.status).toBe("DITERIMA");
    expect(rows[0]?.bookingNumber).toBe("HADCC-2026-0001");
  });

  it("menolak DITERIMA tanpa nomor booking", async () => {
    await seedPackageAndCustomer();

    await expect(
      db.insert(reservation).values({
        ...validReservation(),
        status: "DITERIMA",
      }),
    ).rejects.toThrow();
  });

  it("menolak format nomor booking yang tidak sesuai", async () => {
    await seedPackageAndCustomer();

    for (const [index, bookingNumber] of [
      "HADCC-2026-1",
      "hADCC-2026-0001",
      "HADCC-26-0001",
      "HADCC-2026-ABCD",
    ].entries()) {
      await expect(
        db.insert(reservation).values({
          ...validReservation(`reservasi-format-${index}`),
          bookingNumber,
        }),
      ).rejects.toThrow();
    }
  });

  it("menolak nomor booking duplikat tetapi mengizinkan banyak NULL", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values({
      ...validReservation("reservasi-nomor-1"),
      bookingNumber: "HADCC-2026-0001",
    });

    await expect(
      db.insert(reservation).values({
        ...validReservation("reservasi-nomor-2"),
        bookingNumber: "HADCC-2026-0001",
      }),
    ).rejects.toThrow();

    await db.insert(reservation).values([
      validReservation("reservasi-null-1"),
      validReservation("reservasi-null-2"),
    ]);
    const rows = await db.select().from(reservation);
    expect(rows.filter((row) => row.bookingNumber === null)).toHaveLength(2);
  });

  it("menolak dp_forfeited benar sebelum DIBATALKAN", async () => {
    await seedPackageAndCustomer();

    await expect(
      db.insert(reservation).values({
        ...validReservation(),
        dpForfeited: true,
      }),
    ).rejects.toThrow();
  });

  it("mengizinkan dp_forfeited benar saat DIBATALKAN", async () => {
    await seedPackageAndCustomer();
    await db.insert(reservation).values({
      ...validReservation(),
      status: "DIBATALKAN",
      dpForfeited: true,
    });

    const rows = await db.select().from(reservation);
    expect(rows[0]?.dpForfeited).toBe(true);
  });
});
