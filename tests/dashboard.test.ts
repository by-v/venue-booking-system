// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminPage from "@/app/admin/page";

describe("halaman dashboard /admin", () => {
  it("menampilkan dashboard kosong", () => {
    render(createElement(AdminPage));
    expect(screen.getByText("Admin Dashboard")).toBeTruthy();
  });
});
