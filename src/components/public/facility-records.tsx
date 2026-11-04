import type { FacilityWithPackages, Package } from "@/modules/venue/types";

export interface FacilityRecordsProps {
  facilities: FacilityWithPackages[];
  packages: Package[];
}

/**
 * Daftar fasilitas dalam layout grid minimalis dengan ikon dan label singkat.
 */
export function FacilityRecords({
  facilities,
}: FacilityRecordsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {facilities.map((facility) => (
        <div
          key={facility.id}
          className="flex items-center gap-3 rounded-lg border border-line-light bg-white p-4 transition-colors hover:border-gold-500"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-100 text-xl">
            {getFacilityIcon(facility.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {facility.name}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper untuk mapping icon berdasarkan nama fasilitas
function getFacilityIcon(name: string): string {
  const lower = name.toLowerCase();
  
  if (lower.includes("kursi") || lower.includes("tempat duduk")) return "🪑";
  if (lower.includes("meja")) return "🍽️";
  if (lower.includes("sound") || lower.includes("audio")) return "🎵";
  if (lower.includes("light") || lower.includes("cahaya")) return "💡";
  if (lower.includes("ac") || lower.includes("pendingin")) return "❄️";
  if (lower.includes("toilet") || lower.includes("kamar mandi")) return "🚻";
  if (lower.includes("parkir")) return "🅿️";
  if (lower.includes("panggung") || lower.includes("stage")) return "🎤";
  if (lower.includes("wifi") || lower.includes("internet")) return "📡";
  if (lower.includes("catering") || lower.includes("makanan")) return "🍽️";
  if (lower.includes("dekorasi")) return "🎨";
  if (lower.includes("foto") || lower.includes("kamera")) return "📸";
  
  return "✨"; // Default icon
}
