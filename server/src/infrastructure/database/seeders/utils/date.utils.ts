/**
 * Date Manipulation Utilities
 * 
 * Date utilities with seasonal logic for realistic order volume variations.
 */

import { SEED_CONFIG } from '../config';

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Subtract days from a date
 */
export function subDays(date: Date, days: number): Date {
    return addDays(date, -days);
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setTime(result.getTime() + hours * 60 * 60 * 1000);
    return result;
}

/**
 * Subtract hours from a date
 */
export function subHours(date: Date, hours: number): Date {
    return addHours(date, -hours);
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setTime(result.getTime() + minutes * 60 * 1000);
    return result;
}

/**
 * Subtract minutes from a date
 */
export function subMinutes(date: Date, minutes: number): Date {
    return addMinutes(date, -minutes);
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

/**
 * Subtract months from a date
 */
export function subMonths(date: Date, months: number): Date {
    return addMonths(date, -months);
}

/**
 * Get the start of a month
 */
export function startOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Get the end of a month
 */
export function endOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1);
    result.setDate(0);
    result.setHours(23, 59, 59, 999);
    return result;
}

/**
 * Get the seasonal multiplier for order volume based on date
 * 
 * Seasonal patterns in Indian e-commerce:
 * - Diwali (October-November): 150% volume spike
 * - Christmas/New Year (December): 130% volume
 * - Wedding Season (January-February): 120% volume
 * - Monsoon (June-August): 90% volume (lower orders)
 * - Summer (March-May): 95% volume (slightly lower)
 */
export function getSeasonalMultiplier(date: Date): number {
    const month = date.getMonth() + 1; // 1-12

    // Diwali (October-November)
    if (month === 10 || month === 11) {
        return SEED_CONFIG.seasonalMultipliers.diwali;
    }

    // Christmas/New Year (December)
    if (month === 12) {
        return SEED_CONFIG.seasonalMultipliers.christmas;
    }

    // Wedding Season (January-February)
    if (month === 1 || month === 2) {
        return SEED_CONFIG.seasonalMultipliers.wedding;
    }

    // Monsoon (June-August) - Lower orders due to delivery challenges
    if (month >= 6 && month <= 8) {
        return SEED_CONFIG.seasonalMultipliers.monsoon;
    }

    // Summer (March-May) - Slightly lower
    if (month >= 3 && month <= 5) {
        return SEED_CONFIG.seasonalMultipliers.summer;
    }

    // September and other months - Normal
    return SEED_CONFIG.seasonalMultipliers.normal;
}

/**
 * Get season name for a date
 */
export function getSeasonName(date: Date): string {
    const month = date.getMonth() + 1;

    if (month === 10 || month === 11) return 'Diwali Season';
    if (month === 12) return 'Christmas/New Year';
    if (month === 1 || month === 2) return 'Wedding Season';
    if (month >= 6 && month <= 8) return 'Monsoon';
    if (month >= 3 && month <= 5) return 'Summer';
    return 'Normal';
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Format date as Indian format (DD/MM/YYYY)
 */
export function formatDateIndian(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Get a random date within a month
 */
export function randomDateInMonth(year: number, month: number): Date {
    const start = new Date(year, month - 1, 1);
    const end = endOfMonth(start);
    return new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
}

/**
 * Generate an array of months for the seeding date range
 * @param endDate - End date for range (defaults to now)
 * @param recentOnly - If true, generates only last 30 days instead of 12 months
 */
export function generateMonthRange(endDate: Date = new Date(), recentOnly: boolean = false): Date[] {
    const months: Date[] = [];

    if (recentOnly) {
        // Generate last 30 days for testing/demo
        const startDate = subDays(endDate, 30);
        let current = new Date(startDate);

        while (current <= endDate) {
            months.push(new Date(current));
            current = addDays(current, 1);
        }
    } else {
        // Original behavior: 12 months back
        const startDate = subMonths(endDate, SEED_CONFIG.dateRange.monthsBack);
        let current = startOfMonth(startDate);
        const end = startOfMonth(endDate);

        while (current <= end) {
            months.push(new Date(current));
            current = addMonths(current, 1);
        }
    }

    return months;
}

/**
 * Check if a date is within business hours (9 AM - 6 PM IST)
 */
export function isBusinessHours(date: Date): boolean {
    const hours = date.getHours();
    return hours >= 9 && hours < 18;
}

/**
 * Get next business day (skip weekends)
 */
export function nextBusinessDay(date: Date): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + 1);

    // Skip Saturday (6) and Sunday (0)
    const day = result.getDay();
    if (day === 0) result.setDate(result.getDate() + 1);
    if (day === 6) result.setDate(result.getDate() + 2);

    return result;
}

/**
 * Calculate delivery date based on distance and service type
 */
export function calculateDeliveryDate(
    pickupDate: Date,
    isMetroToMetro: boolean,
    isExpress: boolean = false
): Date {
    let minDays: number;
    let maxDays: number;

    if (isMetroToMetro) {
        minDays = SEED_CONFIG.deliveryTimes.metroToMetro.min;
        maxDays = SEED_CONFIG.deliveryTimes.metroToMetro.max;
    } else {
        minDays = SEED_CONFIG.deliveryTimes.metroToTier2.min;
        maxDays = SEED_CONFIG.deliveryTimes.metroToTier2.max;
    }

    // Express service is faster
    if (isExpress) {
        minDays = Math.max(1, minDays - 1);
        maxDays = Math.max(2, maxDays - 1);
    }

    const daysToAdd = minDays + Math.floor(Math.random() * (maxDays - minDays + 1));
    return addDays(pickupDate, daysToAdd);
}

/**
 * Get the difference between two dates in days
 */
export function daysBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get the difference between two dates in hours
 */
export function hoursBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60));
}

// Re-export randomDateBetween for convenience
export { randomDateBetween } from './random.utils';

