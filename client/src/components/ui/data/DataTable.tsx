'use client';
import React, { useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { TableSkeleton } from '@/src/components/ui/data/Skeleton';

// Since we cannot rely on shadcn's table being present, I will create a simple Tailwind Table implementation inside this file
// or better, I will implement the logic directly if I don't use tanstack table, 
// BUT the prompt asked for "Product Ready", "Visual Polish". 
// A custom manual table component is safer than assuming Tanstack table is installed if I can't check package.json.
// However, standard Next.js stacks usually have it. 
// Given the timeline (1 hour), I'll build a custom simple robust table component without heavy externaldeps if unsure.
// Wait, prompt says "Tech Stack: ... React 19". It doesn't explicitly list tanstack table.
// I'll stick to a pure React implementation for the DataTable to avoid dependency issues.

interface DataTableProps<T> {
    columns: {
        header: string;
        accessorKey: keyof T | ((row: T) => React.ReactNode) | string;
        cell?: (row: T) => React.ReactNode;
        width?: string;
    }[];
    data: T[];
    searchKey?: keyof T;
    onSearch?: (value: string) => void;
    isLoading?: boolean;
    onRowClick?: (row: T) => void;
}

export const DataTable = React.memo(DataTableComponent) as typeof DataTableComponent;

function DataTableComponent<T extends { id?: string | number; _id?: string }>({
    columns,
    data,
    searchKey,
    onSearch,
    isLoading,
    onRowClick
}: DataTableProps<T>) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Helper to get unique key for each row (supports both id and _id)
    const getRowKey = (row: T, index: number): string | number => {
        return (row as any).id ?? (row as any)._id ?? index;
    };

    const sortedData = [...data].sort((a, b) => {
        if (!sortConfig) return 0;
        const aValue = a[sortConfig.key as keyof T];
        const bValue = b[sortConfig.key as keyof T];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                            <tr>
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className={cn(
                                            "px-5 py-3 font-medium text-[var(--text-muted)] whitespace-nowrap",
                                            col.width,
                                            typeof col.accessorKey === 'string' ? "cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" : ""
                                        )}
                                        onClick={() => typeof col.accessorKey === 'string' && handleSort(col.accessorKey as string)}
                                    >
                                        <div className="flex items-center space-x-1">
                                            <span>{col.header}</span>
                                            {typeof col.accessorKey === 'string' && (
                                                <ArrowUpDown className="w-3 h-3 text-[var(--text-muted)]" />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length} className="p-0">
                                        <TableSkeleton
                                            rows={5}
                                            columns={columns.length}
                                            showHeader={false}
                                        />
                                    </td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((row, idx) => (
                                    <tr
                                        key={getRowKey(row, idx)}
                                        className={`hover:bg-[var(--bg-hover)] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                        onClick={() => onRowClick?.(row)}
                                    >
                                        {columns.map((col, idx) => (
                                            <td key={idx} className="px-5 py-3 text-[var(--text-primary)]">
                                                {col.cell ? col.cell(row) : ((row as any)[col.accessorKey as string] as React.ReactNode)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="px-5 py-12 text-center text-[var(--text-muted)]">
                                        No results found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2">
                <p className="text-sm text-[var(--text-muted)]">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, data.length)}</span> of{' '}
                    <span className="font-medium">{data.length}</span> results
                </p>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
