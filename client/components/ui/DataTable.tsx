import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        accessorKey: keyof T | ((row: T) => React.ReactNode);
        cell?: (row: T) => React.ReactNode;
        width?: string;
    }[];
    data: T[];
    searchKey?: keyof T;
    onSearch?: (value: string) => void;
    isLoading?: boolean;
    onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string | number }>({
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

    const sortedData = [...data].sort((a, b) => {
        if (!sortConfig) return 0;
        //@ts-ignore
        const aValue = a[sortConfig.key];
        //@ts-ignore
        const bValue = b[sortConfig.key];

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
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#f9fafb] border-b border-gray-200">
                            <tr>
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className={cn(
                                            "px-6 py-4 font-medium text-gray-500 whitespace-nowrap",
                                            col.width,
                                            typeof col.accessorKey === 'string' ? "cursor-pointer hover:bg-gray-100 transition-colors" : ""
                                        )}
                                        onClick={() => typeof col.accessorKey === 'string' && handleSort(col.accessorKey as string)}
                                    >
                                        <div className="flex items-center space-x-1">
                                            <span>{col.header}</span>
                                            {typeof col.accessorKey === 'string' && (
                                                <ArrowUpDown className="w-3 h-3 text-gray-400" />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {columns.map((_, j) => (
                                            <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-3/4"></div></td>
                                        ))}
                                    </tr>
                                ))
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={`hover:bg-gray-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                        onClick={() => onRowClick?.(row)}
                                    >
                                        {columns.map((col, idx) => (
                                            <td key={idx} className="px-6 py-4 text-gray-700">
                                                {col.cell ? col.cell(row) : (row[col.accessorKey as keyof T] as React.ReactNode)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
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
                <p className="text-sm text-gray-500">
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
                    <span className="text-sm font-medium text-gray-700">
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
