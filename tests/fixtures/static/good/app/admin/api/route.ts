import { getAdminSessionOrNull } from "@/modules/auth";

export async function GET() {
  const session = await getAdminSessionOrNull();
  return Response.json({ ok: session !== null });
}
