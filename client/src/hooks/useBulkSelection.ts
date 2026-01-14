/**
 * useBulkSelection Hook
 * 
 * Manages bulk selection state for tables:
 * - Select/deselect individual items
 * - Select/deselect all items
 * - Clear selection
 * - Get selected items
 * 
 * @example
 * const { selectedIds, toggleSelect, toggleSelectAll, clearSelection, isSelected, isAllSelected } = useBulkSelection();
 */

import { useState, useCallback, useMemo } from 'react';

export function useBulkSelection<T = string>() {
    const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());

    const toggleSelect = useCallback((id: T) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const toggleSelectAll = useCallback((ids: T[], currentlyAllSelected: boolean) => {
        if (currentlyAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(ids));
        }
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const isSelected = useCallback((id: T) => {
        return selectedIds.has(id);
    }, [selectedIds]);

    const isAllSelected = useCallback((ids: T[]) => {
        if (ids.length === 0) return false;
        return ids.every(id => selectedIds.has(id));
    }, [selectedIds]);

    const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

    const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

    return {
        selectedIds,
        selectedArray,
        selectedCount,
        toggleSelect,
        toggleSelectAll,
        clearSelection,
        isSelected,
        isAllSelected,
    };
}
