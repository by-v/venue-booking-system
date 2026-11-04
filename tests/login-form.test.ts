// @vitest-environment jsdom
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const signIn = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { email: signIn } },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(""),
}));

import LoginPage from "@/app/login/page";

afterEach(() => {
  cleanup();
  signIn.mockReset();
  push.mockReset();
});

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
  fireEvent.submit(screen.getByRole("form"));
}

describe("form login", () => {
  it("email tidak valid menampilkan pesan tanpa request ke server", async () => {
    render(createElement(LoginPage));
    fillAndSubmit("bukan-email", "password-uji-123456");

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Format email tidak valid",
      ),
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it("password terlalu pendek ditolak di klien tanpa request ke server", async () => {
    render(createElement(LoginPage));
    fillAndSubmit("admin@example.test", "pendek");

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Password minimal 12 karakter",
      ),
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it("kredensial salah menampilkan pesan galat dari server", async () => {
    signIn.mockResolvedValueOnce({ error: { message: "Invalid email or password" } });
    render(createElement(LoginPage));
    fillAndSubmit("admin@example.test", "password-uji-123456");

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Email atau password salah",
      ),
    );
    expect(signIn).toHaveBeenCalledWith({
      email: "admin@example.test",
      password: "password-uji-123456",
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("status 429 menampilkan pesan khusus pembatasan laju", async () => {
    signIn.mockResolvedValueOnce({
      error: { status: 429, message: "Too many requests" },
    });
    render(createElement(LoginPage));
    fillAndSubmit("admin@example.test", "password-uji-123456");

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Terlalu banyak percobaan login. Silakan coba lagi nanti.",
      ),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("login sukses mengarahkan ke fallback aman /admin", async () => {
    signIn.mockResolvedValueOnce({ error: null });
    render(createElement(LoginPage));
    fillAndSubmit("admin@example.test", "password-uji-123456");

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
  });
});
