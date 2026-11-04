/**
 * Ikon garis untuk sidebar admin. Tidak memakai pustaka ikon (TDR D9).
 * Ukuran mengikuti `className`; warna mengikuti `currentColor`.
 */

export interface AdminIconProps {
  className?: string;
}

function iconClass(className = ""): string {
  return `h-6 w-6 ${className}`.trim();
}

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function DashboardIcon({ className = "" }: AdminIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      {...strokeProps}
      className={iconClass(className)}
    >
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </svg>
  );
}

export function ReservationIcon({ className = "" }: AdminIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      {...strokeProps}
      className={iconClass(className)}
    >
      <path d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V6A1.5 1.5 0 0 1 7 4.5Z" />
      <path d="M8.5 4.5V7h7V4.5" />
      <path d="M8.5 11h7" />
      <path d="M8.5 14.5h7" />
      <path d="M8.5 18h4" />
    </svg>
  );
}

export function PackageIcon({ className = "" }: AdminIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      {...strokeProps}
      className={iconClass(className)}
    >
      <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z" />
      <path d="M4 8l8 4.5L20 8" />
      <path d="M12 12.5V20.5" />
    </svg>
  );
}

export function VenueIcon({ className = "" }: AdminIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      {...strokeProps}
      className={iconClass(className)}
    >
      <path d="M4 20V9l8-4 8 4v11" />
      <path d="M3 20h18" />
      <path d="M8.5 20v-4.5a3.5 3.5 0 0 1 7 0V20" />
    </svg>
  );
}

export function CalendarIcon({ className = "" }: AdminIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      {...strokeProps}
      className={iconClass(className)}
    >
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3.5V6.5" />
      <path d="M16 3.5V6.5" />
      <path d="M8 13h2" />
      <path d="M14 13h2" />
      <path d="M8 16.5h2" />
      <path d="M14 16.5h2" />
    </svg>
  );
}

export function GalleryIcon({ className = "" }: AdminIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      {...strokeProps}
      className={iconClass(className)}
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
    </svg>
  );
}

export function SettingsIcon({ className = "" }: AdminIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      {...strokeProps}
      className={iconClass(className)}
    >
      <path d="M4 7h7" />
      <path d="M15 7h5" />
      <circle cx="13" cy="7" r="2" />
      <path d="M4 17h5" />
      <path d="M13 17h7" />
      <circle cx="11" cy="17" r="2" />
    </svg>
  );
}

export function LogoutIcon({ className = "" }: AdminIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      {...strokeProps}
      className={iconClass(className)}
    >
      <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" />
      <path d="M12 12h8" />
      <path d="m17 8.5 3.5 3.5-3.5 3.5" />
    </svg>
  );
}
