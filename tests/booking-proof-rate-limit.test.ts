import { describe, expect, it } from "vitest";

import {
  RateLimitError,
  STATUS_CHECK_LIMIT,
  STATUS_CHECK_WINDOW_SECONDS,
  consumeStatusCheckLimit,
} from "@/modules/reservation/rate-limit";

const START = new Date("2027-03-10T00:00:00.000Z");

async function consume(key: string, now = START): Promise<void> {
  await consumeStatusCheckLimit({ key, now });
}

describe("pembatas laju cek status", () => {
  it("memperbolehkan sepuluh percobaan lalu menolak percobaan kesebelas", async () => {
    for (let index = 0; index < STATUS_CHECK_LIMIT; index += 1) {
      await consume("cek-status:sumber-a");
    }

    await expect(
      consume("cek-status:sumber-a"),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("sumber lain tetap dapat mengecek setelah sumber pertama mencapai batas", async () => {
    for (let index = 0; index < STATUS_CHECK_LIMIT; index += 1) {
      await consume("cek-status:sumber-a");
    }
    await expect(consume("cek-status:sumber-a")).rejects.toThrow();

    await expect(consume("cek-status:sumber-b")).resolves.toBeUndefined();
  });

  it("jendela kedaluwarsa mereset hitungan", async () => {
    for (let index = 0; index < STATUS_CHECK_LIMIT; index += 1) {
      await consume("cek-status:sumber-a");
    }
    await expect(consume("cek-status:sumber-a")).rejects.toThrow();

    const nextWindow = new Date(
      START.getTime() + (STATUS_CHECK_WINDOW_SECONDS + 1) * 1000,
    );

    for (let index = 0; index < STATUS_CHECK_LIMIT; index += 1) {
      await consume("cek-status:sumber-a", nextWindow);
    }
    await expect(
      consume("cek-status:sumber-a", nextWindow),
    ).rejects.toThrow();
  });
});
