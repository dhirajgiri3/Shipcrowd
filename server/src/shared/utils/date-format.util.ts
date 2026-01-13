/**
 * Date Formatting Utilities for Invoices and GSTN
 * Provides consistent date formatting across the application
 */

/**
 * Format date for invoice display (DD-Mon-YYYY)
 * @param date - The date to format
 * @returns Formatted string
 * @example
 * formatInvoiceDate(new Date('2026-01-13')) → "13-Jan-2026"
 */
export function formatInvoiceDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
}

/**
 * Format date for GSTN API (DD/MM/YYYY)
 * @param date - The date to format
 * @returns Formatted string
 * @example
 * formatGSTNDate(new Date('2026-01-13')) → "13/01/2026"
 */
export function formatGSTNDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Format date and time for invoice timestamp (DD-Mon-YYYY HH:MM:SS)
 * @param date - The date to format
 * @returns Formatted string
 * @example
 * formatInvoiceDateTime(new Date('2026-01-13T10:30:00')) → "13-Jan-2026 10:30:00"
 */
export function formatInvoiceDateTime(date: Date): string {
    const dateStr = formatInvoiceDate(date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${dateStr} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format date for financial period (MMYYYY)
 * @param date - The date to format
 * @returns Formatted string
 * @example
 * formatFinancialPeriod(new Date('2026-01-13')) → "012026"
 */
export function formatFinancialPeriod(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${month}${year}`;
}
