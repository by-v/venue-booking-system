import { describe, expect, it } from "vitest";
import { describeDatabaseTarget } from "@/modules/auth/describe-database-target";

// Nilai sintetis: TIDAK ada kredensial nyata di berkas ini.
const USER = "app_user";
const PASSWORD = "S3cretPwTidakBocor";

describe("describeDatabaseTarget", () => {
  it("mengembalikan host dengan port dan nama database saja", () => {
    const output = describeDatabaseTarget(
      `postgresql://${USER}:${PASSWORD}@db.example.com:5432/venue_booking`,
    );

    expect(output).toBe("db.example.com:5432 / venue_booking");
  });

  it("mengembalikan host tanpa port bila port tidak ada", () => {
    const output = describeDatabaseTarget(
      `postgresql://${USER}:${PASSWORD}@localhost/venue_booking_test`,
    );

    expect(output).toBe("localhost / venue_booking_test");
  });

  it("tidak pernah menampilkan user atau password (URL valid)", () => {
    const output = describeDatabaseTarget(
      `postgresql://${USER}:${PASSWORD}@db.example.com:5432/venue_booking`,
    );

    expect(output).not.toContain(USER);
    expect(output).not.toContain(PASSWORD);
  });

  it("mengembalikan pesan generik untuk URL tidak valid tanpa menyalin URL", () => {
    const invalid = `bukan-url postgresql://${USER}:${PASSWORD}@localhost:5432/venue_booking`;
    const output = describeDatabaseTarget(invalid);

    expect(output).toBe("URL database tidak valid");
    expect(output).not.toContain(USER);
    expect(output).not.toContain(PASSWORD);
    expect(output).not.toContain("localhost");
    expect(output).not.toContain(invalid);
  });

  it("tidak pernah menampilkan user atau password saat URL tidak valid", () => {
    const output = describeDatabaseTarget(
      `://${USER}:${PASSWORD}@@@:5432/`,
    );

    expect(output).not.toContain(USER);
    expect(output).not.toContain(PASSWORD);
  });

  it("mengembalikan pesan generik bila nama database kosong", () => {
    const output = describeDatabaseTarget(
      `postgresql://${USER}:${PASSWORD}@localhost:5432`,
    );

    expect(output).toBe("URL database tidak valid");
    expect(output).not.toContain(PASSWORD);
  });
});
