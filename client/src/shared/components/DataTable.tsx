import * as React from 'react';
import { cn } from '../utils/cn';

export interface Column<T> {
    header: string;
    accessorKey: keyof T | string;
    cell?: (row: T) => React.ReactNode;
    width?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    selectable?: boolean;
    selectedRows?: string[];
    onRowSelect?: (selectedIds: string[]) => void;
    onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string }>({
    columns,
    data,
    selectable = false,
    selectedRows = [],
    onRowSelect,
    onRowClick,
}: DataTableProps<T>) {
    const handleSelectAll = (checked: boolean) => {
        if (onRowSelect) {
            onRowSelect(checked ? data.map((row) => row.id) : []);
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        if (onRowSelect) {
            const newSelected = checked
                ? [...selectedRows, id]
                : selectedRows.filter((rowId) => rowId !== id);
            onRowSelect(newSelected);
        }
    };

    const allSelected = data.length > 0 && selectedRows.length === data.length;
    const someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

    const getValue = (row: T, key: keyof T | string) => {
        if (typeof key === 'string' && key.includes('.')) {
            // Handle nested keys like "customer.name"
            return key.split('.').reduce((obj: any, k) => obj?.[k], row);
        }
        return row[key as keyof T];
    };

    return (
        <div className="w-full overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                        {selectable && (
                            <th className="px-4 py-3 text-left w-12">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={(el) => {
                                        if (el) el.indeterminate = someSelected;
                                    }}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                            </th>
                        )}
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                className={cn(
                                    "px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider",
                                    column.width
                                )}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                    {data.map((row) => (
                        <tr
                            key={row.id}
                            onClick={() => onRowClick?.(row)}
                            className={cn(
                                "hover:bg-[var(--bg-secondary)] transition-colors",
                                onRowClick && "cursor-pointer"
                            )}
                        >
                            {selectable && (
                                <td className="px-4 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.includes(row.id)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            handleSelectRow(row.id, e.target.checked);
                                        }}
                                        className="rounded border-gray-300"
                                    />
                                </td>
                            )}
                            {columns.map((column, colIndex) => (
                                <td key={colIndex} className="px-4 py-4">
                                    {column.cell
                                        ? column.cell(row)
                                        : String(getValue(row, column.accessorKey) ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
