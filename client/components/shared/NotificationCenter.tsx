"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    X,
    AlertTriangle,
    CheckCircle2,
    Info,
    TrendingUp,
    Package,
    DollarSign,
    Clock
} from "lucide-react";
import { Badge } from "@/src/shared/components/badge";
import { Button } from "@/src/shared/components/button";
import { cn } from "@/src/shared/utils";

interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    actionLabel?: string;
    actionUrl?: string;
}

// Mock notification generator
const generateMockNotifications = (): Notification[] => [
    {
        id: '1',
        type: 'warning',
        title: 'High RTO Rate Detected',
        message: 'Fashion Trends Ltd has 28% RTO rate this month - intervention recommended',
        timestamp: new Date(Date.now() - 5 * 60000),
        read: false,
        actionLabel: 'View Details',
        actionUrl: '/admin/sellers/S001',
    },
    {
        id: '2',
        type: 'success',
        title: 'Revenue Milestone',
        message: 'Platform crossed ₹10L revenue today!',
        timestamp: new Date(Date.now() - 15 * 60000),
        read: false,
    },
    {
        id: '3',
        type: 'info',
        title: 'New Seller Onboarded',
        message: 'TechGear Pro completed KYC verification',
        timestamp: new Date(Date.now() - 30 * 60000),
        read: true,
    },
    {
        id: '4',
        type: 'error',
        title: 'Payment Gateway Issue',
        message: '3 COD settlements failed - check gateway',
        timestamp: new Date(Date.now() - 45 * 60000),
        read: false,
        actionLabel: 'Check Now',
        actionUrl: '/admin/settlements',
    },
];

const iconMap = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertTriangle,
};

const colorMap = {
    info: {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-800/50',
        text: 'text-blue-700 dark:text-blue-300',
        icon: 'text-blue-600 dark:text-blue-400',
    },
    success: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        border: 'border-emerald-200 dark:border-emerald-800/50',
        text: 'text-emerald-700 dark:text-emerald-300',
        icon: 'text-emerald-600 dark:text-emerald-400',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800/50',
        text: 'text-amber-700 dark:text-amber-300',
        icon: 'text-amber-600 dark:text-amber-400',
    },
    error: {
        bg: 'bg-rose-50 dark:bg-rose-950/30',
        border: 'border-rose-200 dark:border-rose-800/50',
        text: 'text-rose-700 dark:text-rose-300',
        icon: 'text-rose-600 dark:text-rose-400',
    },
};

export function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        setNotifications(generateMockNotifications());

        // Simulate new notifications coming in
        const interval = setInterval(() => {
            const newNotif: Notification = {
                id: Date.now().toString(),
                type: ['info', 'success', 'warning'][Math.floor(Math.random() * 3)] as any,
                title: 'New Event',
                message: 'Something happened on the platform',
                timestamp: new Date(),
                read: false,
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 10));
        }, 60000); // Every minute

        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const formatTimestamp = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="relative">
            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
                <Bell className="h-5 w-5 text-[var(--text-secondary)]" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop for mobile */}
                        <div
                            className="fixed inset-0 z-40 md:hidden bg-black/20"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ type: "spring", duration: 0.2 }}
                            className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                                <h3 className="font-bold text-[var(--text-primary)]">
                                    Notifications
                                    {unreadCount > 0 && (
                                        <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
                                            {unreadCount} new
                                        </span>
                                    )}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-[var(--primary-blue)] hover:opacity-80 transition-opacity"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="h-6 w-6 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center"
                                    >
                                        <X className="h-4 w-4 text-[var(--text-muted)]" />
                                    </button>
                                </div>
                            </div>

                            {/* Notifications List */}
                            <div className="max-h-[400px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <Bell className="h-12 w-12 mx-auto mb-3 text-[var(--text-muted)] opacity-30" />
                                        <p className="text-sm text-[var(--text-secondary)]">No notifications</p>
                                    </div>
                                ) : (
                                    notifications.map((notif, index) => {
                                        const Icon = iconMap[notif.type];
                                        const colors = colorMap[notif.type];

                                        return (
                                            <motion.div
                                                key={notif.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className={cn(
                                                    "p-4 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer",
                                                    !notif.read && "bg-[var(--primary-blue-soft)]/5"
                                                )}
                                                onClick={() => markAsRead(notif.id)}
                                            >
                                                <div className="flex gap-3">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                                        colors.bg
                                                    )}>
                                                        <Icon className={cn("h-5 w-5", colors.icon)} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <h4 className={cn(
                                                                "font-semibold text-sm",
                                                                !notif.read ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                                                            )}>
                                                                {notif.title}
                                                            </h4>
                                                            {!notif.read && (
                                                                <span className="h-2 w-2 rounded-full bg-[var(--primary-blue)] shrink-0 mt-1.5" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-2">
                                                            {notif.message}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-[var(--text-muted)]">
                                                                {formatTimestamp(notif.timestamp)}
                                                            </span>
                                                            {notif.actionLabel && (
                                                                <button className="text-xs text-[var(--primary-blue)] hover:opacity-80">
                                                                    {notif.actionLabel} →
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(notif.id);
                                                        }}
                                                        className="h-6 w-6 rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div className="p-3 border-t border-[var(--border-subtle)] text-center">
                                    <button className="text-sm text-[var(--primary-blue)] hover:opacity-80 transition-opacity">
                                        View all notifications
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default NotificationCenter;
