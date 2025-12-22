"use client";

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Package, AlertTriangle, IndianRupee, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'shipment' | 'ndr' | 'payment' | 'alert';
    time: string;
    read: boolean;
}

// Mock notifications
const mockNotifications: Notification[] = [
    {
        id: '1',
        title: 'Shipment Delivered',
        message: 'AWB #DL2312345 delivered successfully to Mumbai',
        type: 'shipment',
        time: '2 min ago',
        read: false
    },
    {
        id: '2',
        title: 'NDR Alert',
        message: '3 shipments require attention - customer not available',
        type: 'ndr',
        time: '15 min ago',
        read: false
    },
    {
        id: '3',
        title: 'Low Wallet Balance',
        message: 'Your wallet balance is below ₹500. Recharge now.',
        type: 'payment',
        time: '1 hour ago',
        read: false
    },
    {
        id: '4',
        title: 'Pickup Scheduled',
        message: 'Pickup scheduled for tomorrow at 10:00 AM',
        type: 'shipment',
        time: '3 hours ago',
        read: true
    },
];

const iconMap = {
    shipment: Truck,
    ndr: AlertTriangle,
    payment: IndianRupee,
    alert: AlertTriangle
};

export function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState(mockNotifications);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') setIsOpen(false);
        }
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const markAsRead = (id: string) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button - Refined */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    "hover:bg-[var(--bg-secondary)] hover:scale-105 active:scale-95",
                    isOpen && "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                )}
            >
                <Bell className="h-4.5 w-4.5" />

                {/* Unread Badge - Floating Pulse */}
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                )}
            </button>

            {/* Dropdown - Premium Glassmorphism */}
            {isOpen && (
                <div className={cn(
                    "absolute right-0 top-full mt-3 w-96 max-w-[90vw]",
                    "bg-[var(--bg-primary)]/95 backdrop-blur-xl border border-[var(--border-subtle)]",
                    "rounded-2xl shadow-2xl shadow-black/5 dark:shadow-black/20",
                    "origin-top-right overflow-hidden z-50",
                    "animate-in fade-in slide-in-from-top-2 duration-200"
                )}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] text-[10px] font-bold">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] font-medium flex items-center gap-1 transition-colors"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <div className="h-12 w-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-3">
                                    <Bell className="h-5 w-5 text-[var(--text-muted)]" />
                                </div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">All caught up!</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">No new notifications for now.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--border-subtle)]">
                                {notifications.map((notification) => {
                                    const Icon = iconMap[notification.type];
                                    const isUnread = !notification.read;

                                    return (
                                        <div
                                            key={notification.id}
                                            onClick={() => markAsRead(notification.id)}
                                            className={cn(
                                                "group flex gap-3.5 px-5 py-4 cursor-pointer transition-all duration-200",
                                                isUnread ? "bg-[var(--primary-blue)]/[0.02]" : "hover:bg-[var(--bg-secondary)]"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center border transition-colors",
                                                isUnread ? "bg-[var(--bg-primary)] border-[var(--primary-blue)]/20 text-[var(--primary-blue)] shadow-sm" : "bg-[var(--bg-secondary)] border-transparent text-[var(--text-muted)] group-hover:bg-[var(--bg-tertiary)]"
                                            )}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <p className={cn(
                                                        "text-sm leading-snug truncate pr-2",
                                                        isUnread ? "font-semibold text-[var(--text-primary)]" : "font-medium text-[var(--text-secondary)]"
                                                    )}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
                                                        {notification.time}
                                                    </span>
                                                </div>
                                                <p className={cn(
                                                    "text-xs mt-1 leading-relaxed line-clamp-2",
                                                    isUnread ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"
                                                )}>
                                                    {notification.message}
                                                </p>
                                            </div>
                                            {isUnread && (
                                                <div className="flex-shrink-0 self-center">
                                                    <div className="h-2 w-2 rounded-full bg-[var(--primary-blue)]"></div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm p-2">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full py-2 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary-blue)] hover:bg-[var(--bg-secondary)] transition-all duration-200"
                        >
                            View All Activity
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
