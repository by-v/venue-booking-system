import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="ui-empty flex flex-col items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white/60 px-6 py-12 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-gray-600">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
