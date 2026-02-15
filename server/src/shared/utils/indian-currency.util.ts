/**
 * Indian Currency Formatting Utilities
 * Handles INR formatting with Indian comma placement and symbols
 */

import { formatIndianNumberWithDecimals } from './number-to-words.util';

/**
 * Format amount as INR with rupee symbol and Indian comma placement
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 * @example
 * formatINR(1234567.89) → "₹12,34,567.89"
 * formatINR(11800) → "₹11,800.00"
 */
export function formatINR(amount: number, decimals: number = 2): string {
    return '₹' + formatIndianNumberWithDecimals(amount, decimals);
}

/**
 * Format amount as compact INR (K for thousands, L for lakhs, Cr for crores)
 * @param amount - The amount to format
 * @returns Compact formatted string
 * @example
 * formatINRCompact(11800) → "₹11.8K"
 * formatINRCompact(1234567) → "₹12.3L"
 * formatINRCompact(12345678) → "₹1.23Cr"
 */
export function formatINRCompact(amount: number): string {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (absAmount >= 10000000) {
        // Crores (1 Cr = 10,000,000)
        return sign + '₹' + (absAmount / 10000000).toFixed(2) + 'Cr';
    } else if (absAmount >= 100000) {
        // Lakhs (1 L = 100,000)
        return sign + '₹' + (absAmount / 100000).toFixed(2) + 'L';
    } else if (absAmount >= 1000) {
        // Thousands (1 K = 1,000)
        return sign + '₹' + (absAmount / 1000).toFixed(1) + 'K';
    } else {
        return sign + '₹' + absAmount.toFixed(2);
    }
}

/**
 * Format amount for display in tables (right-aligned, fixed width)
 * @param amount - The amount to format
 * @returns Formatted string suitable for table display
 * @example
 * formatINRForTable(1234.56) → "  ₹1,234.56"
 */
export function formatINRForTable(amount: number): string {
    const formatted = formatINR(amount);
    return formatted.padStart(15, ' '); // Right-align with padding
}

/**
 * Parse INR string back to number
 * @param inrString - String like "₹12,34,567.89" or "12,34,567.89"
 * @returns Numeric value
 * @example
 * parseINR("₹12,34,567.89") → 1234567.89
 */
export function parseINR(inrString: string): number {
    // Remove rupee symbol and commas
    const cleaned = inrString.replace(/[₹,]/g, '').trim();
    return parseFloat(cleaned);
}
