import { getAdminSessionOrNull } from "@/modules/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
