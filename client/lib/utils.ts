import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility Functions
 * 
 * Core utilities for the Shipcrowd application.
 * Uses design tokens from design-tokens.ts for consistency.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CLASS NAME UTILITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format number as Indian Rupee currency
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format date string to readable format
 */
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Format date with time
 */
export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS COLOR UTILITIES
// Uses CSS custom properties from design system
// ═══════════════════════════════════════════════════════════════════════════

type StatusColorType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

/**
 * Get status type from status string
 */
export function getStatusType(status: string): StatusColorType {
    const statusLower = status.toLowerCase();

    // Success states
    if (['delivered', 'active', 'paid', 'shipped', 'completed', 'verified', 'approved'].includes(statusLower)) {
        return 'success';
    }

    // Info/In-progress states
    if (['in-transit', 'processing', 'pending review', 'in progress'].includes(statusLower)) {
        return 'info';
    }

    // Warning states
    if (['pending', 'ndr', 'starter', 'awaiting', 'incomplete'].includes(statusLower)) {
        return 'warning';
    }

    // Error states
    if (['rto', 'cancelled', 'failed', 'suspended', 'inactive', 'rejected', 'issue'].includes(statusLower)) {
        return 'error';
    }

    return 'neutral';
}

/**
 * Get CSS classes for status using design tokens
 * @deprecated Use Badge component with variant prop instead
 */
export const getStatusColor = (status: string): string => {
    const type = getStatusType(status);

    const colorMap: Record<StatusColorType, string> = {
        success: 'bg-[--color-success-light] text-[--color-success-dark] border-[--color-success]/20',
        warning: 'bg-[--color-warning-light] text-[--color-warning-dark] border-[--color-warning]/20',
        error: 'bg-[--color-error-light] text-[--color-error-dark] border-[--color-error]/20',
        info: 'bg-[--color-info-light] text-[--color-info-dark] border-[--color-info]/20',
        neutral: 'bg-[--color-gray-100] text-[--color-gray-700] border-[--color-gray-200]',
        primary: 'bg-[--color-primary-light] text-[--color-primary] border-[--color-primary]/20',
    };

    return colorMap[type];
};

// ═══════════════════════════════════════════════════════════════════════════
// OTHER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number): string {
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
