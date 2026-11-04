// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Badge, Button, ErrorState, Input } from "@/components/ui";

afterEach(() => {
  cleanup();
});

describe("komponen dasar sistem desain", () => {
  it("Button keadaan memuat: aria-busy dan tidak dapat diklik", () => {
    render(createElement(Button, { loading: true }, "Simpan"));

    const button = screen.getByRole("button", {
      name: /simpan/i,
    }) as HTMLButtonElement;
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.disabled).toBe(true);
  });

  it("Button nonaktif tidak dapat diklik", () => {
    render(createElement(Button, { disabled: true }, "Simpan"));

    const button = screen.getByRole("button", {
      name: /simpan/i,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("Input menampilkan pesan galat dan menandai kolom tidak valid", () => {
    render(
      createElement(Input, { id: "nama", label: "Nama", error: "Wajib diisi" }),
    );

    expect(screen.getByRole("alert").textContent).toBe("Wajib diisi");
    expect(screen.getByLabelText("Nama").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });

  it("Badge menampilkan lencana status", () => {
    render(createElement(Badge, { status: "pending" }, "Menunggu"));

    expect(screen.getByText("Menunggu")).toBeTruthy();
  });

  it("ErrorState menampilkan 'Coba Lagi' dan memanggil ulang", () => {
    const onRetry = vi.fn();
    render(createElement(ErrorState, { onRetry }));

    fireEvent.click(screen.getByRole("button", { name: "Coba Lagi" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
