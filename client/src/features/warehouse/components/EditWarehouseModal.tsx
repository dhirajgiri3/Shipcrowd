"use client";

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AddWarehouseForm } from './AddWarehouseForm';
import { useUpdateWarehouse, CreateWarehousePayload, Warehouse } from '@/src/core/api/hooks/logistics/useWarehouses';

interface EditWarehouseModalProps {
    warehouse: Warehouse;
    isOpen: boolean;
    onClose: () => void;
}

export function EditWarehouseModal({ warehouse, isOpen, onClose }: EditWarehouseModalProps) {
    const { mutate: updateWarehouse, isPending } = useUpdateWarehouse();

    if (!isOpen) return null;

    const handleSubmit = (data: CreateWarehousePayload) => {
        updateWarehouse(
            { warehouseId: warehouse._id, data },
            {
                onSuccess: () => {
                    onClose();
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-[var(--bg-primary)] border-b border-[var(--border-default)] px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                            Edit Warehouse
                        </h2>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Update warehouse details
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                    <AddWarehouseForm
                        mode="edit"
                        initialData={warehouse}
                        onSubmit={handleSubmit}
                        onCancel={onClose}
                        isLoading={isPending}
                    />
                </div>
            </div>
        </div>
    );
}
