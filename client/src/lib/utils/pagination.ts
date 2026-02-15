/**
 * Pagination utilities for consistent display and edge-case handling
 */
export interface PaginationQueryOptions {
    defaultPage?: number;
    defaultLimit: number;
    minPage?: number;
    minLimit?: number;
    maxLimit?: number;
}

export interface PaginationQueryValues {
    page: number;
    limit: number;
}

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

interface SearchParamReader {
    get(name: string): string | null;
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

function parsePositiveInt(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
}

/**
 * Parse page/limit query params with sane defaults and bounds.
 */
export function parsePaginationQuery(
    searchParams: SearchParamReader,
    options: PaginationQueryOptions
): PaginationQueryValues {
    const {
        defaultPage = 1,
        defaultLimit,
        minPage = 1,
        minLimit = 1,
        maxLimit = 100,
    } = options;

    const rawPage = parsePositiveInt(searchParams.get('page'));
    const rawLimit = parsePositiveInt(searchParams.get('limit'));

    const page = rawPage ? Math.max(minPage, rawPage) : defaultPage;
    const fallbackLimit = Math.max(minLimit, defaultLimit);
    const boundedLimit = rawLimit ?? fallbackLimit;
    const limit = Math.min(maxLimit, Math.max(minLimit, boundedLimit));

    return { page, limit };
}

/**
 * Sync page/limit into URLSearchParams with compact URL behavior.
 * Removes `page` when at defaultPage and removes `limit` when at defaultLimit.
 */
export function syncPaginationQuery(
    params: URLSearchParams,
    values: PaginationQueryValues,
    options: PaginationQueryOptions
): void {
    const { defaultPage = 1, defaultLimit } = options;

    if (values.page > defaultPage) {
        params.set('page', String(values.page));
    } else {
        params.delete('page');
    }

    if (values.limit !== defaultLimit) {
        params.set('limit', String(values.limit));
    } else {
        params.delete('limit');
    }
}
