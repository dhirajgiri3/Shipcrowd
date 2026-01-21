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
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isPending) {
                    onClose();
                }
            }}
        >
            <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">
                            Edit Warehouse
                        </h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            Update warehouse information and contact details
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
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
