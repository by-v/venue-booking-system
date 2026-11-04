"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { LogoMark } from "@/components/public/icons";
import { authClient } from "@/lib/auth-client";

import {
  CalendarIcon,
  DashboardIcon,
  GalleryIcon,
  LogoutIcon,
  PackageIcon,
  ReservationIcon,
  SettingsIcon,
  VenueIcon,
  type AdminIconProps,
} from "./admin-icons";

/**
 * Tombol logout klien (Tombol logout mengakhiri sesi). Memanggil
 * `authClient.signOut()` lalu mengarahkan ke `/login`. Tampil sebagai ikon
 * dengan label aksesibel "Keluar".
 */
export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut(): Promise<void> {
    setLoading(true);
    try {
      await authClient.signOut();
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      aria-busy={loading || undefined}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-ivory/60 transition-colors hover:bg-ink-soft hover:text-ivory disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogoutIcon />
      <span>{loading ? "Keluar…" : "Keluar"}</span>
    </button>
  );
}

interface AdminNavItem {
  href: string;
  label: string;
  Icon: (props: AdminIconProps) => React.ReactElement;
}

// Hanya fitur yang punya change yang ditampilkan (ui-spec bagian 4.2).
const NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", Icon: DashboardIcon },
  {
    href: "/admin/reservasi",
    label: "Reservasi",
    Icon: ReservationIcon,
  },
  { href: "/admin/kalender", label: "Kalender", Icon: CalendarIcon },
  { href: "/admin/paket", label: "Paket", Icon: PackageIcon },
  { href: "/admin/venue", label: "Venue dan Fasilitas", Icon: VenueIcon },
  { href: "/admin/galeri", label: "Galeri", Icon: GalleryIcon },
  { href: "/admin/pengaturan", label: "Pengaturan", Icon: SettingsIcon },
];

export interface AdminShellProps {
  userEmail: string;
  children: React.ReactNode;
}

export function AdminShell({ userEmail, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1">
      <aside className="flex w-60 shrink-0 flex-col bg-ink px-4 py-5 text-white">
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-2xl bg-gold-500 px-4 py-3 text-ink transition-colors hover:bg-gold-100"
        >
          <LogoMark className="h-7 w-7" />
          <span className="font-heading text-lg font-semibold">H.A. Djunaid</span>
        </Link>

        <nav
          aria-label="Menu admin"
          className="mt-8 flex flex-1 flex-col gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
            const Icon = item.Icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-ink-soft text-gold-500"
                    : "text-ivory/60 hover:bg-ink-soft hover:text-ivory"
                }`}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute -left-4 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-gold-500"
                  />
                ) : null}
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line-dark pt-4">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-300 bg-white px-6 py-4">
          <span className="text-sm text-gray-600">{userEmail}</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
