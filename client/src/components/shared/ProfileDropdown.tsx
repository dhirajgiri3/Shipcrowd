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
import { cn } from '@/src/lib/utils';
import { RoleAvatar } from './RoleAvatar';

import type { User as AuthUser } from '@/src/types/auth'; // Alias to avoid collision with Lucide User icon

interface ProfileDropdownProps {
    user: Pick<AuthUser, 'name' | 'email' | 'role' | 'avatar'>;
    onSignOut?: () => void;
}

export function ProfileDropdown({ user, onSignOut }: ProfileDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    const isAdminDashboard = pathname.startsWith('/admin');
    const isSellerDashboard = pathname.startsWith('/seller');
    const canAccessAdmin = ['admin', 'super_admin'].includes(user.role);
    // Allow admins/super_admins to access seller view as well
    const canAccessSeller = ['seller', 'admin', 'super_admin'].includes(user.role);

    // Dynamic role label based on current dashboard
    const currentRoleLabel = isAdminDashboard ? 'Admin' : isSellerDashboard ? 'Seller' : user.role.replace('_', ' ');

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
            {/* Trigger Button - Enhanced */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-3 pl-1.5 pr-2.5 py-1.5 rounded-xl transition-all duration-200 group",
                    "hover:bg-[var(--bg-secondary)] border border-transparent",
                    isOpen && "bg-[var(--bg-secondary)] border-[var(--border-subtle)]"
                )}
            >
                {/* Avatar with Status Dot */}
                <div className="relative">
                    <RoleAvatar
                        role={user.role}
                        name={user.name}
                        size="sm"
                        className="ring-2 ring-[var(--bg-primary)] group-hover:ring-[var(--bg-secondary)] transition-all"
                    />
                    <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-[var(--bg-primary)] flex items-center justify-center">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </span>
                </div>

                {/* User Info (hidden on mobile) */}
                <div className="hidden lg:block text-left">
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-none group-hover:text-[var(--primary-blue)] transition-colors">{user.name}</p>
                    <p className="text-[10px] font-medium text-[var(--text-muted)] leading-none mt-1 uppercase tracking-wider">{currentRoleLabel}</p>
                </div>

                <ChevronDown className={cn(
                    "h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-300 ease-out hidden lg:block",
                    "group-hover:text-[var(--text-secondary)]",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown Menu - Glassmorphism */}
            {isOpen && (
                <div className={cn(
                    "absolute right-0 top-full mt-2 w-64",
                    "bg-[var(--bg-primary)]/95 backdrop-blur-xl border border-[var(--border-subtle)]",
                    "rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20",
                    "origin-top-right overflow-hidden z-[var(--z-dropdown)]",
                    "animate-in fade-in slide-in-from-top-2 duration-200"
                )}>
                    {/* User Info Header */}
                    <div className="px-4 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
                        <div className="flex items-center gap-3">
                            <RoleAvatar role={user.role} name={user.name} />
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user.name}</p>
                                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2 space-y-0.5">
                        {/* Dashboard Switching */}
                        {canAccessAdmin && isSellerDashboard && (
                            <Link
                                href="/admin"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-[var(--text-secondary)] hover:bg-[var(--primary-blue)]/[0.08] hover:text-[var(--primary-blue)] transition-all group"
                            >
                                <Shield className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                <span>Switch to Admin</span>
                            </Link>
                        )}

                        {canAccessSeller && isAdminDashboard && (
                            <Link
                                href="/seller"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-[var(--text-secondary)] hover:bg-[var(--primary-blue)]/[0.08] hover:text-[var(--primary-blue)] transition-all group"
                            >
                                <LayoutDashboard className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                <span>Switch to Seller</span>
                            </Link>
                        )}

                        {((canAccessAdmin && isSellerDashboard) || (canAccessSeller && isAdminDashboard)) && (
                            <div className="h-px bg-[var(--border-subtle)] my-1.5 mx-2" />
                        )}

                        {/* Profile Settings */}
                        <Link
                            href={isAdminDashboard ? "/admin/settings" : "/seller/settings"}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-all group"
                        >
                            <User className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                            <span>My Profile</span>
                        </Link>

                        <Link
                            href={isAdminDashboard ? "/admin/settings" : "/seller/settings"}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-all group"
                        >
                            <Settings className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                            <span>Account Settings</span>
                        </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-[var(--border-subtle)] p-2">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onSignOut?.();
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all group"
                        >
                            <LogOut className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
