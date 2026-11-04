import { ReservationError } from "@/modules/reservation/errors";
import { submitReservation } from "@/modules/reservation/mutations";
import {
  consumeSubmissionLimit,
  RateLimitError,
} from "@/modules/reservation/rate-limit";
import { getClientIp, hashClientIp } from "@/modules/reservation/request-ip";
import { reservationSubmissionSchema } from "@/modules/reservation/schema";

/**
 * Pengajuan reservasi publik (design D6). Route handler, bukan Server Action,
 * agar tidak memakai helper admin. Respons sukses tidak memuat id internal
 * atau nomor booking.
 */

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Data pengajuan tidak valid." }, 400);
  }

  const parsed = reservationSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "Data pengajuan tidak valid." }, 400);
  }

  try {
    const ip = getClientIp(request.headers);
    await consumeSubmissionLimit({ key: hashClientIp(ip) });
    await submitReservation(parsed.data);

    return json({ ok: true }, 201);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, 429);
    }
    if (error instanceof ReservationError) {
      return json({ error: "Tanggal atau paket tidak tersedia." }, 400);
    }
    return json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      500,
    );
  }
}
