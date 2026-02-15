'use client';
import React, { useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { TableSkeleton } from '@/src/components/ui/data/Skeleton';

interface DataTableProps<T> {
    columns: {
        header: string;
        accessorKey: keyof T | ((row: T) => React.ReactNode) | string;
        cell?: (row: T) => React.ReactNode;
        width?: string;
        /** When true, column stays visible (sticky right) when table scrolls horizontally */
        stickyRight?: boolean;
    }[];
    data: T[];
    searchKey?: keyof T;
    onSearch?: (value: string) => void;
    isLoading?: boolean;
    onRowClick?: (row: T) => void;
    // Server-side props
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSort?: (key: string) => void;
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        onPageChange: (page: number) => void;
    };
    disablePagination?: boolean; // Disable internal pagination when parent handles it
}

export const DataTable = React.memo(DataTableComponent) as typeof DataTableComponent;

function DataTableComponent<T extends { id?: string | number; _id?: string }>({
    columns,
    data,
    searchKey,
    onSearch,
    isLoading,
    onRowClick,
    sortBy,
    sortOrder,
    onSort,
    pagination,
    disablePagination = false
}: DataTableProps<T>) {
    // Client-side state fallback
    const [localSortConfig, setLocalSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [localCurrentPage, setLocalCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Determine current sort state
    const currentSortKey = sortBy || localSortConfig?.key;
    const currentSortDirection = sortOrder || localSortConfig?.direction;

    // Helper to get unique key for each row
    const getRowKey = (row: T, index: number): string | number => {
        return (row as any).id ?? (row as any)._id ?? index;
    };

    // Client-side sorting logic (only if onSort is NOT provided)
    const processedData = React.useMemo(() => {
        if (onSort) return data; // Server-side sorting, data is already sorted

        let sorted = [...data];
        if (localSortConfig) {
            sorted.sort((a, b) => {
                const aValue = a[localSortConfig.key as keyof T];
                const bValue = b[localSortConfig.key as keyof T];
                if (aValue < bValue) return localSortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return localSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [data, localSortConfig, onSort]);

    // Client-side pagination logic (only if pagination prop is NOT provided AND not disabled)
    const displayData = React.useMemo(() => {
        if (pagination || disablePagination) return processedData; // Server-side pagination or disabled

        const start = (localCurrentPage - 1) * itemsPerPage;
        return processedData.slice(start, start + itemsPerPage);
    }, [processedData, localCurrentPage, pagination, disablePagination]);

    const handleHeaderClick = (key: string) => {
        if (onSort) {
            onSort(key); // Trigger server-side sort
        } else {
            // Client-side sort toggle
            let direction: 'asc' | 'desc' = 'asc';
            if (localSortConfig && localSortConfig.key === key && localSortConfig.direction === 'asc') {
                direction = 'desc';
            }
            setLocalSortConfig({ key, direction });
        }
    };

    // Pagination helpers
    const currentPage = pagination?.currentPage || localCurrentPage;
    const totalPages = pagination?.totalPages || Math.ceil(processedData.length / itemsPerPage);
    const totalItems = pagination?.totalItems || data.length;
    const handlePageChange = pagination?.onPageChange || setLocalCurrentPage;

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
                            <tr>
                                {columns.map((col, idx) => {
                                    const isSortable = typeof col.accessorKey === 'string';
                                    const isSorted = currentSortKey === col.accessorKey;

                                    return (
                                        <th
                                            key={idx}
                                            className={cn(
                                                "px-5 py-3 font-medium text-[var(--text-muted)] whitespace-nowrap select-none",
                                                col.width,
                                                isSortable ? "cursor-pointer hover:bg-[var(--bg-hover)] transition-colors group" : "",
                                                col.stickyRight && "sticky right-0 z-20 bg-[var(--bg-secondary)] shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]"
                                            )}
                                            onClick={() => isSortable && handleHeaderClick(col.accessorKey as string)}
                                        >
                                            <div className="flex items-center space-x-1">
                                                <span className={isSorted ? "text-[var(--primary-blue)]" : ""}>{col.header}</span>
                                                {isSortable && (
                                                    <span className="flex flex-col justify-center h-3 w-3">
                                                        {isSorted ? (
                                                            currentSortDirection === 'asc' ?
                                                                <ArrowUp className="w-3 h-3 text-[var(--primary-blue)]" /> :
                                                                <ArrowDown className="w-3 h-3 text-[var(--primary-blue)]" />
                                                        ) : (
                                                            <ArrowUpDown className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-50 transition-opacity" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length} className="p-0">
                                        <TableSkeleton
                                            rows={pagination ? 10 : 5}
                                            columns={columns.length}
                                            showHeader={false}
                                        />
                                    </td>
                                </tr>
                            ) : displayData.length > 0 ? (
                                displayData.map((row, idx) => (
                                    <tr
                                        key={getRowKey(row, idx)}
                                        className={`group hover:bg-[var(--bg-hover)] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                        onClick={() => onRowClick?.(row)}
                                    >
                                        {columns.map((col, colIdx) => (
                                            <td
                                                key={colIdx}
                                                className={cn(
                                                    "px-5 py-3 text-[var(--text-primary)]",
                                                    col.stickyRight && "sticky right-0 z-10 bg-[var(--bg-primary)] group-hover:bg-[var(--bg-hover)] shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]"
                                                )}
                                            >
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
            {!disablePagination && totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-[var(--text-muted)]">
                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
                        <span className="font-medium">{totalItems}</span> results
                    </p>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1 || isLoading}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages || isLoading}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
