import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowUpRight } from "./icons";

export interface ArrowLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

/** Tautan teks emas dengan panah, dipakai sebagai ajakan sekunder. */
export function ArrowLink({ href, children, className = "" }: ArrowLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 text-sm font-medium text-gold-700 transition-colors hover:text-ink ${className}`.trim()}
    >
      {children}
      <ArrowUpRight />
    </Link>
  );
}
