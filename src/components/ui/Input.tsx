import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = "", ...rest }: InputProps) {
  const fieldId = id ?? rest.name;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={fieldId} className="text-sm font-medium text-ink">
          {label}
        </label>
      ) : null}
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`rounded-md border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-gray-600 focus:border-gold-500 disabled:cursor-not-allowed disabled:bg-gray-300/40 ${
          error ? "border-red-500" : "border-gray-300"
        } ${className}`.trim()}
        {...rest}
      />
      {error ? (
        <span id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
