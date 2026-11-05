import { todayInJakarta } from "@/modules/availability/dates";
import { requireAdminSession } from "@/modules/auth";
import { getDashboardData } from "@/modules/reservation/queries";

import { DashboardView } from "./dashboard-view";

function resolveYear(value: string | undefined): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100) {
    return parsed;
  }
  return Number(todayInJakarta().slice(0, 4));
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; agenda?: string }>;
}) {
  await requireAdminSession();

  const { tahun, agenda } = await searchParams;
  const year = resolveYear(tahun);
  const data = await getDashboardData(year, agenda ?? null);

  return <DashboardView data={data} />;
}
