/**
 * Pagination utilities for consistent display and edge-case handling
 */

export interface PaginationRange {
    /** 1-based start index (0 when empty) */
    start: number;
    /** 1-based end index (0 when empty) */
    end: number;
    total: number;
    isEmpty: boolean;
    /** Safe totalPages (min 1 when total > 0, 1 when total = 0 for display) */
    totalPages: number;
}

/**
 * Compute pagination range for "Showing X to Y of Z" display.
 * Handles edge cases: total=0, page out of range, less data than page size.
 */
export function getPaginationRange(
    page: number,
    limit: number,
    total: number
): PaginationRange {
    const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / limit));
    const clampedPage = Math.min(Math.max(1, page), totalPages);

    if (total === 0) {
        return {
            start: 0,
            end: 0,
            total: 0,
            isEmpty: true,
            totalPages: 1,
        };
    }

    const start = (clampedPage - 1) * limit + 1;
    const end = Math.min(clampedPage * limit, total);

    return {
        start,
        end,
        total,
        isEmpty: false,
        totalPages,
    };
}

/**
 * Format pagination range for display.
 * Returns "Showing X to Y of Z" or "No results" when empty.
 */
export function formatPaginationRange(
    page: number,
    limit: number,
    total: number,
    itemLabel = 'results'
): string {
    const range = getPaginationRange(page, limit, total);
    if (range.isEmpty) {
        return `No ${itemLabel}`;
    }
    return `Showing ${range.start} to ${range.end} of ${range.total} ${itemLabel}`;
}
