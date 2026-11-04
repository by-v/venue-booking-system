// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const signOut = vi.hoisted(() => vi.fn(async () => undefined));
const push = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", () => ({ authClient: { signOut } }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/admin",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { AdminShell } from "@/app/admin/admin-shell";
import { DashboardView } from "@/app/admin/dashboard-view";
import { createTestUser } from "./helpers/create-user";

afterEach(() => {
  cleanup();
  signOut.mockClear();
  push.mockClear();
});

describe("kerangka admin", () => {
  it("hanya menampilkan menu yang punya change", async () => {
    const credentials = await createTestUser();

    render(
      <AdminShell userEmail={credentials.email}>Konten halaman</AdminShell>,
    );

    for (const label of [
      "Dashboard",
      "Reservasi",
      "Kalender",
      "Paket",
      "Venue dan Fasilitas",
      "Galeri",
      "Pengaturan",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeTruthy();
    }

    for (const hidden of ["Pelanggan", "Pembayaran"]) {
      expect(screen.queryByText(hidden)).toBeNull();
    }

    expect(screen.getByText(credentials.email)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Keluar" })).toBeTruthy();
  }, 30000);

  it("tombol Keluar memanggil signOut lalu mengarahkan ke /login", async () => {
    render(<AdminShell userEmail="admin@example.test">Konten halaman</AdminShell>);

    fireEvent.click(screen.getByRole("button", { name: "Keluar" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });

  it("dashboard menampilkan keadaan kosong", () => {
    render(<DashboardView />);

    expect(screen.getByText("Belum ada data")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Coba Lagi" })).toBeNull();
  });

  it("dashboard menampilkan skeleton saat memuat", () => {
    render(<DashboardView status="loading" />);

    expect(screen.getByLabelText("Memuat dashboard")).toBeTruthy();
  });

  it("dashboard menampilkan galat dan Coba Lagi memanggil ulang", () => {
    const onRetry = vi.fn();
    render(<DashboardView status="error" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Coba Lagi" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
