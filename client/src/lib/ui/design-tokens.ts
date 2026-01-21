/**
 * Helix Design Tokens
 * 
 * TypeScript constants for design system values.
 * Use these when CSS custom properties aren't accessible (e.g., in JS logic).
 * 
 * IMPORTANT: Keep in sync with globals.css @theme values
 */

// ═══════════════════════════════════════════════════════════════════════════
// BRAND COLORS
// ═══════════════════════════════════════════════════════════════════════════

export const colors = {
    primary: '#2525FF',
    primaryHover: '#1e1ecc',
    primaryActive: '#1a1ab3',
    primaryLight: '#e8e8ff',
    primary50: '#f0f0ff',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// STATUS COLORS (for badges, alerts, etc.)
// ═══════════════════════════════════════════════════════════════════════════

export const statusColors = {
    success: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        solid: '#10B981',
    },
    warning: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-200',
        solid: '#F59E0B',
    },
    error: {
        bg: 'bg-rose-100',
        text: 'text-rose-700',
        border: 'border-rose-200',
        solid: '#EF4444',
    },
    info: {
        bg: 'bg-cyan-100',
        text: 'text-cyan-700',
        border: 'border-cyan-200',
        solid: '#06B6D4',
    },
    neutral: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-200',
        solid: '#6B7280',
    },
    primary: {
        bg: 'bg-[#2525FF]/10',
        text: 'text-[#2525FF]',
        border: 'border-[#2525FF]/20',
        solid: '#2525FF',
    },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SHIPMENT STATUS MAPPING
// Maps API status values to display colors
// ═══════════════════════════════════════════════════════════════════════════

export const shipmentStatusMap = {
    'delivered': 'success',
    'in-transit': 'info',
    'pending': 'warning',
    'ndr': 'warning',
    'rto': 'error',
    'cancelled': 'error',
    'active': 'success',
    'inactive': 'neutral',
    'suspended': 'error',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CHART COLORS (for Recharts)
// ═══════════════════════════════════════════════════════════════════════════

export const chartColors = {
    primary: '#2525FF',
    secondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    muted: '#E5E7EB',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION DURATIONS (in ms)
// Use with Framer Motion
// ═══════════════════════════════════════════════════════════════════════════

export const duration = {
    fast: 0.15,
    base: 0.2,
    slow: 0.3,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// COMMON FRAMER MOTION VARIANTS
// Lightweight, reusable animation presets
// ═══════════════════════════════════════════════════════════════════════════

export const motionVariants = {
    fadeIn: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: duration.base },
    },
    slideUp: {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 10 },
        transition: { duration: duration.base },
    },
    scaleIn: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: duration.fast },
    },
    // For lists (stagger children)
    staggerContainer: {
        animate: {
            transition: {
                staggerChildren: 0.05,
            },
        },
    },
    staggerItem: {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
    },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION: Get status color classes
// ═══════════════════════════════════════════════════════════════════════════

export function getStatusClasses(status: string): string {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-');
    const statusType = shipmentStatusMap[normalizedStatus as keyof typeof shipmentStatusMap] || 'neutral';
    const colors = statusColors[statusType];
    return `${colors.bg} ${colors.text} ${colors.border}`;
}

export type StatusType = keyof typeof statusColors;
export type ShipmentStatus = keyof typeof shipmentStatusMap;
