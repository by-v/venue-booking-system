"use client";

import { Button } from "./Button";

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Terjadi kesalahan saat memuat data.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-md border border-gray-300 bg-white px-6 py-12 text-center"
    >
      <p className="text-base font-semibold text-ink">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Coba Lagi
      </Button>
    </div>
  );
}
