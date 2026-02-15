import { endOfDay, startOfDay } from 'date-fns';

/**
 * Parse a URL date param safely.
 * Returns null when missing/invalid.
 */
export function parseUrlDateParam(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function toStartOfDayIso(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    return startOfDay(date).toISOString();
}

export function toEndOfDayIso(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    return endOfDay(date).toISOString();
}

