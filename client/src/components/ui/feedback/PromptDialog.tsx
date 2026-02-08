"use client";

import { Button, type ButtonProps } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/src/components/ui/feedback/Dialog';

interface PromptDialogProps {
    open: boolean;
    title: string;
    description?: string;
    label?: string;
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: ButtonProps['variant'];
    isLoading?: boolean;
    inputType?: 'text' | 'number';
    min?: number;
    max?: number;
    multiline?: boolean;
    required?: boolean;
    helperText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function PromptDialog({
    open,
    title,
    description,
    label,
    placeholder,
    value,
    onChange,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'primary',
    isLoading = false,
    inputType = 'text',
    min,
    max,
    multiline = false,
    required = false,
    helperText,
    onConfirm,
    onCancel,
}: PromptDialogProps) {
    const isDisabled = required && !value.trim();

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description ? (
                        <DialogDescription>{description}</DialogDescription>
                    ) : null}
                </DialogHeader>

                <div className="space-y-2">
                    {label ? (
                        <label className="text-xs text-[var(--text-muted)]">{label}</label>
                    ) : null}
                    {multiline ? (
                        <textarea
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder}
                            className="w-full min-h-[96px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]/20"
                        />
                    ) : (
                        <Input
                            type={inputType}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder}
                            min={min}
                            max={max}
                        />
                    )}
                    {helperText ? (
                        <p className="text-xs text-[var(--text-muted)]">{helperText}</p>
                    ) : null}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                        {cancelText}
                    </Button>
                    <Button
                        variant={confirmVariant}
                        onClick={onConfirm}
                        disabled={isLoading || isDisabled}
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
