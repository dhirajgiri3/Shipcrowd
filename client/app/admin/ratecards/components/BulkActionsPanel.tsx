"use client";

import { useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Power, PowerOff, TrendingUp } from 'lucide-react';

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
    const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
    const [adjustmentValue, setAdjustmentValue] = useState('');

    const preview = useMemo(() => {
        const base = 50;
        const value = parseFloat(adjustmentValue);
        if (Number.isNaN(value) || value <= 0) return base;
        const multiplier = adjustmentType === 'increase' ? 1 + value / 100 : 1 - value / 100;
        return Math.max(0, Math.round(base * multiplier));
    }, [adjustmentType, adjustmentValue]);

    const handleApply = () => {
        const value = parseFloat(adjustmentValue);
        if (Number.isNaN(value) || value <= 0) return;
        onAdjustPrice(adjustmentType, value);
    };

    return (
        <div className="bg-[var(--primary-blue-soft)] border-l-4 border-[var(--primary-blue)] rounded-lg p-4 mb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-[var(--text-body-sm)] font-medium">
                    {selectedCount} rate card{selectedCount > 1 ? 's' : ''} selected
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={onActivate} disabled={disabled}>
                        <Power className="w-4 h-4 mr-2" /> Activate
                    </Button>
                    <Button variant="outline" size="sm" onClick={onDeactivate} disabled={disabled}>
                        <PowerOff className="w-4 h-4 mr-2" /> Deactivate
                    </Button>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Button
                            variant={adjustmentType === 'increase' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAdjustmentType('increase')}
                        >
                            Increase
                        </Button>
                        <Button
                            variant={adjustmentType === 'decrease' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAdjustmentType('decrease')}
                        >
                            Decrease
                        </Button>
                        <Input
                            type="number"
                            placeholder="Enter % (1-100)"
                            value={adjustmentValue}
                            onChange={(e) => setAdjustmentValue(e.target.value)}
                            min="1"
                            max="100"
                            className="w-36"
                        />
                        <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-md text-xs">
                            Preview: Base Rate ₹50 → ₹{preview}
                        </div>
                        <Button size="sm" onClick={handleApply} disabled={disabled || !adjustmentValue}>
                            <TrendingUp className="w-4 h-4 mr-2" /> Apply
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
