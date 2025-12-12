"use client";

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Filter, X, Download, Calendar } from 'lucide-react';

interface FilterOption {
    label: string;
    value: string;
    options: { label: string; value: string }[];
}

interface FilterBarProps {
    filters: FilterOption[];
    onFilterChange: (key: string, value: string) => void;
    onClearFilters: () => void;
    activeFilters: Record<string, string>;
}

export function FilterBar({ filters, onFilterChange, onClearFilters, activeFilters }: FilterBarProps) {
    const hasActiveFilters = Object.values(activeFilters).some(v => v !== 'all' && v !== '');

    return (
        <div className="flex flex-col sm:flex-row gap-3 py-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center text-sm font-medium text-gray-700">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters:
                </div>
                {filters.map((filter) => (
                    <div key={filter.value} className="w-40">
                        <Select
                            options={filter.options}
                            onChange={(e) => onFilterChange(filter.value, e.target.value)}
                            value={activeFilters[filter.value] || 'all'}
                            className="h-9 text-xs"
                        />
                    </div>
                ))}
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                        <X className="w-3 h-3 mr-1" />
                        Clear
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <Button variant="outline" size="sm" className="h-9">
                    <Calendar className="w-4 h-4 mr-2" />
                    Date Range
                </Button>
                <Button variant="secondary" size="sm" className="h-9">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                </Button>
            </div>
        </div>
    );
}
