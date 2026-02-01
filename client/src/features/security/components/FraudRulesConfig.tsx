/**
 * FraudRulesConfig Component
 * 
 * Interface for configuring fraud detection rules, thresholds, and actions.
 */

'use client';

import { useFraudRules, useUpdateFraudRule } from '@/src/core/api/hooks/security/useSecurity';
import { Settings, Shield, Info, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Card, Switch, Input, Label, Button, Badge, Loader } from '@/src/components/ui';
import type { SecurityFraudRule as FraudRule, UpdateFraudRulePayload } from '@/src/types/security';

export function FraudRulesConfig() {
    // FETCH DATA
    const { data: rules, isLoading } = useFraudRules();
    const { mutate: updateRule, isPending: isUpdating } = useUpdateFraudRule();

    if (isLoading) {
        return (
            <Card className="p-8 flex items-center justify-center min-h-[200px]">
                <Loader variant="dots" />
            </Card>
        );
    }

    const handleToggle = (rule: FraudRule) => {
        updateRule({ ruleId: rule.id, isEnabled: !rule.isEnabled });
    };

    const handleActionChange = (rule: FraudRule, action: 'flag' | 'block' | 'review') => {
        updateRule({ ruleId: rule.id, isEnabled: rule.isEnabled, action });
    };

    return (
        <Card className="bg-[var(--bg-primary)] border-[var(--border-default)] overflow-hidden">
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Settings className="w-5 h-5 text-[var(--text-secondary)]" />
                        Detection Rules
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Configure thresholds for automated risk detection.
                    </p>
                </div>
                {isUpdating && <div className="flex items-center gap-2 text-sm text-[var(--primary-blue)]"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</div>}
            </div>

            <div className="divide-y divide-[var(--border-subtle)]">
                {rules?.map((rule) => (
                    <div key={rule.id} className="p-5 flex flex-col sm:flex-row sm:items-start gap-5 transition-colors hover:bg-[var(--bg-hover)]/30">
                        {/* Status Switch */}
                        <div className="pt-1">
                            <Switch
                                checked={rule.isEnabled}
                                onCheckedChange={() => handleToggle(rule)}
                                disabled={isUpdating}
                            />
                        </div>

                        {/* Rule Info */}
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                                <h3 className={cn(
                                    "font-medium",
                                    rule.isEnabled ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                                )}>
                                    {rule.name}
                                </h3>
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                    {rule.severity}
                                </Badge>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {rule.description}
                            </p>

                            {/* Controls (Only visible when active) */}
                            {rule.isEnabled && (
                                <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
                                    <div>
                                        <Label className="text-xs text-[var(--text-muted)] uppercase mb-1.5 block">Threshold</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                defaultValue={rule.threshold}
                                                className="h-9 w-32 bg-[var(--bg-primary)]"
                                                disabled={isUpdating}
                                            // In a real app, this would be debounced or have a save button
                                            />
                                            <span className="text-sm text-[var(--text-muted)]">
                                                {rule.type === 'rto_probability' ? '%' :
                                                    rule.type === 'order_amount' ? 'INR' :
                                                        rule.type === 'velocity' ? 'Orders/Day' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="text-xs text-[var(--text-muted)] uppercase mb-1.5 block">Automated Action</Label>
                                        <div className="flex gap-2">
                                            {(['flag', 'review', 'block'] as const).map((action) => (
                                                <button
                                                    key={action}
                                                    onClick={() => handleActionChange(rule, action)}
                                                    disabled={isUpdating}
                                                    className={cn(
                                                        "px-3 py-1.5 text-xs font-medium rounded-md border transition-all",
                                                        rule.action === action
                                                            ? "bg-[var(--primary-blue)] text-white border-transparent shadow-sm"
                                                            : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
                                                    )}
                                                >
                                                    {action.charAt(0).toUpperCase() + action.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
