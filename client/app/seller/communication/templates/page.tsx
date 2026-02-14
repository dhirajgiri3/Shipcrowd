/**
 * Communication Templates Manager Page
 *
 * Manage SMS/Email templates for automated notifications.
 * Features: Template list with filters, create/edit with variable insertion, test send.
 *
 * Refactored per Frontend_Refactor.md:
 * - PageHeader, Button, SearchInput, EmptyState, Card, Badge
 * - Centralized TemplateEditorModal from features/communication
 * - useDebouncedValue for search
 * - Design system tokens throughout
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
    useTemplates,
    useDeleteTemplate,
    useTestTemplate,
} from '@/src/core/api/hooks/communication/useCommunication';
import {
    Plus,
    Mail,
    MessageSquare,
    Edit,
    Trash2,
    Send,
    RefreshCw,
} from 'lucide-react';
import {
    Button,
    Card,
    Badge,
    SearchInput,
    Select,
    EmptyState,
    ConfirmDialog,
    Loader,
    CardSkeleton,
} from '@/src/components/ui';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { TemplateEditorModal } from '@/src/features/communication/components';
import { typeOptions, categoryOptions } from '@/src/features/communication/constants';
import { useDebouncedValue } from '@/src/hooks/data/useDebouncedValue';
import { cn } from '@/src/lib/utils';
import type {
    CommunicationTemplate,
    TemplateType,
} from '@/src/types/api/communication';

// ==================== Main Page ====================

export default function TemplatesPage() {
    const [filterType, setFilterType] = useState<TemplateType | ''>('');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery, 300);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data: templates, isLoading, refetch } = useTemplates({
        type: filterType || undefined,
        search: debouncedSearch || undefined,
    });

    const handleCreateTemplate = useCallback(() => {
        setEditingTemplate(null);
        setIsCreateModalOpen(true);
    }, []);

    const handleEditTemplate = useCallback((template: CommunicationTemplate) => {
        setEditingTemplate(template);
        setIsCreateModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsCreateModalOpen(false);
        setEditingTemplate(null);
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    }, [refetch]);

    const templatesList = templates ?? [];

    return (
        <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Communication Templates"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/seller/dashboard' },
                    { label: 'Templates', active: true },
                ]}
                description="Manage SMS and Email templates for automated customer notifications"
                showBack={false}
                actions={
                    <Button onClick={handleCreateTemplate} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                    </Button>
                }
            />

            {/* Filters */}
            <div className="flex items-center gap-3">
                <SearchInput
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    widthClass="flex-1 max-w-md"
                />
                <Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as TemplateType | '')}
                    options={[
                        { value: '', label: 'All Types' },
                        ...typeOptions.map((t) => ({ value: t.value, label: t.label })),
                    ]}
                    className="w-40"
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

            {/* Templates Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <CardSkeleton key={idx} />
                    ))}
                </div>
            ) : templatesList.length === 0 ? (
                <Card padding="lg">
                    <EmptyState
                        variant="noItems"
                        title="No Templates Found"
                        description="Create your first communication template to get started"
                        action={{
                            label: 'Create Template',
                            onClick: handleCreateTemplate,
                            variant: 'primary',
                            icon: <Plus className="w-4 h-4" />,
                        }}
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templatesList.map((template) => (
                        <TemplateCard
                            key={template._id}
                            template={template}
                            onEdit={handleEditTemplate}
                        />
                    ))}
                </div>
            )}

            <TemplateEditorModal
                isOpen={isCreateModalOpen}
                template={editingTemplate}
                onClose={handleCloseModal}
            />
        </div>
    );
}

// ==================== Template Card ====================

interface TemplateCardProps {
    template: CommunicationTemplate;
    onEdit: (template: CommunicationTemplate) => void;
}

function TemplateCard({ template, onEdit }: TemplateCardProps) {
    const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();
    const { mutate: testTemplate, isPending: isTesting } = useTestTemplate();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleTest = useCallback(() => {
        testTemplate({
            templateId: template.templateId,
            sampleData: {
                customerName: 'John Doe',
                trackingNumber: 'TRK123456',
                orderDate: new Date().toLocaleDateString(),
            },
        });
    }, [template.templateId, testTemplate]);

    const Icon = typeOptions.find((t) => t.value === template.type)?.icon ?? MessageSquare;

    return (
        <Card hover padding="md">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            'w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center',
                            template.type === 'EMAIL'
                                ? 'bg-[var(--primary-blue-soft)]'
                                : 'bg-[var(--success-bg)]'
                        )}
                    >
                        <Icon
                            className={cn(
                                'w-5 h-5',
                                template.type === 'EMAIL'
                                    ? 'text-[var(--primary-blue)]'
                                    : 'text-[var(--success)]'
                            )}
                        />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">
                            {template.name}
                        </h3>
                        <span className="text-xs text-[var(--text-secondary)]">
                            {categoryOptions.find((c) => c.value === template.category)?.label}
                        </span>
                    </div>
                </div>
                <Badge
                    variant={template.isActive ? 'success' : 'neutral'}
                    size="sm"
                >
                    {template.isActive ? 'Active' : 'Inactive'}
                </Badge>
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
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(template)}
                    className="flex-1"
                >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTest}
                    disabled={isTesting}
                    className="flex-1"
                >
                    {isTesting ? (
                        <Loader variant="dots" size="sm" />
                    ) : (
                        <>
                            <Send className="w-4 h-4 mr-1" />
                            Test
                        </>
                    )}
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
        </Card>
    );
}
