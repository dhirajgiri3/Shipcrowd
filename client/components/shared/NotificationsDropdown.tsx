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
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-lg transition-all duration-200",
                    "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
                    isOpen && "bg-gray-50 text-gray-900"
                )}
            >
                <Bell className="h-5 w-5" />

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#2525FF] text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className={cn(
                    "absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50",
                    "animate-in fade-in slide-in-from-top-2 duration-150"
                )}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-[#2525FF] hover:text-[#1e1ecc] font-medium flex items-center gap-1"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[320px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center">
                                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const Icon = iconMap[notification.type];

                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={cn(
                                            "flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-0",
                                            notification.read ? "bg-white hover:bg-gray-50" : "bg-[#2525FF]/[0.02] hover:bg-[#2525FF]/[0.04]"
                                        )}
                                    >
                                        <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100 text-gray-600">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "text-sm truncate",
                                                    notification.read ? "font-medium text-gray-700" : "font-semibold text-gray-900"
                                                )}>
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <span className="flex-shrink-0 h-2 w-2 rounded-full bg-[#2525FF]" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {notification.time}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-2.5">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full text-center text-sm text-[#2525FF] hover:text-[#1e1ecc] font-medium"
                        >
                            View All
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
