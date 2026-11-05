import { NextResponse } from "next/server";

import { requireAdminSession } from "@/modules/auth";
import { getMonthCalendarGrid } from "@/modules/calendar/queries";

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

    const grid = await getMonthCalendarGrid(month);

    return NextResponse.json(grid);
  } catch (error) {
    console.error("Error fetching month calendar:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}
