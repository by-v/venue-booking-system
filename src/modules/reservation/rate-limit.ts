import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

/**
 * Pembatas laju form publik berbasis database (design RS-5). Satu statement
 * atomik memakai fixed window; tidak ada dependensi Redis/Upstash.
 */

export const SUBMISSION_LIMIT = 5;
export const SUBMISSION_WINDOW_SECONDS = 900;

/** Batas cek status publik (BR-32); memakai tabel rate limit yang sama. */
export const STATUS_CHECK_LIMIT = 10;
export const STATUS_CHECK_WINDOW_SECONDS = 900;

export class RateLimitError extends Error {
  constructor(public readonly windowSeconds = SUBMISSION_WINDOW_SECONDS) {
    super("Terlalu banyak percobaan. Coba lagi nanti.");
    this.name = "RateLimitError";
  }
}

export interface ConsumeSubmissionLimitInput {
  key: string;
  now?: Date;
  max?: number;
  windowSeconds?: number;
}

export async function consumeSubmissionLimit({
  key,
  now = new Date(),
  max = SUBMISSION_LIMIT,
  windowSeconds = SUBMISSION_WINDOW_SECONDS,
}: ConsumeSubmissionLimitInput): Promise<void> {
  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO submission_rate_limit ("key", "count", "window_started_at")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE
    SET "count" = CASE
        WHEN submission_rate_limit."window_started_at" <= ${now}::timestamptz - make_interval(secs => ${windowSeconds})
        THEN 1
        ELSE submission_rate_limit."count" + 1
      END,
      "window_started_at" = CASE
        WHEN submission_rate_limit."window_started_at" <= ${now}::timestamptz - make_interval(secs => ${windowSeconds})
        THEN ${now}::timestamptz
        ELSE submission_rate_limit."window_started_at"
      END
    RETURNING "count"
  `);

  const count = Number(result.rows[0]?.count ?? 0);
  if (count > max) {
    throw new RateLimitError(windowSeconds);
  }
}

export interface ConsumeStatusCheckLimitInput {
  key: string;
  now?: Date;
}

/**
 * Pembatas laju cek status dan Bukti Booking. Nilai batas/jendela terpisah
 * dari pengajuan form, tetapi tetap memakai tabel `submission_rate_limit`.
 */
export async function consumeStatusCheckLimit({
  key,
  now,
}: ConsumeStatusCheckLimitInput): Promise<void> {
  await consumeSubmissionLimit({
    key,
    now,
    max: STATUS_CHECK_LIMIT,
    windowSeconds: STATUS_CHECK_WINDOW_SECONDS,
  });
}
