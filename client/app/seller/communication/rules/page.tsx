/**
 * Notification Rules Page
 *
 * Configure automated notification rules with event triggers,
 * conditions, and actions (send template, webhook).
 *
 * Refactored per Frontend_Refactor.md:
 * - PageHeader, Button, SearchInput, EmptyState, Card, Badge
 * - Dialog for modals, Input/Select for forms
 * - useDebouncedValue for search
 * - Design system tokens throughout
 */

'use client';

import React, { useState, useCallback } from 'react';
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
    Edit,
    Trash2,
    Power,
    PowerOff,
    X,
    Check,
    RefreshCw,
    BarChart3,
} from 'lucide-react';
import {
    Button,
    Card,
    Badge,
    Input,
    SearchInput,
    EmptyState,
    ConfirmDialog,
    Loader,
    CardSkeleton,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Select,
    Checkbox,
} from '@/src/components/ui';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { handleApiError } from '@/src/lib/error';
import { cn } from '@/src/lib/utils';
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

// ==================== Main Page ====================

export default function NotificationRulesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery, 300);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data: rules, isLoading, refetch } = useRules({
        search: debouncedSearch || undefined,
    });

    const handleCreateRule = useCallback(() => {
        setEditingRule(null);
        setIsCreateModalOpen(true);
    }, []);

    const handleEditRule = useCallback((rule: NotificationRule) => {
        setEditingRule(rule);
        setIsCreateModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsCreateModalOpen(false);
        setEditingRule(null);
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    }, [refetch]);

    const rulesList = rules ?? [];

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Notification Rules"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Rules', active: true },
                ]}
                description="Automate customer notifications based on shipment events"
                showBack={false}
                actions={
                    <Button onClick={handleCreateRule} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Rule
                    </Button>
                }
            />

            {/* Search & Refresh */}
            <div className="flex items-center gap-3">
                <SearchInput
                    placeholder="Search rules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    widthClass="flex-1 max-w-md"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    title="Refresh"
                >
                    {isRefreshing ? (
                        <Loader variant="spinner" size="sm" />
                    ) : (
                        <RefreshCw className="w-5 h-5 text-[var(--text-secondary)]" />
                    )}
                </Button>
            </div>

            {/* Rules List */}
            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <CardSkeleton key={idx} />
                    ))}
                </div>
            ) : rulesList.length === 0 ? (
                <Card padding="lg">
                    <EmptyState
                        variant="noItems"
                        title="No Rules Configured"
                        description="Create your first automation rule to start sending automated notifications"
                        action={{
                            label: 'Create Rule',
                            onClick: handleCreateRule,
                            variant: 'primary',
                            icon: <Plus className="w-4 h-4" />,
                        }}
                    />
                </Card>
            ) : (
                <div className="space-y-4">
                    {rulesList.map((rule) => (
                        <RuleCard key={rule._id} rule={rule} onEdit={handleEditRule} />
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <RuleBuilderModal
                isOpen={isCreateModalOpen}
                rule={editingRule}
                onClose={handleCloseModal}
            />
        </div>
    );
}

// ==================== Rule Card ====================

interface RuleCardProps {
    rule: NotificationRule;
    onEdit: (rule: NotificationRule) => void;
}

function RuleCard({ rule, onEdit }: RuleCardProps) {
    const { mutate: toggleRule, isPending: isToggling } = useToggleRule();
    const { mutate: deleteRule, isPending: isDeleting } = useDeleteRule();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleToggle = useCallback(() => {
        toggleRule({ ruleId: rule.ruleId, isActive: !rule.isActive });
    }, [rule.ruleId, rule.isActive, toggleRule]);

    const trigger = triggerOptions.find((t) => t.value === rule.trigger);

    return (
        <Card hover padding="md">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <Zap
                            className={cn(
                                'w-5 h-5',
                                rule.isActive ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
                            )}
                        />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                            {rule.name}
                        </h3>
                        <Badge
                            variant={rule.isActive ? 'success' : 'neutral'}
                            size="sm"
                        >
                            {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                    {rule.description && (
                        <p className="text-sm text-[var(--text-secondary)] mb-3">
                            {rule.description}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggle}
                        disabled={isToggling}
                        title={rule.isActive ? 'Disable' : 'Enable'}
                    >
                        {isToggling ? (
                            <Loader variant="spinner" size="sm" />
                        ) : rule.isActive ? (
                            <Power className="w-5 h-5 text-[var(--success)]" />
                        ) : (
                            <PowerOff className="w-5 h-5 text-[var(--text-muted)]" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(rule)}
                        title="Edit"
                    >
                        <Edit className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={isDeleting}
                        className="text-[var(--error)] hover:bg-[var(--error-bg)]"
                        title="Delete"
                    >
                        {isDeleting ? (
                            <Loader variant="spinner" size="sm" />
                        ) : (
                            <Trash2 className="w-5 h-5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Trigger */}
            <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-4 mb-4">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">
                    Trigger
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                    {trigger?.label ?? rule.trigger}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {trigger?.description}
                </p>
            </div>

            {/* Conditions */}
            {rule.conditions.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">
                        Conditions ({rule.conditionLogic})
                    </p>
                    <div className="space-y-2">
                        {rule.conditions.map((condition, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="text-[var(--text-secondary)]">{condition.field}</span>
                                <span className="text-[var(--text-muted)]">
                                    {condition.operator.toLowerCase()}
                                </span>
                                <span className="font-medium text-[var(--text-primary)]">
                                    &quot;{condition.value}&quot;
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="mb-4">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">
                    Actions ({rule.actions.length})
                </p>
                <div className="space-y-2">
                    {rule.actions.map((action, idx) => (
                        <div key={idx} className="text-sm text-[var(--text-secondary)]">
                            {action.type === 'SEND_TEMPLATE' && `Send template ${action.templateId}`}
                            {action.type === 'SEND_WEBHOOK' && `POST to ${action.webhookUrl}`}
                            {action.type === 'CREATE_TICKET' && 'Create support ticket'}
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats */}
            {rule.stats && (
                <div className="flex items-center gap-6 pt-4 border-t border-[var(--border-default)] text-sm">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-secondary)]">
                            {rule.stats.totalExecutions} executions
                        </span>
                    </div>
                    <div className="text-[var(--success)]">{rule.stats.successCount} success</div>
                    {rule.stats.failureCount > 0 && (
                        <div className="text-[var(--error)]">{rule.stats.failureCount} failed</div>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={showDeleteDialog}
                title="Delete rule"
                description={`Delete rule "${rule.name}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="danger"
                onCancel={() => setShowDeleteDialog(false)}
                onConfirm={() => {
                    deleteRule(rule.ruleId);
                    setShowDeleteDialog(false);
                }}
            />
        </Card>
    );
}

// ==================== Rule Builder Modal ====================

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

    // Sync form when editing rule changes
    React.useEffect(() => {
        if (rule) {
            setFormData({
                name: rule.name,
                description: rule.description ?? '',
                trigger: rule.trigger,
                conditions: rule.conditions,
                conditionLogic: rule.conditionLogic,
                actions: rule.actions,
                isActive: rule.isActive,
                priority: rule.priority,
            });
        } else {
            setFormData({
                name: '',
                description: '',
                trigger: 'ORDER_CREATED',
                conditions: [],
                conditionLogic: 'AND',
                actions: [],
                isActive: true,
                priority: 5,
            });
        }
    }, [rule, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.actions.length === 0) {
            handleApiError(
                new Error('Please add at least one action'),
                'Please add at least one action'
            );
            return;
        }

        if (rule) {
            updateRule(
                { ruleId: rule.ruleId, ...formData },
                { onSuccess: onClose }
            );
        } else {
            createRule(formData, { onSuccess: onClose });
        }
    };

    const addCondition = () => {
        setFormData((prev) => ({
            ...prev,
            conditions: [
                ...prev.conditions,
                { field: 'status', operator: 'EQUALS' as const, value: '' },
            ],
        }));
    };

    const removeCondition = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            conditions: prev.conditions.filter((_, idx) => idx !== index),
        }));
    };

    const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
        setFormData((prev) => ({
            ...prev,
            conditions: prev.conditions.map((cond, idx) =>
                idx === index ? { ...cond, ...updates } : cond
            ),
        }));
    };

    const addAction = () => {
        setFormData((prev) => ({
            ...prev,
            actions: [...prev.actions, { type: 'SEND_TEMPLATE' as const, templateId: '' }],
        }));
    };

    const removeAction = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            actions: prev.actions.filter((_, idx) => idx !== index),
        }));
    };

    const updateAction = (index: number, updates: Partial<RuleAction>) => {
        setFormData((prev) => ({
            ...prev,
            actions: prev.actions.map((action, idx) =>
                idx === index ? { ...action, ...updates } : action
            ),
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0"
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                <DialogHeader className="p-6 border-b border-[var(--border-default)]">
                    <DialogTitle className="text-xl">
                        {rule ? 'Edit Rule' : 'Create Notification Rule'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Name & Description */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Rule Name *
                            </label>
                            <Input
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="e.g., Notify on delivery"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Description
                            </label>
                            <Input
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                                }
                                placeholder="Optional description"
                            />
                        </div>

                        {/* Trigger */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Event Trigger *
                            </label>
                            <Select
                                value={formData.trigger}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        trigger: e.target.value as RuleTrigger,
                                    }))
                                }
                                options={triggerOptions.map((t) => ({
                                    value: t.value,
                                    label: `${t.label} - ${t.description}`,
                                }))}
                            />
                        </div>

                        {/* Conditions */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">
                                    Conditions (Optional)
                                </label>
                                <Button type="button" variant="link" size="sm" onClick={addCondition}>
                                    + Add Condition
                                </Button>
                            </div>

                            {formData.conditions.length > 0 && (
                                <>
                                    <div className="mb-2">
                                        <Select
                                            value={formData.conditionLogic}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    conditionLogic: e.target.value as 'AND' | 'OR',
                                                }))
                                            }
                                            options={[
                                                { value: 'AND', label: 'Match ALL conditions' },
                                                { value: 'OR', label: 'Match ANY condition' },
                                            ]}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        {formData.conditions.map((condition, idx) => (
                                            <div
                                                key={idx}
                                                className="flex gap-2 p-3 bg-[var(--bg-secondary)] rounded-[var(--radius-lg)]"
                                            >
                                                <Input
                                                    value={condition.field}
                                                    onChange={(e) =>
                                                        updateCondition(idx, { field: e.target.value })
                                                    }
                                                    placeholder="Field name"
                                                    size="sm"
                                                    className="flex-1"
                                                />
                                                <Select
                                                    value={condition.operator}
                                                    onChange={(e) =>
                                                        updateCondition(idx, {
                                                            operator: e.target.value as RuleConditionOperator,
                                                        })
                                                    }
                                                    options={operatorOptions}
                                                    className="w-32"
                                                />
                                                <Input
                                                    value={String(condition.value)}
                                                    onChange={(e) =>
                                                        updateCondition(idx, { value: e.target.value })
                                                    }
                                                    placeholder="Value"
                                                    size="sm"
                                                    className="flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeCondition(idx)}
                                                    className="text-[var(--error)] hover:bg-[var(--error-bg)]"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">
                                    Actions *
                                </label>
                                <Button type="button" variant="link" size="sm" onClick={addAction}>
                                    + Add Action
                                </Button>
                            </div>

                            {formData.actions.length === 0 ? (
                                <p className="text-sm text-[var(--text-muted)] italic">
                                    No actions configured. Click &quot;+ Add Action&quot; to get started.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {formData.actions.map((action, idx) => (
                                        <div
                                            key={idx}
                                            className="flex gap-2 p-3 bg-[var(--bg-secondary)] rounded-[var(--radius-lg)]"
                                        >
                                            <Select
                                                value={action.type}
                                                onChange={(e) =>
                                                    updateAction(idx, {
                                                        type: e.target.value as RuleActionType,
                                                    })
                                                }
                                                options={actionTypeOptions}
                                                className="w-40"
                                            />

                                            {action.type === 'SEND_TEMPLATE' && (
                                                <Input
                                                    value={action.templateId || ''}
                                                    onChange={(e) =>
                                                        updateAction(idx, {
                                                            templateId: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Template ID"
                                                    size="sm"
                                                    className="flex-1"
                                                />
                                            )}

                                            {action.type === 'SEND_WEBHOOK' && (
                                                <Input
                                                    type="url"
                                                    value={action.webhookUrl || ''}
                                                    onChange={(e) =>
                                                        updateAction(idx, {
                                                            webhookUrl: e.target.value,
                                                        })
                                                    }
                                                    placeholder="Webhook URL"
                                                    size="sm"
                                                    className="flex-1"
                                                />
                                            )}

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeAction(idx)}
                                                className="text-[var(--error)] hover:bg-[var(--error-bg)]"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Priority & Active */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Priority (1-10)
                                </label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={formData.priority}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            priority: parseInt(e.target.value, 10) || 5,
                                        }))
                                    }
                                />
                            </div>

                            <div className="flex items-end">
                                <Checkbox
                                    id="rule-active"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            isActive: checked === true,
                                        }))
                                    }
                                />
                                <label
                                    htmlFor="rule-active"
                                    className="ml-3 text-sm text-[var(--text-secondary)] cursor-pointer"
                                >
                                    Activate rule immediately
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 border-t border-[var(--border-default)] gap-3">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                            {!isSubmitting && <Check className="w-4 h-4 mr-2" />}
                            {rule ? 'Update Rule' : 'Create Rule'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
