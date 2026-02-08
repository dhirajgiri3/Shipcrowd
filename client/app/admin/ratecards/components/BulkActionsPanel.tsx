"use client";

import { useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Badge } from '@/src/components/ui/core/Badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/src/components/ui/feedback/Dialog';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { Power, PowerOff, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface BulkActionsPanelProps {
    selectedCount: number;
    onActivate: () => void;
    onDeactivate: () => void;
    onAdjustPrice: (type: 'increase' | 'decrease', value: number) => void;
    disabled?: boolean;
}

export function BulkActionsPanel({
    selectedCount,
    onActivate,
    onDeactivate,
    onAdjustPrice,
    disabled = false,
}: BulkActionsPanelProps) {
    const { addToast } = useToast();
    const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
    const [adjustmentValue, setAdjustmentValue] = useState('');
    const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'activate' | 'deactivate' | null>(null);

    const numericValue = useMemo(() => parseFloat(adjustmentValue), [adjustmentValue]);
    const isValidPercent = numericValue >= 1 && numericValue <= 100;
    const preview = useMemo(() => {
        const base = 50;
        if (!isValidPercent) return base;
        const multiplier = adjustmentType === 'increase' ? 1 + numericValue / 100 : 1 - numericValue / 100;
        return Math.max(0, Math.round(base * multiplier));
    }, [adjustmentType, isValidPercent, numericValue]);

    const handleApply = () => {
        if (!isValidPercent) {
            addToast('Enter a percentage between 1 and 100', 'error');
            return;
        }
        onAdjustPrice(adjustmentType, numericValue);
        setAdjustmentValue('');
        setShowAdjustmentDialog(false);
    };

    return (
        <>
            <div className="sticky bottom-4 z-30">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-lg px-4 py-3">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <Badge variant="primary" size="sm">
                                {selectedCount} rate card{selectedCount > 1 ? 's' : ''} selected
                            </Badge>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Bulk actions apply to the current selection
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmAction('activate')}
                                disabled={disabled}
                            >
                                <Power className="w-4 h-4 mr-2" /> Activate
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmAction('deactivate')}
                                disabled={disabled}
                            >
                                <PowerOff className="w-4 h-4 mr-2" /> Deactivate
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowAdjustmentDialog(true)}
                                disabled={disabled}
                            >
                                <TrendingUp className="w-4 h-4 mr-2" /> Adjust Pricing
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Adjust Pricing</DialogTitle>
                        <DialogDescription>
                            Increase or decrease pricing for the selected rate cards. Enter a percentage between 1 and 100.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant={adjustmentType === 'increase' ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setAdjustmentType('increase')}
                            >
                                <ArrowUpRight className="w-4 h-4 mr-2" /> Increase
                            </Button>
                            <Button
                                variant={adjustmentType === 'decrease' ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setAdjustmentType('decrease')}
                            >
                                <ArrowDownRight className="w-4 h-4 mr-2" /> Decrease
                            </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr] items-end">
                            <div>
                                <label className="text-xs text-[var(--text-muted)]">Enter % (1-100)</label>
                                <Input
                                    type="number"
                                    placeholder="Enter % (1-100)"
                                    value={adjustmentValue}
                                    onChange={(e) => setAdjustmentValue(e.target.value)}
                                    min="1"
                                    max="100"
                                />
                            </div>
                            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs">
                                Preview: Base Rate ₹50 → ₹{preview}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdjustmentDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleApply} disabled={disabled || !adjustmentValue}>
                            <TrendingUp className="w-4 h-4 mr-2" /> Apply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {confirmAction === 'activate' ? 'Activate rate cards' : 'Deactivate rate cards'}
                        </DialogTitle>
                        <DialogDescription>
                            {confirmAction === 'activate'
                                ? 'This will activate all selected rate cards.'
                                : 'This will deactivate all selected rate cards.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmAction(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant={confirmAction === 'deactivate' ? 'danger' : 'primary'}
                            onClick={() => {
                                if (confirmAction === 'activate') onActivate();
                                if (confirmAction === 'deactivate') onDeactivate();
                                setConfirmAction(null);
                            }}
                            disabled={disabled}
                        >
                            {confirmAction === 'activate' ? 'Activate' : 'Deactivate'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
