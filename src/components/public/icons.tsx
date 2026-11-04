/**
 * Ikon garis kecil untuk halaman publik. Tidak memakai pustaka ikon
 * (TDR D9: Tailwind + komponen sendiri).
 */

export interface IconProps {
  className?: string;
}

export function ArrowUpRight({ className = "" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="square"
      className={`h-3.5 w-3.5 ${className}`.trim()}
    >
      <path d="M4.5 11.5 11.5 4.5" />
      <path d="M5.5 4.5h6v6" />
    </svg>
  );
}

export function MapPin({ className = "" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function Phone({ className = "" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
    </svg>
  );
}

export function LogoMark({ className = "" }: IconProps) {  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 468 468"
      fill="currentColor"
      className={className}
    >
      <path d="M114 190C194 131.333 274 131.333 354 190L342 206C270 159.333 198 159.333 126 206L114 190Z" />
      <path d="M186 318V262C186 198 282 198 282 262V318H262V262C262 224 206 224 206 262V318H186Z" />
      <path d="M138 220H178V236H158V318H138V220ZM290 220H330V318H310V236H290V220Z" />
      <path d="M122 330H346V346H122V330Z" />
    </svg>
  );
}
