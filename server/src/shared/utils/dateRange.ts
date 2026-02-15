const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface ParsedDateRange {
    startDate?: Date;
    endDate?: Date;
}

export function parseQueryDate(
    rawValue?: string,
    options: { endOfDayIfDateOnly?: boolean } = {}
): Date | undefined {
    if (!rawValue) return undefined;

    const value = String(rawValue).trim();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid date: ${rawValue}`);
    }

    if (options.endOfDayIfDateOnly && DATE_ONLY_PATTERN.test(value)) {
        parsed.setUTCHours(23, 59, 59, 999);
    }

    return parsed;
}

export function parseQueryDateRange(startDate?: string, endDate?: string): ParsedDateRange {
    return {
        startDate: parseQueryDate(startDate),
        endDate: parseQueryDate(endDate, { endOfDayIfDateOnly: true }),
    };
}

