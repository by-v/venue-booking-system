import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`ui-card rounded-md bg-white p-6 shadow-sm ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}
