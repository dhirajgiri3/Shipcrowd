"use client";

import { showSuccessToast } from '@/src/lib/error';

import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AddWarehouseForm } from './AddWarehouseForm';
import { useUpdateWarehouse, CreateWarehousePayload, Warehouse } from '@/src/core/api/hooks/logistics/useWarehouses';

interface EditWarehouseModalProps {
    warehouse: Warehouse;
    isOpen: boolean;
    onClose: () => void;
}

export function EditWarehouseModal({ warehouse, isOpen, onClose }: EditWarehouseModalProps) {
    const { mutate: updateWarehouse, isPending } = useUpdateWarehouse();

    const handleSubmit = (data: CreateWarehousePayload) => {
        updateWarehouse(
            { warehouseId: warehouse._id, data },
            {
                onSuccess: () => {
                    showSuccessToast('Warehouse updated successfully');
                    onClose();
                },
            }
        );
    };

    const handleMakeDefault = () => {
        updateWarehouse(
            { warehouseId: warehouse._id, data: { isDefault: true } },
            {
                onSuccess: () => {
                    showSuccessToast('Default warehouse updated');
                    onClose();
                },
            }
        );
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Enhanced Backdrop with smoother fade */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 0.25,
                            ease: [0.4, 0, 0.2, 1] // Custom easing for smoothness
                        }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-md"
                        onClick={() => !isPending && onClose()}
                    />

                    {/* Enhanced Modal Content */}
                    <motion.div
                        initial={{
                            opacity: 0,
                            scale: 0.96,
                            y: 16,
                        }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                        }}
                        exit={{
                            opacity: 0,
                            scale: 0.96,
                            y: 8,
                        }}
                        transition={{
                            duration: 0.3,
                            ease: [0.16, 1, 0.3, 1], // Smooth, natural easing
                        }}
                        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[var(--bg-primary)] rounded-2xl shadow-[0_20px_80px_-12px_rgba(0,0,0,0.5)] overflow-hidden z-10 ring-1 ring-white/5"
                    >
                        {/* Clean Header - Removed gradients and icons */}
                        <div className="shrink-0 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                                        Edit Warehouse
                                    </h2>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                                        Update warehouse information and preferences
                                    </p>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onClose}
                                    disabled={isPending}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                                    aria-label="Close modal"
                                >
                                    <X className="w-5 h-5 transition-transform duration-200 group-hover:rotate-90" />
                                </motion.button>
                            </div>
                        </div>

                        {/* Scrollable Content with enhanced scrollbar */}
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[var(--border-default)] hover:scrollbar-thumb-[var(--border-hover)] scrollbar-track-transparent">
                            <AddWarehouseForm
                                mode="edit"
                                initialData={warehouse}
                                onSubmit={handleSubmit}
                                onCancel={onClose}
                                isLoading={isPending}
                            />
                        </div>

                        {/* Enhanced Footer - Make Default Button */}
                        {!warehouse.isDefault && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="shrink-0 border-t border-[var(--border-subtle)] px-6 py-4 bg-[var(--bg-secondary)]/30 backdrop-blur-sm"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                                            Set as Default Warehouse
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                                            Make this your primary pickup location for all new shipments
                                        </p>
                                    </div>

                                    {/* Clean Make Default Button - Removed gradients */}
                                    <button
                                        onClick={handleMakeDefault}
                                        disabled={isPending}
                                        className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[100px] flex justify-center items-center"
                                    >
                                        {isPending ? 'Setting...' : 'Make Default'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
