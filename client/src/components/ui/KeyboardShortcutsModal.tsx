/**
 * Keyboard Shortcuts Modal (Phase 4: Premium Polish)
 * 
 * Shows all available keyboard shortcuts
 * Triggered by pressing "?"
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import type { KeyboardShortcut } from '@/src/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
    shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsModal({ isOpen, onClose, shortcuts }: KeyboardShortcutsModalProps) {
    // Group shortcuts by category
    const navigationShortcuts = shortcuts.filter((s) => s.category === 'navigation');
    const actionShortcuts = shortcuts.filter((s) => s.category === 'actions');
    const helpShortcuts = shortcuts.filter((s) => s.category === 'help');

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl"
                    >
                        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-2xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--primary-blue-soft)]">
                                        <Keyboard className="w-5 h-5 text-[var(--primary-blue)]" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                            Keyboard Shortcuts
                                        </h2>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            Navigate faster with keyboard shortcuts
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                                </button>
                            </div>

                            {/* Shortcuts Grid */}
                            <div className="space-y-6">
                                {/* Navigation */}
                                {navigationShortcuts.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                                            Navigation
                                        </h3>
                                        <div className="space-y-2">
                                            {navigationShortcuts.map((shortcut) => (
                                                <ShortcutRow key={shortcut.key} shortcut={shortcut} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                {actionShortcuts.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                                            Actions
                                        </h3>
                                        <div className="space-y-2">
                                            {actionShortcuts.map((shortcut) => (
                                                <ShortcutRow key={shortcut.key} shortcut={shortcut} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Help */}
                                {helpShortcuts.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                                            Help
                                        </h3>
                                        <div className="space-y-2">
                                            {helpShortcuts.map((shortcut) => (
                                                <ShortcutRow key={shortcut.key} shortcut={shortcut} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                                <p className="text-xs text-[var(--text-muted)] text-center">
                                    Press <kbd className="px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-xs">?</kbd> anytime to show this dialog
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function ShortcutRow({ shortcut }: { shortcut: KeyboardShortcut }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
            <span className="text-sm text-[var(--text-primary)]">{shortcut.description}</span>
            <kbd className="px-3 py-1.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-sm font-semibold shadow-sm">
                {shortcut.key === '?' ? 'Shift + /' : shortcut.key.toUpperCase()}
            </kbd>
        </div>
    );
}
