"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    User,
    Settings,
    LogOut,
    ChevronDown,
    LayoutDashboard,
    Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
    name: string;
    email: string;
    avatar?: string;
    role: 'admin' | 'seller' | 'admin+seller';
}

interface ProfileDropdownProps {
    user: User;
    onSignOut?: () => void;
}

export function ProfileDropdown({ user, onSignOut }: ProfileDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    const isAdminDashboard = pathname.startsWith('/admin');
    const isSellerDashboard = pathname.startsWith('/seller');
    const canAccessAdmin = user.role === 'admin' || user.role === 'admin+seller';
    const canAccessSeller = user.role === 'seller' || user.role === 'admin+seller';

    // Dynamic role label based on current dashboard
    const currentRoleLabel = isAdminDashboard ? 'Admin' : isSellerDashboard ? 'Seller' : user.role;

    // Get user initials
    const initials = user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

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

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2.5 p-1.5 rounded-xl transition-all duration-200",
                    "hover:bg-gray-50",
                    isOpen && "bg-gray-50"
                )}
            >
                {/* Avatar */}
                {user.avatar ? (
                    <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-8 w-8 rounded-lg object-cover"
                    />
                ) : (
                    <div className="h-8 w-8 rounded-lg bg-[#2525FF] flex items-center justify-center text-white text-xs font-semibold">
                        {initials}
                    </div>
                )}

                {/* User Info (hidden on mobile) */}
                <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-gray-900 leading-none">{user.name}</p>
                    <p className="text-xs text-gray-500 leading-none mt-0.5">{currentRoleLabel}</p>
                </div>

                <ChevronDown className={cn(
                    "h-4 w-4 text-gray-400 transition-transform duration-200 hidden lg:block",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={cn(
                    "absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50",
                    "animate-in fade-in slide-in-from-top-2 duration-150"
                )}>
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="h-10 w-10 rounded-lg object-cover"
                                />
                            ) : (
                                <div className="h-10 w-10 rounded-lg bg-[#2525FF] flex items-center justify-center text-white text-sm font-semibold">
                                    {initials}
                                </div>
                            )}
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1.5">
                        {/* Dashboard Switching */}
                        {canAccessAdmin && isSellerDashboard && (
                            <Link
                                href="/admin"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#2525FF]/5 hover:text-[#2525FF] transition-colors"
                            >
                                <Shield className="h-4 w-4" />
                                <span>Admin Dashboard</span>
                            </Link>
                        )}

                        {canAccessSeller && isAdminDashboard && (
                            <Link
                                href="/seller"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#2525FF]/5 hover:text-[#2525FF] transition-colors"
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                <span>Seller Dashboard</span>
                            </Link>
                        )}

                        {((canAccessAdmin && isSellerDashboard) || (canAccessSeller && isAdminDashboard)) && (
                            <div className="border-t border-gray-100 my-1.5" />
                        )}

                        {/* Profile Settings */}
                        <Link
                            href={isAdminDashboard ? "/admin/settings" : "/seller/settings"}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <User className="h-4 w-4" />
                            <span>Profile</span>
                        </Link>

                        <Link
                            href={isAdminDashboard ? "/admin/settings" : "/seller/settings"}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                            <span>Settings</span>
                        </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-100 py-1.5">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onSignOut?.();
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
