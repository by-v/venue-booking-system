import type { SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({
  label,
  error,
  id,
  className = "",
  children,
  ...rest
}: SelectProps) {
  const fieldId = id ?? rest.name;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={fieldId} className="text-sm font-medium text-ink">
          {label}
        </label>
      ) : null}
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`rounded-md border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-gold-500 disabled:cursor-not-allowed disabled:bg-gray-300/40 ${
          error ? "border-red-500" : "border-gray-300"
        } ${className}`.trim()}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <span id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}
