"use client";

import Image from "next/image";
import { useEffect } from "react";
import { Modal } from "./Modal";

export interface LightboxProps {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  caption?: string;
  onNext?: () => void;
  onPrev?: () => void;
}

/**
 * Lightbox galeri: gambar dengan keterangan dan navigasi keyboard (ui-spec 4.1).
 * Gambar dari `public/` atau URL (TDR D7).
 */
export function Lightbox({ open, onClose, src, alt, caption, onNext, onPrev }: LightboxProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && onNext) {
        onNext();
      } else if (e.key === "ArrowLeft" && onPrev) {
        onPrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onNext, onPrev, onClose]);

  return (
    <Modal open={open} onClose={onClose} title={alt}>
      <div className="relative">
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={800}
          className="h-auto w-full rounded-md"
        />
        
        {onPrev ? (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 p-3 text-white transition-colors hover:bg-ink"
            aria-label="Foto sebelumnya"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : null}

        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 p-3 text-white transition-colors hover:bg-ink"
            aria-label="Foto berikutnya"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : null}
      </div>
      {caption ? <p className="mt-3 text-sm text-gray-600">{caption}</p> : null}
    </Modal>
  );
}
