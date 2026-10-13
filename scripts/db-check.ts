import "../src/lib/load-env";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main(): Promise<void> {
  const result = await db.execute(sql`SELECT current_database()`);
  const currentDb = result.rows[0]?.current_database;

  console.log(currentDb);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$client.end();
  });
