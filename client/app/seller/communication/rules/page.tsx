/**
 * Notification Rules Page
 * 
 * Configure automated notification rules with event triggers,
 * conditions, and actions (send template, webhook).
 */

'use client';

import React, { useState } from 'react';
import {
    useRules,
    useCreateRule,
    useUpdateRule,
    useToggleRule,
    useDeleteRule,
} from '@/src/core/api/hooks/communication/useCommunication';
import {
    Plus,
    Zap,
    Search,
    Edit,
    Trash2,
    Power,
    PowerOff,
    X,
    Check,
    ChevronDown,
    RefreshCw,
    BarChart3,
} from 'lucide-react';
import { Loader, CardSkeleton } from '@/src/components/ui';
import { handleApiError } from '@/src/lib/error';
import type {
    NotificationRule,
    RuleTrigger,
    RuleCondition,
    RuleConditionOperator,
    RuleAction,
    RuleActionType,
    CreateRulePayload,
} from '@/src/types/api/communication';

// ==================== Configuration ====================

const triggerOptions: { value: RuleTrigger; label: string; description: string }[] = [
    { value: 'ORDER_CREATED', label: 'Order Created', description: 'When a new order is placed' },
    { value: 'SHIPMENT_CREATED', label: 'Shipment Created', description: 'When shipment is booked' },
    { value: 'STATUS_CHANGED', label: 'Status Changed', description: 'When shipment status updates' },
    { value: 'NDR_RAISED', label: 'NDR Raised', description: 'When delivery fails' },
    { value: 'RETURN_REQUESTED', label: 'Return Requested', description: 'When customer requests return' },
    { value: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled', description: 'When pickup is scheduled' },
    { value: 'DELIVERY_ATTEMPTED', label: 'Delivery Attempted', description: 'When delivery is attempted' },
    { value: 'DELIVERED', label: 'Delivered', description: 'When package is delivered' },
    { value: 'SLA_BREACH', label: 'SLA Breach', description: 'When SLA is breached' },
];

const operatorOptions: { value: RuleConditionOperator; label: string }[] = [
    { value: 'EQUALS', label: 'Equals' },
    { value: 'NOT_EQUALS', label: 'Not Equals' },
    { value: 'CONTAINS', label: 'Contains' },
    { value: 'GREATER_THAN', label: 'Greater Than' },
    { value: 'LESS_THAN', label: 'Less Than' },
];

const actionTypeOptions: { value: RuleActionType; label: string }[] = [
    { value: 'SEND_TEMPLATE', label: 'Send Template' },
    { value: 'SEND_WEBHOOK', label: 'Send Webhook' },
    { value: 'CREATE_TICKET', label: 'Create Ticket' },
];

// ==================== Component ====================

export default function NotificationRulesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);

    const { data: rules, isLoading, refetch } = useRules({
        search: searchQuery || undefined,
    });

    const handleCreateRule = () => {
        setEditingRule(null);
        setIsCreateModalOpen(true);
    };

    const handleEditRule = (rule: NotificationRule) => {
        setEditingRule(rule);
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingRule(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            Notification Rules
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Automate customer notifications based on shipment events
                        </p>
                    </div>
                    <button
                        onClick={handleCreateRule}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Create Rule
                    </button>
                </div>

                {/* Search */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search rules..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <button
                            onClick={() => refetch()}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            {isLoading ? <Loader variant="spinner" size="sm" /> : <RefreshCw className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Rules List */}
                {isLoading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <CardSkeleton key={idx} />
                        ))}
                    </div>
                ) : (rules ?? []).length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <Zap className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No Rules Configured
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Create your first automation rule to start sending automated notifications
                        </p>
                        <button
                            onClick={handleCreateRule}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Rule
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {(rules ?? []).map(rule => (
                            <RuleCard
                                key={rule._id}
                                rule={rule}
                                onEdit={handleEditRule}
                            />
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                {isCreateModalOpen && (
                    <RuleBuilderModal
                        isOpen={isCreateModalOpen}
                        rule={editingRule}
                        onClose={handleCloseModal}
                    />
                )}
            </div>
        </div>
    );
}

// ==================== Rule Card Component ====================

interface RuleCardProps {
    rule: NotificationRule;
    onEdit: (rule: NotificationRule) => void;
}

function RuleCard({ rule, onEdit }: RuleCardProps) {
    const { mutate: toggleRule, isPending: isToggling } = useToggleRule();
    const { mutate: deleteRule, isPending: isDeleting } = useDeleteRule();

    const handleToggle = () => {
        toggleRule({
            ruleId: rule.ruleId,
            isActive: !rule.isActive,
        });
    };

    const handleDelete = () => {
        if (window.confirm(`Delete rule "${rule.name}"?`)) {
            deleteRule(rule.ruleId);
        }
    };

    const trigger = triggerOptions.find(t => t.value === rule.trigger);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <Zap className={`w-5 h-5 ${rule.isActive ? 'text-green-500' : 'text-gray-400'}`} />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {rule.name}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${rule.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    {rule.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {rule.description}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleToggle}
                        disabled={isToggling}
                        className={`p-2 rounded-lg transition-colors ${rule.isActive
                            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        title={rule.isActive ? 'Disable' : 'Enable'}
                    >
                        {isToggling ? (
                            <Loader variant="spinner" size="sm" />
                        ) : rule.isActive ? (
                            <Power className="w-5 h-5" />
                        ) : (
                            <PowerOff className="w-5 h-5" />
                        )}
                    </button>
                    <button
                        onClick={() => onEdit(rule)}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <Edit className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? <Loader variant="spinner" size="sm" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Trigger */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Trigger
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {trigger?.label ?? rule.trigger}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {trigger?.description}
                </p>
            </div>

            {/* Conditions */}
            {rule.conditions.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Conditions ({rule.conditionLogic})
                    </p>
                    <div className="space-y-2">
                        {rule.conditions.map((condition, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{condition.field}</span>
                                <span className="text-gray-400">{condition.operator.toLowerCase()}</span>
                                <span className="font-medium text-gray-900 dark:text-white">"{condition.value}"</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Actions ({rule.actions.length})
                </p>
                <div className="space-y-2">
                    {rule.actions.map((action, idx) => (
                        <div key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                            {action.type === 'SEND_TEMPLATE' && `Send template ${action.templateId}`}
                            {action.type === 'SEND_WEBHOOK' && `POST to ${action.webhookUrl}`}
                            {action.type === 'CREATE_TICKET' && 'Create support ticket'}
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats */}
            {rule.stats && (
                <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                            {rule.stats.totalExecutions} executions
                        </span>
                    </div>
                    <div className="text-green-600 dark:text-green-400">
                        {rule.stats.successCount} success
                    </div>
                    {rule.stats.failureCount > 0 && (
                        <div className="text-red-600 dark:text-red-400">
                            {rule.stats.failureCount} failed
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ==================== Rule Builder Modal Component ====================

interface RuleBuilderModalProps {
    isOpen: boolean;
    rule: NotificationRule | null;
    onClose: () => void;
}

function RuleBuilderModal({ isOpen, rule, onClose }: RuleBuilderModalProps) {
    const [formData, setFormData] = useState<CreateRulePayload>({
        name: rule?.name ?? '',
        description: rule?.description ?? '',
        trigger: rule?.trigger ?? 'ORDER_CREATED',
        conditions: rule?.conditions ?? [],
        conditionLogic: rule?.conditionLogic ?? 'AND',
        actions: rule?.actions ?? [],
        isActive: rule?.isActive ?? true,
        priority: rule?.priority ?? 5,
    });

    const { mutate: createRule, isPending: isCreating } = useCreateRule();
    const { mutate: updateRule, isPending: isUpdating } = useUpdateRule();

    const isSubmitting = isCreating || isUpdating;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.actions.length === 0) {
            handleApiError(new Error('Please add at least one action'), 'Please add at least one action');
            return;
        }

        if (rule) {
            updateRule({
                ruleId: rule.ruleId,
                ...formData,
            }, {
                onSuccess: onClose,
            });
        } else {
            createRule(formData, {
                onSuccess: onClose,
            });
        }
    };

    const addCondition = () => {
        setFormData(prev => ({
            ...prev,
            conditions: [
                ...prev.conditions,
                { field: 'status', operator: 'EQUALS', value: '' },
            ],
        }));
    };

    const removeCondition = (index: number) => {
        setFormData(prev => ({
            ...prev,
            conditions: prev.conditions.filter((_, idx) => idx !== index),
        }));
    };

    const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
        setFormData(prev => ({
            ...prev,
            conditions: prev.conditions.map((cond, idx) =>
                idx === index ? { ...cond, ...updates } : cond
            ),
        }));
    };

    const addAction = () => {
        setFormData(prev => ({
            ...prev,
            actions: [
                ...prev.actions,
                { type: 'SEND_TEMPLATE', templateId: '' },
            ],
        }));
    };

    const removeAction = (index: number) => {
        setFormData(prev => ({
            ...prev,
            actions: prev.actions.filter((_, idx) => idx !== index),
        }));
    };

    const updateAction = (index: number, updates: Partial<RuleAction>) => {
        setFormData(prev => ({
            ...prev,
            actions: prev.actions.map((action, idx) =>
                idx === index ? { ...action, ...updates } : action
            ),
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {rule ? 'Edit Rule' : 'Create Notification Rule'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Name & Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Rule Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Notify on delivery"
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Optional description"
                            rows={2}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    {/* Trigger */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Event Trigger *
                        </label>
                        <select
                            value={formData.trigger}
                            onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value as RuleTrigger }))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {triggerOptions.map(trigger => (
                                <option key={trigger.value} value={trigger.value}>
                                    {trigger.label} - {trigger.description}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Conditions */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Conditions (Optional)
                            </label>
                            <button
                                type="button"
                                onClick={addCondition}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                            >
                                + Add Condition
                            </button>
                        </div>

                        {formData.conditions.length > 0 && (
                            <>
                                <div className="mb-2">
                                    <select
                                        value={formData.conditionLogic}
                                        onChange={(e) => setFormData(prev => ({ ...prev, conditionLogic: e.target.value as 'AND' | 'OR' }))}
                                        className="px-3 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                                    >
                                        <option value="AND">Match ALL conditions</option>
                                        <option value="OR">Match ANY condition</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    {formData.conditions.map((condition, idx) => (
                                        <div key={idx} className="flex gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <input
                                                type="text"
                                                value={condition.field}
                                                onChange={(e) => updateCondition(idx, { field: e.target.value })}
                                                placeholder="Field name"
                                                className="flex-1 px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                            />
                                            <select
                                                value={condition.operator}
                                                onChange={(e) => updateCondition(idx, { operator: e.target.value as RuleConditionOperator })}
                                                className="px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                            >
                                                {operatorOptions.map(op => (
                                                    <option key={op.value} value={op.value}>{op.label}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={condition.value}
                                                onChange={(e) => updateCondition(idx, { value: e.target.value })}
                                                placeholder="Value"
                                                className="flex-1 px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeCondition(idx)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Actions *
                            </label>
                            <button
                                type="button"
                                onClick={addAction}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                            >
                                + Add Action
                            </button>
                        </div>

                        {formData.actions.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                No actions configured. Click "+ Add Action" to get started.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {formData.actions.map((action, idx) => (
                                    <div key={idx} className="flex gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <select
                                            value={action.type}
                                            onChange={(e) => updateAction(idx, { type: e.target.value as RuleActionType })}
                                            className="px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                        >
                                            {actionTypeOptions.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>

                                        {action.type === 'SEND_TEMPLATE' && (
                                            <input
                                                type="text"
                                                value={action.templateId || ''}
                                                onChange={(e) => updateAction(idx, { templateId: e.target.value })}
                                                placeholder="Template ID"
                                                className="flex-1 px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                            />
                                        )}

                                        {action.type === 'SEND_WEBHOOK' && (
                                            <input
                                                type="url"
                                                value={action.webhookUrl || ''}
                                                onChange={(e) => updateAction(idx, { webhookUrl: e.target.value })}
                                                placeholder="Webhook URL"
                                                className="flex-1 px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                            />
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => removeAction(idx)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Priority & Active */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Priority (1-10)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={formData.priority}
                                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div className="flex items-end">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Activate rule immediately
                                </span>
                            </label>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader variant="dots" size="sm" />
                                {rule ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                {rule ? 'Update Rule' : 'Create Rule'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
