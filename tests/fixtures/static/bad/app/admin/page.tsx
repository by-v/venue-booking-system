import { requireAdminSession } from "@/modules/auth";

// Impor saja TIDAK cukup: pemindai menuntut PEMANGGILAN.
export const helperReference = requireAdminSession;

export default function AdminPage() {
  return <div>Admin</div>;
}
