/**
 * Fraud Rules Configuration Component
 * 
 * Manage fraud detection rules with priority and conditions.
 */

'use client';

import { useState } from 'react';
import { useFraudRules, useCreateFraudRule, useToggleFraudRule, useDeleteFraudRule } from '@/src/core/api/hooks/useFraud';
import { Plus, Trash2, Settings, TrendingUp } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { FraudRule, CreateFraudRulePayload, FraudRiskLevel, FraudRuleAction } from '@/src/types/api/fraud.types';

export default function FraudRulesConfig() {
    const [showAddModal, setShowAddModal] = useState(false);

    const { data: rules, isLoading } = useFraudRules();
    const { mutate: createRule, isPending: isCreating } = useCreateFraudRule();
    const { mutate: toggleRule } = useToggleFraudRule();
    const { mutate: deleteRule } = useDeleteFraudRule();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Fraud Detection Rules</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Configure rules to automatically detect suspicious activities</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Rule
                </button>
            </div>

            <div className="space-y-3">
                {rules?.map((rule) => (
                    <RuleCard
                        key={rule.id}
                        rule={rule}
                        onToggle={(enabled) => toggleRule({ ruleId: rule.id, enabled })}
                        onDelete={() => deleteRule(rule.id)}
                    />
                ))}
            </div>

            {showAddModal && (
                <AddRuleModal
                    onClose={() => setShowAddModal(false)}
                    onCreate={(payload) => {
                        createRule(payload);
                        setShowAddModal(false);
                    }}
                    isCreating={isCreating}
                />
            )}
        </div>
    );
}

function RuleCard({ rule, onToggle, onDelete }: {
    rule: FraudRule;
    onToggle: (enabled: boolean) => void;
    onDelete: () => void;
}) {
    const riskColors = {
        critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    };

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{rule.name}</h3>
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', riskColors[rule.riskLevel])}>
                            {rule.riskLevel}
                        </span>
                        <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                            Priority: {rule.priority}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{rule.description}</p>

                    {/* Conditions */}
                    <div className="flex flex-wrap gap-2">
                        {rule.conditions.map((condition, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                {condition.field} {condition.operator} {JSON.stringify(condition.value)}
                            </span>
                        ))}
                    </div>

                    {/* Stats */}
                    {rule.stats && (
                        <div className="mt-3 flex items-center gap-6 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                                Triggered: <strong className="text-gray-900 dark:text-white">{rule.stats.triggeredCount}</strong>
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                                Confirmed: <strong className="text-red-600">{rule.stats.confirmedFraudCount}</strong>
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                                Accuracy: <strong className="text-green-600">{rule.stats.accuracy.toFixed(1)}%</strong>
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) => onToggle(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                    <button
                        onClick={onDelete}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function AddRuleModal({ onClose, onCreate, isCreating }: {
    onClose: () => void;
    onCreate: (payload: CreateFraudRulePayload) => void;
    isCreating: boolean;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [riskLevel, setRiskLevel] = useState<FraudRiskLevel>('medium');
    const [action, setAction] = useState<FraudRuleAction>('flag');
    const [priority, setPriority] = useState(5);

    const handleSubmit = () => {
        if (!name || !description) return;
        onCreate({
            name,
            description,
            riskLevel,
            action,
            priority,
            conditions: [], // Simplified for this demo
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Fraud Detection Rule</h2>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rule Name *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., High-Value COD Detection"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what this rule detects..."
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk Level *</label>
                            <select
                                value={riskLevel}
                                onChange={(e) => setRiskLevel(e.target.value as FraudRiskLevel)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action *</label>
                            <select
                                value={action}
                                onChange={(e) => setAction(e.target.value as FraudRuleAction)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                                <option value="flag">Flag for Review</option>
                                <option value="block">Block Immediately</option>
                                <option value="review">Manual Review</option>
                                <option value="notify">Notify Only</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority (1-10)</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={priority}
                            onChange={(e) => setPriority(parseInt(e.target.value))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isCreating}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name || !description || isCreating}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isCreating ? 'Creating...' : 'Create Rule'}
                    </button>
                </div>
            </div>
        </div>
    );
}
