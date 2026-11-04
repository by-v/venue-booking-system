import { notFound } from "next/navigation";
import { requireAdminSession } from "@/modules/auth";
import { getMonthCalendarDetail } from "@/modules/calendar/queries";
import { MonthDetailView } from "./month-detail-view";

export const dynamic = "force-dynamic";

export default async function KalenderSlugPage({ params }: { params: { slug: string[] } }) {
  await requireAdminSession();
  const [year, month] = params.slug;

  if (!year || !month) notFound();

  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) notFound();

  const monthStr = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
  const days = await getMonthCalendarDetail(monthStr);

  // Calculate statistics
  const stats = {
    total: 0,
    diterima: 0,
    pending: 0,
    dibatalkan: 0,
  };

  days.forEach((day) => {
    if (day.reservationCount > 0) {
      stats.total += day.reservationCount;
      if (day.status === "DITERIMA") stats.diterima += day.reservationCount;
      else if (day.status === "PENDING") stats.pending += day.reservationCount;
      else if (day.status === "DIBATALKAN") stats.dibatalkan += day.reservationCount;
    }
  });

  return (
    <MonthDetailView
      year={yearNum}
      month={monthNum}
      days={days}
      stats={stats}
    />
  );
}