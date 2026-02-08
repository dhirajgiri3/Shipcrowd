import React from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
    className?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50, 100],
    className
}: PaginationProps) {
    if (totalItems === 0) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className={cn("px-6 py-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4", className)}>
            <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                <p>
                    Showing <span className="font-medium text-[var(--text-primary)]">{startItem}</span> to{' '}
                    <span className="font-medium text-[var(--text-primary)]">{endItem}</span> of{' '}
                    <span className="font-medium text-[var(--text-primary)]">{totalItems}</span> results
                </p>

                {onPageSizeChange && (
                    <div className="flex items-center gap-2 ml-4">
                        <span className="hidden sm:inline">Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            className="h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs focus:ring-1 focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)] cursor-pointer"
                        >
                            {pageSizeOptions.map(option => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 px-3"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                </Button>
                <div className="text-sm font-medium text-[var(--text-secondary)]">
                    Page <span className="text-[var(--text-primary)]">{currentPage}</span> of {Math.max(1, totalPages)}
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="h-8 px-3"
                >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>
    );
}
