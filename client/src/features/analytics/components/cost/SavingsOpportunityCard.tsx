import { formatCurrency, cn } from '@/src/lib/utils';
import { CostSavingsOpportunity } from '@/src/types/api/analytics';

const impactColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const effortColors = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    complex: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function SavingsOpportunityCard({ opportunity }: { opportunity: CostSavingsOpportunity }) {
    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{opportunity.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{opportunity.description}</p>
                </div>
                <div className="text-right ml-4">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(opportunity.potentialSavings)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">potential savings</p>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
                <span className={cn('text-xs px-2 py-1 rounded font-medium', impactColors[opportunity.impact])}>
                    {opportunity.impact} impact
                </span>
                <span className={cn('text-xs px-2 py-1 rounded font-medium', effortColors[opportunity.effort])}>
                    {opportunity.effort} effort
                </span>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                <span className="font-medium">Recommendation:</span> {opportunity.recommendation}
            </p>
        </div>
    );
}
