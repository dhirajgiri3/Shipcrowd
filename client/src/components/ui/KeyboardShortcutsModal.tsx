"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Command } from 'lucide-react';
import type { ShortcutItem } from '@/src/hooks/utility/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
    shortcuts: ShortcutItem[];
}

export function KeyboardShortcutsModal({ isOpen, onClose, shortcuts }: KeyboardShortcutsModalProps) {
    // Group shortcuts by group
    const navigationShortcuts = shortcuts.filter((s) => s.group === 'Navigation');
    const actionShortcuts = shortcuts.filter((s) => s.group === 'Actions');
    const generalShortcuts = shortcuts.filter((s) => s.group === 'General');

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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20, x: "-50%" }}
                        animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
                        exit={{ opacity: 0, scale: 0.95, y: 20, x: "-50%" }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="fixed left-1/2 top-1/2 z-[101] w-full max-w-2xl px-4"
                    >
                        <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-2xl)] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
                            {/* Header */}
                            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-[var(--radius-xl)] bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] shadow-sm">
                                        <Keyboard className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                                            Keyboard Shortcuts
                                        </h2>
                                        <p className="text-sm text-[var(--text-secondary)] font-medium">
                                            Supercharge your workflow
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto scrollbar-premium flex-1">
                                <div className="grid gap-8">
                                    <ShortcutGroup title="Navigation" shortcuts={navigationShortcuts} />
                                    <ShortcutGroup title="Actions" shortcuts={actionShortcuts} />
                                    <ShortcutGroup title="General" shortcuts={generalShortcuts} />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-[var(--bg-secondary)]/30 border-t border-[var(--border-subtle)] flex justify-center">
                                <p className="text-xs font-medium text-[var(--text-tertiary)] flex items-center gap-2">
                                    <Command className="w-3 h-3" />
                                    Press <Kbd>?</Kbd> anywhere to toggle this menu
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function ShortcutGroup({ title, shortcuts }: { title: string, shortcuts: ShortcutItem[] }) {
    if (shortcuts.length === 0) return null;
    return (
        <div>
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 px-2">
                {title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {shortcuts.map((shortcut) => (
                    <div
                        key={shortcut.key}
                        className="group flex items-center justify-between p-3 rounded-[var(--radius-lg)] hover:bg-[var(--bg-secondary)] transition-colors border border-transparent hover:border-[var(--border-subtle)]"
                    >
                        <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--primary-blue)] transition-colors">
                            {shortcut.description}
                        </span>
                        <div className="flex gap-1">
                            {shortcut.key.split(' ').map((k, i) => (
                                <Kbd key={i}>{k}</Kbd>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="min-w-[24px] h-6 px-1.5 flex items-center justify-center rounded-[6px] bg-[var(--bg-tertiary)] border border-[var(--border-strong)] text-[11px] font-bold text-[var(--text-secondary)] font-mono shadow-[0_1px_0_var(--border-strong)]">
            {children}
        </kbd>
    );
}
