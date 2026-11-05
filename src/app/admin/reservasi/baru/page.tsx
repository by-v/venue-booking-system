import { Card } from "@/components/ui";
import { requireAdminSession } from "@/modules/auth";
import { todayInJakarta } from "@/modules/availability/dates";
import { listActivePackageSummaries } from "@/modules/venue/queries";

import { AdminPageHeader } from "../../admin-page-header";
import { createAdminReservation } from "../actions";
import { DirectEntryForm } from "./direct-entry-form";

const ERROR_MESSAGES: Record<string, string> = {
  PACKAGE_UNAVAILABLE: "Paket tidak tersedia.",
  DATE_NOT_BOOKABLE: "Tanggal tidak dapat dipesan.",
  INPUT_TIDAK_VALID: "Input tidak valid. Periksa kembali isian Anda.",
};

function errorMessage(code: string | undefined): string | null {
  if (!code) {
    return null;
  }
  return ERROR_MESSAGES[code] ?? "Terjadi kesalahan. Coba lagi.";
}

/**
 * Halaman input reservasi langsung oleh admin (design D7/D8). Hanya paket
 * aktif dan tanggal hari ini WIB yang ditampilkan; validasi dan penulisan
 * sebenarnya terjadi di Server Action.
 */
export default async function ReservasiBaruPage({
  searchParams,
}: {
  searchParams?: Promise<{ galat?: string }>;
}) {
  await requireAdminSession();

  const { galat } = (await searchParams) ?? {};
  const packages = await listActivePackageSummaries();
  const today = todayInJakarta();
  const bannerMessage = errorMessage(galat);

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        overline="Input manual"
        title="Input reservasi"
        description="Buat reservasi atas nama customer. Simpan sebagai menunggu, atau langsung terima bila syarat konfirmasi terpenuhi."
        backHref="/admin/reservasi"
        backLabel="Kembali ke daftar reservasi"
      />

      <Card>
        <DirectEntryForm
          packages={packages}
          today={today}
          errorMessage={bannerMessage}
          action={createAdminReservation}
        />
      </Card>
    </div>
  );
}
