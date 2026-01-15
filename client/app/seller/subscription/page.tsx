/**
 * Subscription Management Page
 * 
 * View current plan, usage, and manage subscriptions.
 */

'use client';

import { useCurrentSubscription, useSubscriptionPlans, useBillingHistory, useChangePlan } from '@/src/core/api/hooks/useSettings';
import { Check, X, CreditCard, Download, TrendingUp } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/src/lib/utils';
import type { SubscriptionPlan, BillingCycle } from '@/src/types/api/settings.types';

export default function SubscriptionPage() {
    const { data: currentSub } = useCurrentSubscription();
    const { data: plans } = useSubscriptionPlans();
    const { data: billingHistory } = useBillingHistory();
    const { mutate: changePlan } = useChangePlan();

    const usagePercentage = (used: number, limit: number) => Math.min((used / limit) * 100, 100);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Subscription & Billing</h1>

                {/* Current Plan Card */}
                {currentSub && (
                    <div className="bg-gradient-to-br from-primary-500 to-blue-600 rounded-xl p-8 text-white mb-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-primary-100 mb-1">Current Plan</p>
                                <h2 className="text-3xl font-bold">{currentSub.plan.name}</h2>
                                <p className="text-primary-100 mt-2">{currentSub.plan.description}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-bold">
                                    {formatCurrency(currentSub.billingCycle === 'monthly' ? currentSub.plan.price.monthly : currentSub.plan.price.annual)}
                                </p>
                                <p className="text-sm text-primary-100">/{currentSub.billingCycle}</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/20">
                            <p className="text-sm text-primary-100">Current period: {formatDate(currentSub.currentPeriodStart)} - {formatDate(currentSub.currentPeriodEnd)}</p>
                        </div>
                    </div>
                )}

                {/* Usage Card */}
                {currentSub && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage This Month</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <UsageMetric
                                label="Shipments"
                                used={currentSub.usage.shipments}
                                limit={currentSub.plan.limits.shipmentsPerMonth}
                            />
                            <UsageMetric
                                label="Team Members"
                                used={currentSub.usage.teamMembers}
                                limit={currentSub.plan.limits.teamMembers}
                            />
                            <UsageMetric
                                label="API Calls"
                                used={currentSub.usage.apiCalls}
                                limit={currentSub.plan.limits.apiCalls}
                            />
                            <UsageMetric
                                label="Webhooks"
                                used={currentSub.usage.webhooks}
                                limit={currentSub.plan.limits.webhooks}
                            />
                        </div>
                    </div>
                )}

                {/* Plans Comparison */}
                {plans && (
                    <div className="mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Available Plans</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {plans.map((plan) => (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    isCurrentPlan={currentSub?.plan.id === plan.id}
                                    onSelect={(cycle) => changePlan({ planId: plan.id, billingCycle: cycle })}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Billing History */}
                {billingHistory && billingHistory.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing History</h3>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Description</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Amount</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {billingHistory.map((invoice) => (
                                        <tr key={invoice.id} className="border-b border-gray-100 dark:border-gray-700">
                                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                                {formatDate(invoice.createdAt)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                                {invoice.description}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(invoice.amount, invoice.currency)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={cn(
                                                    'px-2 py-1 rounded text-xs font-medium',
                                                    invoice.status === 'paid' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                                                    invoice.status === 'pending' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                                                    invoice.status === 'failed' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                )}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {invoice.invoiceUrl && (
                                                    <a
                                                        href={invoice.invoiceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary-600 hover:text-primary-700"
                                                    >
                                                        <Download className="w-4 h-4 inline" />
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==================== Components ====================

function UsageMetric({ label, used, limit }: { label: string; used: number; limit: number }) {
    const percentage = Math.min((used / limit) * 100, 100);
    const isNearLimit = percentage >= 80;

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                <span className={cn(
                    'text-sm font-semibold',
                    isNearLimit ? 'text-red-600' : 'text-gray-900 dark:text-white'
                )}>
                    {used.toLocaleString()} / {limit.toLocaleString()}
                </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={cn(
                        'h-full transition-all',
                        isNearLimit ? 'bg-red-600' : 'bg-primary-600'
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function PlanCard({ plan, isCurrentPlan, onSelect }: {
    plan: SubscriptionPlan;
    isCurrentPlan: boolean;
    onSelect: (cycle: BillingCycle) => void;
}) {
    return (
        <div className={cn(
            'bg-white dark:bg-gray-800 rounded-xl border-2 p-6 relative',
            isCurrentPlan ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800' : 'border-gray-200 dark:border-gray-700',
            plan.isPopular && 'shadow-lg'
        )}>
            {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                        Most Popular
                    </span>
                </div>
            )}

            <div className="text-center mb-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{plan.description}</p>
            </div>

            <div className="text-center mb-6">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(plan.price.monthly)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">/month</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    or {formatCurrency(plan.price.annual)}/year
                </p>
            </div>

            <ul className="space-y-3 mb-6">
                {plan.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300">{highlight}</span>
                    </li>
                ))}
            </ul>

            {isCurrentPlan ? (
                <button
                    disabled
                    className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-medium"
                >
                    Current Plan
                </button>
            ) : (
                <button
                    onClick={() => onSelect('monthly')}
                    className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                    Select Plan
                </button>
            )}
        </div>
    );
}
