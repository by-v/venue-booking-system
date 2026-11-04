import { describe, expect, it } from "vitest";

import { maskCustomerName } from "@/modules/reservation/masking";

describe("penyamaran nama customer", () => {
  it("menyamarkan setiap kata dengan huruf awal yang dipertahankan", () => {
    expect(maskCustomerName("Budi Santoso")).toBe("B*** S***");
  });

  it("menyamarkan nama satu kata", () => {
    expect(maskCustomerName("Siti")).toBe("S***");
  });

  it("menormalkan spasi berlebih dan spasi di ujung", () => {
    expect(maskCustomerName("  Budi   Santoso  ")).toBe("B*** S***");
  });

  it("mengembalikan penanda aman untuk nama kosong", () => {
    expect(maskCustomerName("")).toBe("***");
    expect(maskCustomerName("   ")).toBe("***");
  });
});
