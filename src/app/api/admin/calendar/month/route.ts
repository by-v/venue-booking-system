import { NextResponse } from "next/server";
import { getMonthCalendarDetail } from "@/modules/calendar/queries";
import { requireAdminSession } from "@/modules/auth";

export async function GET(request: Request) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month format. Expected YYYY-MM" },
        { status: 400 }
      );
    }

    const days = await getMonthCalendarDetail(month);

    return NextResponse.json({ days });
  } catch (error) {
    console.error("Error fetching month calendar:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}
