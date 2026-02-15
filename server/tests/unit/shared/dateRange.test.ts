import { parseQueryDate, parseQueryDateRange } from '../../../src/shared/utils/dateRange';

describe('dateRange utils', () => {
    it('returns undefined for missing values', () => {
        expect(parseQueryDate(undefined)).toBeUndefined();
        expect(parseQueryDate('')).toBeUndefined();
    });

    it('throws for invalid dates', () => {
        expect(() => parseQueryDate('not-a-date')).toThrow('Invalid date: not-a-date');
    });

    it('normalizes date-only end date to inclusive end-of-day UTC', () => {
        const parsed = parseQueryDate('2026-02-15', { endOfDayIfDateOnly: true });
        expect(parsed?.toISOString()).toBe('2026-02-15T23:59:59.999Z');
    });

    it('does not modify full ISO datetime even when end-of-day option is enabled', () => {
        const parsed = parseQueryDate('2026-02-15T10:12:13.456Z', { endOfDayIfDateOnly: true });
        expect(parsed?.toISOString()).toBe('2026-02-15T10:12:13.456Z');
    });

    it('applies end-of-day normalization only to endDate in parseQueryDateRange', () => {
        const range = parseQueryDateRange('2026-02-10', '2026-02-15');
        expect(range.startDate?.toISOString()).toBe('2026-02-10T00:00:00.000Z');
        expect(range.endDate?.toISOString()).toBe('2026-02-15T23:59:59.999Z');
    });
});
