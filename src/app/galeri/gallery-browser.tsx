"use client";

import Image from "next/image";
import { useState } from "react";

import { Lightbox } from "@/components/ui";
import type { GalleryItem } from "@/modules/venue/types";

export interface GalleryBrowserProps {
  items: GalleryItem[];
}

/**
 * Galeri masonry interaktif tanpa filter. Foto ditampilkan dalam grid
 * responsive masonry dengan lightbox untuk preview fullscreen.
 */
export function GalleryBrowser({ items }: GalleryBrowserProps) {
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});

  const handleImageLoad = (itemId: string) => {
    setImageLoaded((prev) => ({ ...prev, [itemId]: true }));
  };

  const selectedIndex = selected ? items.findIndex((i) => i.id === selected.id) : -1;

  const handleNext = () => {
    if (selectedIndex < items.length - 1) {
      setSelected(items[selectedIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (selectedIndex > 0) {
      setSelected(items[selectedIndex - 1]);
    }
  };

  return (
    <>
      <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item)}
            className="group relative block w-full overflow-hidden rounded-lg bg-gray-100 transition-all duration-300 hover:shadow-xl"
            style={{
              opacity: imageLoaded[item.id] ? 1 : 0,
              transform: imageLoaded[item.id] ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
            }}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src={item.imagePath}
                alt={item.caption || item.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                onLoad={() => handleImageLoad(item.id)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/0 to-ink/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>

            {item.caption ? (
              <div className="absolute bottom-0 left-0 right-0 translate-y-full p-4 transition-transform duration-300 group-hover:translate-y-0">
                <p className="text-sm font-medium text-white drop-shadow-lg">
                  {item.caption}
                </p>
              </div>
            ) : null}
          </button>
        ))}
      </div>

      {selected ? (
        <Lightbox
          open={true}
          onClose={() => setSelected(null)}
          src={selected.imagePath}
          alt={selected.caption || selected.title}
          caption={selected.caption ?? undefined}
          onNext={selectedIndex < items.length - 1 ? handleNext : undefined}
          onPrev={selectedIndex > 0 ? handlePrev : undefined}
        />
      ) : null}
    </>
  );
}
