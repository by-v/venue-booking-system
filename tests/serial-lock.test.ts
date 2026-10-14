import { Client } from "pg";
import { afterAll, beforeAll, expect, test } from "vitest";
import { TEST_DB_ADVISORY_LOCK_KEY } from "./helpers/db-lock";

let client: Client;

beforeAll(async () => {
  client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
});

afterAll(async () => {
  try {
    await client.end();
  } catch {}
});

test("pg_try_advisory_lock returns false while lock is held by setup", async () => {
  const res = await client.query<{ pg_try_advisory_lock: boolean }>(
    "SELECT pg_try_advisory_lock($1) AS pg_try_advisory_lock",
    [TEST_DB_ADVISORY_LOCK_KEY],
  );
  expect(res.rows[0]?.pg_try_advisory_lock).toBe(false);
});
