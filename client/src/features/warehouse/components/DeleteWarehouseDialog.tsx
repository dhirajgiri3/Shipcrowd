"use client";

import { showSuccessToast } from '@/src/lib/error';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { useDeleteWarehouse, Warehouse } from '@/src/core/api/hooks/logistics/useWarehouses';

interface DeleteWarehouseDialogProps {
    warehouse: Warehouse | null;
    isOpen: boolean;
    onClose: () => void;
}

export function DeleteWarehouseDialog({ warehouse, isOpen, onClose }: DeleteWarehouseDialogProps) {
    const { mutate: deleteWarehouse, isPending } = useDeleteWarehouse();

    if (!isOpen || !warehouse) return null;

    const handleDelete = () => {
        deleteWarehouse(warehouse._id, {
            onSuccess: () => {
                showSuccessToast('Warehouse deleted successfully');
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-md">
                {/* Warning Icon */}
                <div className="p-6 pb-4">
                    <div className="h-12 w-12 rounded-full bg-[var(--error-bg)] flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-6 w-6 text-[var(--error)]" />
                    </div>

                    <h2 className="text-xl font-bold text-[var(--text-primary)] text-center mb-2">
                        Delete Warehouse?
                    </h2>

                    <p className="text-sm text-[var(--text-secondary)] text-center mb-4">
                        Are you sure you want to delete <span className="font-semibold text-[var(--text-primary)]">{warehouse.name}</span>?
                    </p>

                    {warehouse.isDefault && (
                        <div className="bg-[var(--warning-bg)] border border-[var(--warning)] rounded-lg p-3 mb-4">
                            <p className="text-sm text-[var(--warning)] font-medium">
                                ⚠️ This is your default warehouse. Another warehouse will be automatically set as default.
                            </p>
                        </div>
                    )}

                    <p className="text-xs text-[var(--text-muted)] text-center">
                        This action cannot be undone. All associated data will be archived.
                    </p>
                </div>

                {/* Actions */}
                <div className="border-t border-[var(--border-default)] p-4 flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isPending}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleDelete}
                        disabled={isPending}
                        className="flex-1 bg-[var(--error)] hover:bg-[var(--error)]/90 text-white border-[var(--error)]"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Warehouse'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
