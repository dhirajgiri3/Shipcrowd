import { formatCurrency, cn } from '@/src/lib/utils';

export interface CostBreakdownCardProps {
    label: string;
    amount: number;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
}

export function CostBreakdownCard({ label, amount, color }: CostBreakdownCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
        orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        gray: 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700',
    };

    return (
        <div className={cn('p-4 rounded-lg border', colorClasses[color])}>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(amount)}</p>
        </div>
    );
}
