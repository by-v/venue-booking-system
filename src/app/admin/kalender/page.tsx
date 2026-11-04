import { requireAdminSession } from "@/modules/auth";
import { getYearCalendarSummary } from "@/modules/calendar/queries";
import { YearOverviewView } from "./year-overview-view";

export const dynamic = "force-dynamic";

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  await requireAdminSession();

  const yearParam = searchParams.year ? parseInt(searchParams.year) : new Date().getFullYear();
  const summaries = await getYearCalendarSummary(yearParam);

  return <YearOverviewView initialYear={yearParam} summaries={summaries} />;
}
