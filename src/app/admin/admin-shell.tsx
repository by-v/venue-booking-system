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
      className="neu-button neu-button-ghost flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
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

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className="h-5 w-5"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function AdminShell({ userEmail, children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initial = userEmail.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="admin-neu flex min-h-full flex-1 flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:gap-5 lg:p-6">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Tutup menu admin"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={`neu-sidebar fixed inset-y-4 left-4 z-50 w-64 flex-col p-4 lg:static lg:z-auto lg:flex lg:h-[calc(100vh-3rem)] lg:w-64 lg:shrink-0 ${
          mobileOpen ? "flex" : "hidden"
        }`}
      >
        <Link
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className="neu-raised flex items-center gap-3 px-3 py-3 transition-transform hover:-translate-y-0.5"
        >
          <span className="neu-icon h-11 w-11 shrink-0">
            <LogoMark className="h-6 w-6" />
          </span>
          <span className="min-w-0">
            <span className="font-heading block truncate text-base font-semibold text-ink">
              H.A. Djunaid
            </span>
            <span className="neu-overline mt-0.5 block">Admin venue</span>
          </span>
        </Link>

        <nav aria-label="Menu admin" className="mt-6 flex flex-1 flex-col gap-1.5">
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
                onClick={() => setMobileOpen(false)}
                className={`neu-nav-item group flex items-center gap-3 px-4 py-3 text-sm font-medium ${
                  active ? "text-gold-700" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`neu-icon h-9 w-9 shrink-0 transition-colors ${
                    active ? "text-gold-700" : "text-gray-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">{item.label}</span>
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    active ? "bg-gold-500" : "bg-transparent"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="neu-divider my-4" />
        <LogoutButton />
        <p className="neu-overline mt-4 px-2 text-center">Area admin</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="neu-header flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Buka menu admin"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="neu-icon h-10 w-10 shrink-0 lg:hidden"
            >
              <MenuIcon />
            </button>
            <div className="min-w-0">
              <p className="neu-overline">Panel administrasi</p>
              <p className="truncate text-sm font-semibold text-ink">
                Gedung H.A. Djunaid Convention Center
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[11px] font-medium text-gray-600">
                Masuk sebagai
              </p>
              <p className="max-w-64 truncate text-sm font-medium text-ink">
                {userEmail}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="neu-icon h-10 w-10 font-heading text-sm font-semibold text-gold-700"
            >
              {initial}
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
