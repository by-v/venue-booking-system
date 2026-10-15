import { requireAdminSession } from "@/modules/auth";

export default async function AdminPage() {
  await requireAdminSession();
  return <div>Admin</div>;
}
