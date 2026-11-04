import { todayInJakarta } from "@/modules/availability/dates";
import { resolveMonth } from "@/modules/availability/schema";
import { requireAdminSession } from "@/modules/auth";
import { getDashboardData } from "@/modules/reservation/queries";

import { DashboardView } from "./dashboard-view";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  await requireAdminSession();

  const { bulan } = await searchParams;
  const month = resolveMonth(bulan, todayInJakarta());
  const data = await getDashboardData(month);

  return <DashboardView data={data} />;
}
