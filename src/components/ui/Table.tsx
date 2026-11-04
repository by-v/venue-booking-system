import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
}

/**
 * Tabel data dengan kolom Aksi opsional (cukup tambahkan kolom `Aksi`).
 */
export function Table<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "Belum ada data.",
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-300 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-ink text-white">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-left font-medium ${column.className ?? ""}`.trim()}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-gray-600"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)} className="border-t border-gray-300">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 text-ink ${column.className ?? ""}`.trim()}
                  >
                    {column.render ? column.render(row) : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
