import { notFound } from "next/navigation";

import { requireAdminSession } from "@/modules/auth";
import { getMonthCalendarGrid } from "@/modules/calendar/queries";

import { MonthDetailView } from "./month-detail-view";

export const dynamic = "force-dynamic";

export default async function KalenderMonthPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  await requireAdminSession();

  const { year, month } = await params;
  const yearNumber = Number(year);
  const monthNumber = Number(month);

  if (
    !Number.isInteger(yearNumber) ||
    yearNumber < 2000 ||
    yearNumber > 2100 ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    notFound();
  }

  const monthString = `${yearNumber}-${String(monthNumber).padStart(2, "0")}`;
  const { days, stats, today } = await getMonthCalendarGrid(monthString);

  return (
    <MonthDetailView
      year={yearNumber}
      month={monthNumber}
      days={days}
      stats={stats}
      today={today}
    />
  );
}
