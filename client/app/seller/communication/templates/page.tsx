/**
 * Communication Templates Manager Page
 * 
 * Manage SMS/Email templates for automated notifications.
 * Features:
 * - Template list with filters
 * - Create/edit templates with variable insertion
 * - Preview functionality
 * - Test send
 */

'use client';

import React, { useState } from 'react';
import {
    useTemplates,
    useCreateTemplate,
    useUpdateTemplate,
    useDeleteTemplate,
    useTestTemplate,
} from '@/src/core/api/hooks/communication/useCommunication';
import {
    Plus,
    Mail,
    MessageSquare,
    Search,
    Edit,
    Trash2,
    Send,
    Eye,
    X,
    Check,
    Copy,
    RefreshCw,
} from 'lucide-react';
import { Loader, CardSkeleton } from '@/src/components/ui';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';
import type {
    CommunicationTemplate,
    TemplateType,
    TemplateCategory,
    CreateTemplatePayload,
    AVAILABLE_VARIABLES,
} from '@/src/types/api/communication';
import { AVAILABLE_VARIABLES as TEMPLATE_VARIABLES } from '@/src/types/api/communication';

// ==================== Type/Category Config ====================

const typeOptions: { value: TemplateType; label: string; icon: typeof Mail }[] = [
    { value: 'SMS', label: 'SMS', icon: MessageSquare },
    { value: 'EMAIL', label: 'Email', icon: Mail },
    { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
];

const categoryOptions: { value: TemplateCategory; label: string }[] = [
    { value: 'ORDER_CONFIRMATION', label: 'Order Confirmation' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'NDR', label: 'NDR Alert' },
    { value: 'RETURN_INITIATED', label: 'Return Initiated' },
    { value: 'RETURN_RECEIVED', label: 'Return Received' },
    { value: 'REFUND_PROCESSED', label: 'Refund Processed' },
    { value: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled' },
    { value: 'CUSTOM', label: 'Custom' },
];

// ==================== Component ====================

export default function TemplatesPage() {
    const [filterType, setFilterType] = useState<TemplateType | ''>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);

    // API hooks
    const { data: templates, isLoading, refetch } = useTemplates({
        type: filterType || undefined,
        search: searchQuery || undefined,
    });

    const handleCreateTemplate = () => {
        setEditingTemplate(null);
        setIsCreateModalOpen(true);
    };

    const handleEditTemplate = (template: CommunicationTemplate) => {
        setEditingTemplate(template);
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingTemplate(null);
    };

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                            Communication Templates
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            Manage SMS and Email templates for automated customer notifications
                        </p>
                    </div>
                    <button
                        onClick={handleCreateTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue)]/90 text-white font-medium rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Create Template
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-4 mb-6">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search templates..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as TemplateType | '')}
                            className="px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] text-[var(--text-primary)]"
                        >
                            <option value="">All Types</option>
                            {typeOptions.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => refetch()}
                            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                        >
                            {isLoading ? <Loader variant="spinner" size="sm" /> : <RefreshCw className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Templates Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <CardSkeleton key={idx} />
                        ))}
                    </div>
                ) : (templates ?? []).length === 0 ? (
                    <div className="text-center py-12 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)]">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                            No Templates Found
                        </h3>
                        <p className="text-[var(--text-secondary)] mb-4">
                            Create your first communication template to get started
                        </p>
                        <button
                            onClick={handleCreateTemplate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue)]/90 text-white rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Template
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(templates ?? []).map(template => (
                            <TemplateCard
                                key={template._id}
                                template={template}
                                onEdit={handleEditTemplate}
                            />
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                {isCreateModalOpen && (
                    <TemplateEditorModal
                        isOpen={isCreateModalOpen}
                        template={editingTemplate}
                        onClose={handleCloseModal}
                    />
                )}
            </div>
        </div>
    );
}

// ==================== Template Card Component ====================

interface TemplateCardProps {
    template: CommunicationTemplate;
    onEdit: (template: CommunicationTemplate) => void;
}

