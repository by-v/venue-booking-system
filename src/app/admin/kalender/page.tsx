import { redirect } from "next/navigation";

import { requireAdminSession } from "@/modules/auth";
import { todayInJakarta } from "@/modules/availability/dates";
import { getYearCalendarSummary } from "@/modules/calendar/queries";

import { YearOverviewView } from "./year-overview-view";

export const dynamic = "force-dynamic";

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; bulan?: string }>;
}) {
  await requireAdminSession();

  const params = await searchParams;
  const monthParam = params.bulan;

  // Tautan dashboard memakai ?bulan=YYYY-MM. Arahkan ke tampilan bulan penuh.
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [monthYear, monthNumber] = monthParam.split("-");
    redirect(`/admin/kalender/${monthYear}/${monthNumber}`);
  }

  const currentYear = Number(todayInJakarta().slice(0, 4));
  const parsedYear = Number(params.year);
  const yearParam =
    Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : currentYear;
  const summaries = await getYearCalendarSummary(yearParam);

  return <YearOverviewView initialYear={yearParam} summaries={summaries} />;
}
