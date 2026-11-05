import type { ReactNode } from "react";

export type BadgeStatus = "pending" | "accepted" | "suspended" | "cancelled";

export interface BadgeProps {
  status: BadgeStatus;
  children?: ReactNode;
  className?: string;
}

const statusClasses: Record<BadgeStatus, string> = {
  pending: "bg-status-pending",
  accepted: "bg-status-accepted",
  suspended: "bg-status-suspended",
  cancelled: "bg-status-cancelled",
};

export function Badge({ status, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`ui-badge inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-ink ${statusClasses[status]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
