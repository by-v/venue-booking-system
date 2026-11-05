export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`ui-skeleton animate-pulse rounded-md bg-gray-300 ${className}`.trim()}
    />
  );
}
