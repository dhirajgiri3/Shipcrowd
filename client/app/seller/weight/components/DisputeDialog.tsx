"use client";

import { useState } from 'react';
import { Button } from '@/src/components/ui/core/Button';
import { Textarea } from '@/src/components/ui/core/Textarea';
import { Label } from '@/src/components/ui/core/Label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/src/components/ui/feedback/Dialog';
import { Loader2, UploadCloud } from 'lucide-react';

interface DisputeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { reason: string; proofFiles: string[] }) => void;
    isSubmitting: boolean;
    discrepancyId?: string;
    awbNumber?: string;
}

export function DisputeDialog({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    awbNumber
}: DisputeDialogProps) {
    const [reason, setReason] = useState('');

    // Reset state when opening (simplified)
    // In a real app, you might want to use useEffect to reset when isOpen changes to true

    const handleSubmit = () => {
        if (!reason.trim()) return;
        onSubmit({ reason, proofFiles: [] });
        setReason(''); // Clear after submit
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Dispute Weight Discrepancy</DialogTitle>
                    <DialogDescription>
                        Provide a reason and supporting documents to dispute the charged weight for AWB <span className="font-mono font-medium text-[var(--text-primary)]">{awbNumber}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Dispute Reason</Label>
                        <Textarea
                            id="reason"
                            placeholder="Explain why the charged weight is incorrect..."
                            className="min-h-[100px]"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Supporting Documents (Optional)</Label>
                        <div className="border border-dashed border-[var(--border-default)] rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors">
                            <UploadCloud className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                            <p className="text-sm font-medium text-[var(--text-secondary)]">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                Images or PDFs up to 5MB
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!reason.trim() || isSubmitting}
                        className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)]"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Dispute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
