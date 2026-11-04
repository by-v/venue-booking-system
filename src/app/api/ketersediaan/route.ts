import { z } from "zod";

import { getPublicAvailability } from "@/modules/availability/queries";
import { monthSchema } from "@/modules/availability/schema";

/**
 * Ketersediaan publik (design D6). Respons hanya memuat tanggal dan status;
 * jenis kunci, id reservasi, dan setup paket tidak pernah keluar dari sini.
 */

const availabilityQuerySchema = z.object({
  packageId: z.string().trim().min(1, "Paket wajib dipilih"),
  bulan: monthSchema,
});

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    packageId: searchParams.get("packageId") ?? "",
    bulan: searchParams.get("bulan") ?? "",
  });

  if (!parsed.success) {
    return json({ error: "Parameter tidak valid." }, 400);
  }

  const days = await getPublicAvailability({
    packageId: parsed.data.packageId,
    month: parsed.data.bulan,
  });

  return json({ days });
}
