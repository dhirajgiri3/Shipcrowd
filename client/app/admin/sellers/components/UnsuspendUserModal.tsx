import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';
import { apiClient } from '@/src/core/api/http';

interface UnsuspendUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    onSuccess: () => void;
}

export const UnsuspendUserModal: React.FC<UnsuspendUserModalProps> = ({ isOpen, onClose, userId, userName, onSuccess }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            setIsSubmitting(true);
            await apiClient.post(`/admin/users/${userId}/unsuspend`, {
                reason
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to unsuspend user. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl shadow-xl w-full max-w-md overflow-hidden relative"
                >
                    <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center bg-green-50 dark:bg-green-900/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full text-green-600">
                                <CheckCircle size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-green-700 dark:text-green-400">Reactivate Account</h2>
                        </div>
                        <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <p className="text-sm text-[var(--text-secondary)]">
                            Are you sure you want to reactive access for <span className="font-bold text-[var(--text-primary)]">{userName}</span>?
                        </p>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Reason (Optional)</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Providing a reason creates a better audit trail..."
                                className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 min-h-[80px]"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 justify-end pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-[var(--border-default)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Reactivate Access'
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};
