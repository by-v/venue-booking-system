import { describe, expect, it } from "vitest";

import {
  consumeSubmissionLimit,
  RateLimitError,
  SUBMISSION_LIMIT,
  SUBMISSION_WINDOW_SECONDS,
} from "@/modules/reservation/rate-limit";

const START = new Date("2027-03-10T00:00:00.000Z");

async function consume(key: string, now = START): Promise<void> {
  await consumeSubmissionLimit({ key, now });
}

describe("pembatas laju pengajuan", () => {
  it("memperbolehkan lima permintaan lalu menolak permintaan keenam", async () => {
    for (let index = 0; index < SUBMISSION_LIMIT; index += 1) {
      await consume("sumber-a");
    }

    await expect(consume("sumber-a")).rejects.toBeInstanceOf(RateLimitError);
  });

  it("sumber lain tetap dapat mengirim setelah sumber pertama mencapai batas", async () => {
    for (let index = 0; index < SUBMISSION_LIMIT; index += 1) {
      await consume("sumber-a");
    }
    await expect(consume("sumber-a")).rejects.toThrow();

    await expect(consume("sumber-b")).resolves.toBeUndefined();
  });

  it("jendela kedaluwarsa mereset hitungan", async () => {
    for (let index = 0; index < SUBMISSION_LIMIT; index += 1) {
      await consume("sumber-a");
    }
    await expect(consume("sumber-a")).rejects.toThrow();

    const nextWindow = new Date(
      START.getTime() + (SUBMISSION_WINDOW_SECONDS + 1) * 1000,
    );

    for (let index = 0; index < SUBMISSION_LIMIT; index += 1) {
      await consume("sumber-a", nextWindow);
    }
    await expect(consume("sumber-a", nextWindow)).rejects.toThrow();
  });
});
