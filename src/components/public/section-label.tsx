import type { ReactNode } from "react";

export interface SectionLabelProps {
  children: ReactNode;
  /** `light` untuk latar krem, `dark` untuk latar gelap. */
  tone?: "light" | "dark";
  className?: string;
}

/** Eyebrow kecil bergaya editorial (huruf kapital, spasi lebar). */
export function SectionLabel({
  children,
  tone = "light",
  className = "",
}: SectionLabelProps) {
  const toneClass = tone === "dark" ? "text-gold-500" : "text-gold-700";

  return (
    <p
      className={`text-[10px] font-medium uppercase tracking-[0.24em] ${toneClass} ${className}`.trim()}
    >
      {children}
    </p>
  );
}
