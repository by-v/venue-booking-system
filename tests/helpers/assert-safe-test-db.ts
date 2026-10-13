export interface AssertSafeTestDatabaseInput {
  testUrl?: string | null;
  devUrl?: string | null;
}

function databaseNameFromUrl(url: string): string {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
}

/**
 * Fail-closed guard untuk memastikan tes tidak pernah menyentuh database dev.
 * Melempar galat bila TEST_DATABASE_URL kosong, namanya tidak berakhiran
 * `_test`, atau sama dengan database dev.
 */
export function assertSafeTestDatabase({
  testUrl,
  devUrl,
}: AssertSafeTestDatabaseInput): void {
  if (testUrl === undefined || testUrl === null || testUrl.trim() === "") {
    throw new Error("TEST_DATABASE_URL tidak diset");
  }

  let testDbName: string;
  try {
    testDbName = databaseNameFromUrl(testUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL bukan URL yang valid");
  }

  if (!testDbName.endsWith("_test")) {
    throw new Error(
      `TEST_DATABASE_URL harus menunjuk database berakhiran _test, got: ${testDbName}`,
    );
  }

  if (devUrl !== undefined && devUrl !== null && devUrl.trim() !== "") {
    let devDbName: string;
    try {
      devDbName = databaseNameFromUrl(devUrl);
    } catch {
      throw new Error("DATABASE_URL bukan URL yang valid");
    }

    if (testDbName === devDbName) {
      throw new Error(
        `TEST_DATABASE_URL tidak boleh sama dengan DATABASE_URL (${testDbName})`,
      );
    }
  }
}