function TemplateCard({ template, onEdit }: TemplateCardProps) {
    const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();
    const { mutate: testTemplate, isPending: isTesting } = useTestTemplate();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDelete = () => {
        setShowDeleteDialog(true);
    };

    const handleTest = () => {
        // In real implementation, show modal to input test phone/email
        testTemplate({
            templateId: template.templateId,
            sampleData: {
                customerName: 'John Doe',
                trackingNumber: 'TRK123456',
                orderDate: new Date().toLocaleDateString(),
            },
        });
    };

    const Icon = typeOptions.find(t => t.value === template.type)?.icon ?? MessageSquare;

    return (
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-default)] p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${template.type === 'EMAIL'
                        ? 'bg-[var(--primary-blue)]/10'
                        : 'bg-[var(--success)]/10'
                        }`}>
                        <Icon className={`w-5 h-5 ${template.type === 'EMAIL'
                            ? 'text-[var(--primary-blue)]'
                            : 'text-[var(--success)]'
                            }`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">
                            {template.name}
                        </h3>
                        <span className="text-xs text-[var(--text-secondary)]">
                            {categoryOptions.find(c => c.value === template.category)?.label}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${template.isActive
                        ? 'bg-[var(--success)]/10 text-[var(--success)]'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                        }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-3">
                {template.content}
            </p>

            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4">
                <span>{template.variables.length} variables</span>
                <span>•</span>
                <span>{template.content.length} chars</span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onEdit(template)}
                    className="flex-1 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                    <Edit className="w-4 h-4" />
                    Edit
                </button>
                <button
                    onClick={handleTest}
                    disabled={isTesting}
                    className="flex-1 px-3 py-2 text-sm text-[var(--primary-blue)] hover:bg-[var(--primary-blue)]/5 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                    {isTesting ? <Loader variant="dots" size="sm" /> : <Send className="w-4 h-4" />}
                    Test
                </button>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-2 text-[var(--error)] hover:bg-[var(--error)]/5 rounded-lg transition-colors disabled:opacity-50"
                >
                    {isDeleting ? <Loader variant="dots" size="sm" /> : <Trash2 className="w-4 h-4" />}
                </button>
            </div>

            <ConfirmDialog
                open={showDeleteDialog}
                title="Delete template"
                description={`Delete template "${template.name}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="danger"
                onCancel={() => setShowDeleteDialog(false)}
                onConfirm={() => {
                    deleteTemplate(template.templateId);
                    setShowDeleteDialog(false);
                }}
            />
        </div>
    );
}

// ==================== Template Editor Modal Component ====================

interface TemplateEditorModalProps {
    isOpen: boolean;
    template: CommunicationTemplate | null;
    onClose: () => void;
}

function TemplateEditorModal({ isOpen, template, onClose }: TemplateEditorModalProps) {
    const [formData, setFormData] = useState<CreateTemplatePayload>({
        name: template?.name ?? '',
        type: template?.type ?? 'SMS',
        category: template?.category ?? 'CUSTOM',
        subject: template?.subject ?? '',
        content: template?.content ?? '',
        isActive: template?.isActive ?? true,
    });

    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate();
    const { mutate: updateTemplate, isPending: isUpdating } = useUpdateTemplate();

    const isSubmitting = isCreating || isUpdating;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (template) {
            updateTemplate({
                templateId: template.templateId,
                ...formData,
            }, {
                onSuccess: onClose,
            });
        } else {
            createTemplate(formData, {
                onSuccess: onClose,
            });
        }
    };

    const insertVariable = (variableName: string) => {
        const before = formData.content.substring(0, cursorPosition);
        const after = formData.content.substring(cursorPosition);
        const newContent = `${before}{{${variableName}}}${after}`;

        setFormData(prev => ({ ...prev, content: newContent }));

        // Move cursor after inserted variable
        setTimeout(() => {
            const newPosition = cursorPosition + variableName.length + 4;
            textareaRef.current?.setSelectionRange(newPosition, newPosition);
            textareaRef.current?.focus();
        }, 0);
    };

    const characterCount = formData.content.length;
    const smsCount = formData.type === 'SMS' ? Math.ceil(characterCount / 160) : 0;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-[var(--bg-primary)] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                        {template ? 'Edit Template' : 'Create Template'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Name & Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Template Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Order Shipped Notification"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Type *
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TemplateType }))}
                                className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] text-[var(--text-primary)]"
                            >
                                {typeOptions.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Category *
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TemplateCategory }))}
                            className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] text-[var(--text-primary)]"
                        >
                            {categoryOptions.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subject (for Email) */}
                    {formData.type === 'EMAIL' && (
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Subject *
                            </label>
                            <input
                                type="text"
                                value={formData.subject || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder="Email subject line"
                                required={formData.type === 'EMAIL'}
                                className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
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
                        <textarea
                            ref={textareaRef}
                            value={formData.content}
                            onChange={(e) => {
                                setFormData(prev => ({ ...prev, content: e.target.value }));
                                setCursorPosition(e.target.selectionStart);
                            }}
                            onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
                            placeholder="Type your message here. Use {{variableName}} for dynamic content."
                            required
                            rows={8}
                            className="w-full px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                        />
                    </div>

                    {/* Variable Inserter */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Available Variables
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {TEMPLATE_VARIABLES.map(variable => (
                                <button
                                    key={variable.name}
                                    type="button"
                                    onClick={() => insertVariable(variable.name)}
                                    className="px-3 py-2 text-xs bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 rounded-lg transition-colors text-left"
                                    title={variable.description}
                                >
                                    <span className="font-mono text-[var(--primary-blue)]">
                                        {`{{${variable.name}}}`}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                            className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--primary-blue)] focus:ring-[var(--primary-blue)]"
                        />
                        <label htmlFor="isActive" className="text-sm text-[var(--text-secondary)]">
                            Activate this template immediately
                        </label>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border-default)]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue)]/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader variant="dots" size="sm" />
                                {template ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                {template ? 'Update Template' : 'Create Template'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
