// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", async () => {
  const React = await import("react");
  return {
    default: ({
      src,
      alt,
      ...rest
    }: { src: string; alt: string } & Record<string, unknown>) =>
      React.createElement("img", { src, alt, ...rest }),
  };
});

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({
      href,
      children,
      ...rest
    }: {
      href: string;
      children: React.ReactNode;
    } & Record<string, unknown>) =>
      React.createElement("a", { href, ...rest }, children),
  };
});

import { GalleryBrowser } from "@/app/galeri/gallery-browser";
import GaleriPage from "@/app/galeri/page";
import type { GalleryItem } from "@/modules/venue/types";

function item(override: Partial<GalleryItem> = {}): GalleryItem {
  return {
    id: "test-item",
    title: "Foto Test",
    category: "PERNIKAHAN",
    imagePath: "/test/image.jpg",
    caption: null,
    sortOrder: 0,
    active: true,
    ...override,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("galeri", () => {
  it("menampilkan foto dalam masonry grid tanpa filter", async () => {
    render(
      createElement(GalleryBrowser, {
        items: [
          item({ id: "a", title: "Foto A", caption: "Caption A" }),
          item({ id: "b", title: "Foto B", caption: "Caption B" }),
        ],
      }),
    );

    // Semua foto ditampilkan langsung tanpa filter
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(2);
  });

  it("lightbox menampilkan gambar dan keterangan saat foto diklik", async () => {
    render(
      createElement(GalleryBrowser, {
        items: [
          item({
            id: "a",
            title: "Alfa",
            caption: "Keterangan acara Alfa",
          }),
        ],
      }),
    );

    const photoButton = screen.getAllByRole("button")[0];
    fireEvent.click(photoButton);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Keterangan acara Alfa")).toBeTruthy();
  });

  it("menampilkan keadaan kosong tanpa galat saat tidak ada item aktif", async () => {
    render(await GaleriPage());

    expect(screen.getByText("Belum ada foto")).toBeTruthy();
  });
});
