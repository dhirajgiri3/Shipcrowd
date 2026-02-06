"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/src/components/seller/Sidebar';
import { Header } from '@/src/components/seller/Header';
import { ThemeProvider } from '@/src/components/shared/ThemeProvider';
import { ToastProvider } from '@/src/components/ui/feedback/Toast';
import { AuthGuard } from '@/src/features/auth/components/AuthGuard';
import { useAuth } from '@/src/features/auth';
import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

/**
 * Client-side layout wrapper for Seller dashboard
 * 
 * This component handles all client-side logic:
 * - State management (sidebar open/close)
 * - Context providers (Theme, Toast, Order, Auth)
 * - Interactive UI elements
 * 
 * Parent layout.tsx is a Server Component for better performance
 */
export function SellerLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const { user, isInitialized } = useAuth();

    // Check if user has completed onboarding (has a company)
    useEffect(() => {
        if (!isInitialized) return;
        if (pathname?.startsWith('/onboarding')) return;

        // Admins don't strictly need a company to view the dashboard (view-only mode)
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

        if (user && !user.companyId && !isAdmin) {
            router.push('/onboarding');
        }
    }, [user, isInitialized, pathname, router]);

    // PREVENT RENDER: If user needs onboarding, don't render dashboard widgets.
    // This prevents API calls that would fail (403) and potentially spam token refresh, killing the session.
    if (isInitialized && user && !user.companyId && !['admin', 'super_admin'].includes(user.role)) {
        return null; // or <Loader />
    }

    return (
        <AuthGuard requiredRole="seller" redirectTo="/login">
            <ThemeProvider>
                <ToastProvider>
                    <div className="min-h-screen bg-[var(--bg-secondary)]">
                        {/* Mobile sidebar overlay */}
                        {sidebarOpen && (
                            <div
                                className="fixed inset-0 bg-black/50 z-[var(--z-overlay)] lg:hidden"
                                onClick={() => setSidebarOpen(false)}
                            />
                        )}

                        {/* Mobile sidebar */}
                        <div className={cn(
                            "fixed inset-y-0 left-0 z-[var(--z-sidebar-mobile)] w-64 transform transition-transform duration-200 ease-in-out lg:hidden",
                            sidebarOpen ? "translate-x-0" : "-translate-x-full"
                        )}>
                            <Sidebar />
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Desktop sidebar */}
                        <div className="hidden lg:block">
                            <Sidebar />
                        </div>

                        {/* Main content */}
                        <div className="lg:pl-64 transition-all duration-200 overflow-x-hidden">
                            <Header onMenuClick={() => setSidebarOpen(true)} />
                            <main className="p-4 sm:p-6 lg:p-8">
                                <div className="mx-auto max-w-7xl">
                                    {isInitialized && user && (user.role === 'admin' || user.role === 'super_admin') && !user.companyId && (
                                        <div
                                            className="mb-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-4 py-3 text-sm text-[var(--text-secondary)]"
                                            role="status"
                                        >
                                            No seller company is linked to this admin account yet. Seller metrics are unavailable.
                                        </div>
                                    )}
                                    {children}
                                </div>
                            </main>
                        </div>
                    </div>
                </ToastProvider>
            </ThemeProvider>
        </AuthGuard>
    );
}
