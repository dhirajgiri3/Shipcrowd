import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'delivered':
        case 'active':
        case 'paid':
        case 'shipped':
            return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'in-transit':
        case 'processing':
        case 'growth':
            return 'bg-cyan-100 text-cyan-700 border-cyan-200';
        case 'pending':
        case 'ndr':
        case 'starter':
            return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'rto':
        case 'cancelled':
        case 'failed':
        case 'suspended':
        case 'inactive':
        case 'issue':
            return 'bg-rose-100 text-rose-700 border-rose-200';
        case 'enterprise':
            return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};
