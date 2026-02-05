'use client';

import { useEffect, useState } from 'react';
import { Loader2, Package, RefreshCw, Trash2, FileWarning } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/src/components/ui/feedback/Dialog';
import { Button } from '@/src/components/ui/core/Button';
import { useSuggestDisposition, useExecuteDisposition } from '@/src/core/api/hooks/rto/useRTOManagement';
import type { RTODispositionAction } from '@/src/types/api/rto.types';
import { RTO_DISPOSITION_LABELS } from '@/src/types/api/rto.types';

const ACTION_ICONS: Record<RTODispositionAction, React.ReactNode> = {
    restock: <Package className="w-4 h-4" />,
    refurb: <RefreshCw className="w-4 h-4" />,
    dispose: <Trash2 className="w-4 h-4" />,
    claim: <FileWarning className="w-4 h-4" />,
};

interface RTODispositionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rtoId: string;
    onSuccess?: () => void;
}

export function RTODispositionModal({ open, onOpenChange, rtoId, onSuccess }: RTODispositionModalProps) {
    const [selectedAction, setSelectedAction] = useState<RTODispositionAction | null>(null);
    const [notes, setNotes] = useState('');

    const { data: suggestion, isLoading: loadingSuggestion, refetch } = useSuggestDisposition(open ? rtoId : null);
    const executeDisposition = useExecuteDisposition();

    useEffect(() => {
        if (open && suggestion?.action) {
            setSelectedAction(suggestion.action);
        }
    }, [open, suggestion?.action]);

    useEffect(() => {
        if (!open) {
            setSelectedAction(null);
            setNotes('');
        }
    }, [open]);

    const handleSubmit = () => {
        if (!selectedAction) return;
        executeDisposition.mutate(
            { rtoId, action: selectedAction, notes: notes.trim() || undefined },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    onSuccess?.();
                },
            }
        );
    };

    const loading = loadingSuggestion;
    const canSubmit = !!selectedAction && !executeDisposition.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <DialogHeader>
                    <DialogTitle className="text-[var(--text-primary)]">Set disposition</DialogTitle>
                    <DialogDescription className="text-[var(--text-secondary)]">
                        Choose how to handle this returned item after QC.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-blue)]" />
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        {suggestion && (
                            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 text-sm">
                                <p className="font-medium text-[var(--text-primary)]">Suggested action</p>
                                <p className="mt-1 text-[var(--text-secondary)]">{suggestion.reason}</p>
                                <p className="mt-1 text-[var(--text-muted)]">
                                    Recommendation: <strong>{RTO_DISPOSITION_LABELS[suggestion.action]}</strong>
                                </p>
                            </div>
                        )}

                        <div>
                            <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">Choose action</p>
                            <div className="grid grid-cols-2 gap-2">
                                {(['restock', 'refurb', 'dispose', 'claim'] as RTODispositionAction[]).map((action) => (
                                    <button
                                        key={action}
                                        type="button"
                                        onClick={() => setSelectedAction(action)}
                                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                                            selectedAction === action
                                                ? 'border-[var(--primary-blue)] bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]'
                                                : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                                        }`}
                                    >
                                        {ACTION_ICONS[action]}
                                        {RTO_DISPOSITION_LABELS[action]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="disposition-notes" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                                Notes (optional)
                            </label>
                            <textarea
                                id="disposition-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any notes for this disposition..."
                                rows={2}
                                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-blue)]"
                                maxLength={500}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={executeDisposition.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="bg-[var(--primary-blue)] hover:opacity-90"
                    >
                        {executeDisposition.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'Apply disposition'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
