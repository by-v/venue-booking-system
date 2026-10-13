import { describe, expect, it } from "vitest";
import { assertSafeTestDatabase } from "./helpers/assert-safe-test-db";

// Tes murni: memanggil `assertSafeTestDatabase` dengan input eksplisit,
// tanpa memuat harness (env/load-env).
const devUrl = "postgresql://app_user:secret@localhost:5432/venue_booking";
const testUrl =
  "postgresql://app_user:secret@localhost:5432/venue_booking_test";

describe("assertSafeTestDatabase", () => {
  it("menolak bila TEST_DATABASE_URL tidak diset", () => {
    expect(() =>
      assertSafeTestDatabase({ testUrl: undefined, devUrl }),
    ).toThrow(/TEST_DATABASE_URL tidak diset/);
    expect(() => assertSafeTestDatabase({ testUrl: "", devUrl })).toThrow(
      /TEST_DATABASE_URL tidak diset/,
    );
    expect(() => assertSafeTestDatabase({ testUrl: null, devUrl })).toThrow(
      /TEST_DATABASE_URL tidak diset/,
    );
  });

  it("menolak database yang tidak berakhiran _test", () => {
    expect(() =>
      assertSafeTestDatabase({ testUrl: devUrl, devUrl }),
    ).toThrow(/_test/);
  });

  it("menolak database uji yang sama dengan database dev", () => {
    expect(() =>
      assertSafeTestDatabase({ testUrl, devUrl: testUrl }),
    ).toThrow(/sama dengan/);
  });

  it("menerima database uji yang aman (kontrol)", () => {
    expect(() => assertSafeTestDatabase({ testUrl, devUrl })).not.toThrow();
  });
});
