import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowUpRight } from "./icons";

export type PublicButtonVariant = "solid" | "outline";

export interface PublicButtonProps {
  href: string;
  children: ReactNode;
  variant?: PublicButtonVariant;
  /** Tautan keluar (mis. wa.me) memakai `<a>` dengan rel noreferrer. */
  external?: boolean;
  withArrow?: boolean;
  className?: string;
}

const base =
  "inline-flex items-center justify-center gap-2 border px-5 py-3 text-xs font-medium tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const variantClasses: Record<PublicButtonVariant, string> = {
  solid:
    "border-gold-500 bg-gold-500 text-ink hover:border-gold-700 hover:bg-gold-700 hover:text-white",
  outline:
    "border-gold-500/70 bg-transparent text-ivory hover:border-gold-500 hover:bg-gold-500 hover:text-ink",
};

export function PublicButton({
  href,
  children,
  variant = "solid",
  external = false,
  withArrow = false,
  className = "",
}: PublicButtonProps) {
  const classes = `${base} ${variantClasses[variant]} ${className}`.trim();
  const content = (
    <>
      {children}
      {withArrow ? <ArrowUpRight /> : null}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
