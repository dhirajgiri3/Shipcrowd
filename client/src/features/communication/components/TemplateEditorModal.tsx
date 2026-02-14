/**
 * TemplateEditorModal
 *
 * Centralized modal for creating and editing communication templates.
 * Supports SMS, Email, WhatsApp with variable insertion.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    useCreateTemplate,
    useUpdateTemplate,
} from '@/src/core/api/hooks/communication/useCommunication';
import {
    Button,
    Input,
    Textarea,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Select,
    Checkbox,
} from '@/src/components/ui';
import { Check } from 'lucide-react';
import type {
    CommunicationTemplate,
    TemplateType,
    TemplateCategory,
    CreateTemplatePayload,
} from '@/src/types/api/communication';
import { AVAILABLE_VARIABLES } from '@/src/types/api/communication';
import { typeOptions, categoryOptions } from '@/src/features/communication/constants';

export interface TemplateEditorModalProps {
    isOpen: boolean;
    template: CommunicationTemplate | null;
    onClose: () => void;
}

export function TemplateEditorModal({ isOpen, template, onClose }: TemplateEditorModalProps) {
    const [formData, setFormData] = useState<CreateTemplatePayload>({
        name: template?.name ?? '',
        type: template?.type ?? 'SMS',
        category: template?.category ?? 'CUSTOM',
        subject: template?.subject ?? '',
        content: template?.content ?? '',
        isActive: template?.isActive ?? true,
    });

    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate();
    const { mutate: updateTemplate, isPending: isUpdating } = useUpdateTemplate();

    const isSubmitting = isCreating || isUpdating;

    useEffect(() => {
        if (template) {
            setFormData({
                name: template.name,
                type: template.type,
                category: template.category,
                subject: template.subject ?? '',
                content: template.content,
                isActive: template.isActive,
            });
        } else {
            setFormData({
                name: '',
                type: 'SMS',
                category: 'CUSTOM',
                subject: '',
                content: '',
                isActive: true,
            });
        }
    }, [template, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (template) {
            updateTemplate(
                { templateId: template.templateId, ...formData },
                { onSuccess: onClose }
            );
        } else {
            createTemplate(formData, { onSuccess: onClose });
        }
    };

    const insertVariable = (variableName: string) => {
        const before = formData.content.substring(0, cursorPosition);
        const after = formData.content.substring(cursorPosition);
        const newContent = `${before}{{${variableName}}}${after}`;

        setFormData((prev) => ({ ...prev, content: newContent }));

        setTimeout(() => {
            const newPosition = cursorPosition + variableName.length + 4;
            textareaRef.current?.setSelectionRange(newPosition, newPosition);
            textareaRef.current?.focus();
        }, 0);
    };

    const characterCount = formData.content.length;
    const smsCount = formData.type === 'SMS' ? Math.ceil(characterCount / 160) : 0;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0"
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                <DialogHeader className="p-6 border-b border-[var(--border-default)]">
                    <DialogTitle className="text-xl">
                        {template ? 'Edit Template' : 'Create Template'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Name & Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Template Name *
                                </label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                                    }
                                    placeholder="e.g., Order Shipped Notification"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Type *
                                </label>
                                <Select
                                    value={formData.type}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            type: e.target.value as TemplateType,
                                        }))
                                    }
                                    options={typeOptions.map((t) => ({
                                        value: t.value,
                                        label: t.label,
                                    }))}
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Category *
                            </label>
                            <Select
                                value={formData.category}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        category: e.target.value as TemplateCategory,
                                    }))
                                }
                                options={categoryOptions.map((c) => ({
                                    value: c.value,
                                    label: c.label,
                                }))}
                            />
                        </div>

                        {/* Subject (for Email) */}
                        {formData.type === 'EMAIL' && (
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Subject *
                                </label>
                                <Input
                                    value={formData.subject || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, subject: e.target.value }))
                                    }
                                    placeholder="Email subject line"
                                    required={formData.type === 'EMAIL'}
                                />
                            </div>
                        )}

                        {/* Content */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-[var(--text-secondary)]">
                                    Message Content *
                                </label>
                                <div className="text-xs text-[var(--text-muted)]">
                                    {characterCount} characters
                                    {formData.type === 'SMS' && ` • ${smsCount} SMS`}
                                </div>
                            </div>
                            <Textarea
                                ref={textareaRef}
                                value={formData.content}
                                onChange={(e) => {
                                    setFormData((prev) => ({ ...prev, content: e.target.value }));
                                    setCursorPosition(e.target.selectionStart);
                                }}
                                onSelect={(e) =>
                                    setCursorPosition(e.currentTarget.selectionStart)
                                }
                                placeholder="Type your message here. Use {{variableName}} for dynamic content."
                                required
                                rows={8}
                                className="font-mono text-sm"
                            />
                        </div>

                        {/* Variable Inserter */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Available Variables
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {AVAILABLE_VARIABLES.map((variable) => (
                                    <Button
                                        key={variable.name}
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => insertVariable(variable.name)}
                                        title={variable.description}
                                        className="justify-start text-left h-auto py-2 px-3"
                                    >
                                        <span className="font-mono text-[var(--primary-blue)] text-xs">
                                            {`{{${variable.name}}}`}
                                        </span>
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="template-active"
                                checked={formData.isActive}
                                onCheckedChange={(checked) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        isActive: checked === true,
                                    }))
                                }
                            />
                            <label
                                htmlFor="template-active"
                                className="text-sm text-[var(--text-secondary)] cursor-pointer"
                            >
                                Activate this template immediately
                            </label>
                        </div>
                    </div>

                    <DialogFooter className="p-6 border-t border-[var(--border-default)] gap-3">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
                            {!isSubmitting && <Check className="w-4 h-4 mr-2" />}
                            {template ? 'Update Template' : 'Create Template'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
