"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UserX, Shield, Building2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';

interface DemoteUserModalProps {
    user: any;
    onClose: () => void;
    onConfirm: (reason?: string) => void;
    isLoading: boolean;
}

export function DemoteUserModal({ user, onClose, onConfirm, isLoading }: DemoteUserModalProps) {
    const [reason, setReason] = useState('');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-[var(--bg-primary)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden"
            >
                {/* Header */}
                <div className="relative bg-gradient-to-br from-red-500 to-orange-600 p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                            <UserX className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Demote to Seller</h2>
                            <p className="text-red-100 mt-1">Remove admin privileges from this user</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* User Info */}
                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-[var(--text-primary)]">{user.name}</h3>
                                    {user.role === 'super_admin' && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 rounded-full flex items-center gap-1">
                                            <ShieldAlert className="w-3 h-3" />
                                            Super Admin
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
                            </div>
                        </div>

                        {user.companyName && (
                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                <Building2 className="w-4 h-4" />
                                <span>{user.companyName}</span>
                            </div>
                        )}
                    </div>

                    {/* Role Change Visualization */}
                    <div className="flex items-center justify-center gap-4">
                        <div className="text-center">
                            <div className="px-4 py-2 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800 mb-2 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                <p className="text-sm font-medium">Admin</p>
                            </div>
                            <p className="text-xs text-[var(--text-tertiary)]">Current</p>
                        </div>

                        <svg className="w-8 h-8 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>

                        <div className="text-center">
                            <div className="px-4 py-2 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800 mb-2">
                                <p className="text-sm font-medium">Seller</p>
                            </div>
                            <p className="text-xs text-[var(--text-tertiary)]">New Role</p>
                        </div>
                    </div>

                    {/* Warning Box */}
                    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2 text-sm text-orange-900 dark:text-orange-100">
                                <p className="font-medium">What happens after demotion?</p>
                                <ul className="space-y-1 text-orange-700 dark:text-orange-300">
                                    <li>• Admin privileges will be revoked immediately</li>
                                    <li>• Company association is kept intact</li>
                                    <li>• User will only access seller dashboard</li>
                                    <li>• Platform-wide settings become inaccessible</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Reason (Required for audit) */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Reason (Optional but recommended)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Add a note about why this user is being demoted..."
                            rows={3}
                            className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] focus:border-transparent resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => onConfirm(reason || undefined)}
                        disabled={isLoading}
                        className="gap-2 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Demoting...
                            </>
                        ) : (
                            <>
                                <UserX className="w-4 h-4" />
                                Confirm Demotion
                            </>
                        )}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
