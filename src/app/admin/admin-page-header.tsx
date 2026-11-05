import Link from "next/link";
import type { ReactNode } from "react";

export interface AdminPageHeaderProps {
  title: string;
  description?: string;
  overline?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

/**
 * Header halaman admin dengan gaya Neumorphism. Dipakai lintas halaman agar
 * hierarki judul, deskripsi, dan aksi konsisten.
 */
export function AdminPageHeader({
  title,
  description,
  overline = "Panel admin",
  actions,
  backHref,
  backLabel = "Kembali",
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-1">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="neu-button neu-button-ghost mb-3 inline-flex items-center gap-2 px-3 py-2 text-xs font-medium"
          >
            <span aria-hidden="true">←</span>
            {backLabel}
          </Link>
        ) : null}
        <p className="neu-overline">{overline}</p>
        <h1 className="neu-title mt-1 text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
