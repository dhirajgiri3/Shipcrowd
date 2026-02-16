"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/src/components/seller/layout/Sidebar';
import { Header } from '@/src/components/seller/layout/Header';
import { QuickActionsFAB } from '@/src/components/seller/dashboard/QuickActionsFAB';
import { ThemeProvider } from '@/src/components/shared/ThemeProvider';
import { ToastProvider } from '@/src/components/ui/feedback/Toast';
import { AuthGuard } from '@/src/features/auth/components/AuthGuard';
import { useAuth } from '@/src/features/auth';
import { X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function SellerLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const { user, isInitialized } = useAuth();

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!sidebarOpen) {
            document.body.style.overflow = '';
            return;
        }

        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [sidebarOpen]);

    useEffect(() => {
        if (!isInitialized) return;
        if (pathname?.startsWith('/onboarding')) return;

        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

        if (user && !user.companyId && !isAdmin) {
            router.push('/onboarding');
        }
    }, [user, isInitialized, pathname, router]);

    if (isInitialized && user && !user.companyId && !['admin', 'super_admin'].includes(user.role)) {
        return null;
    }

    return (
        <AuthGuard requiredRole="seller" redirectTo="/login">
            <ThemeProvider>
                <ToastProvider>
                    <div className="min-h-screen bg-[var(--bg-secondary)]">
                        <a
                            href="#seller-main-content"
                            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--primary-blue)] focus:text-white focus:rounded-lg focus:outline-none"
                        >
                            Skip to main content
                        </a>
                        {sidebarOpen && (
                            <div
                                className="fixed inset-0 bg-black/50 z-[var(--z-overlay)] lg:hidden"
                                onClick={() => setSidebarOpen(false)}
                                aria-hidden="true"
                            />
                        )}

                        <div
                            className={cn(
                                'fixed inset-y-0 left-0 z-[var(--z-sidebar-mobile)] w-64 transform transition-transform duration-200 ease-in-out lg:hidden',
                                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                            )}
                            aria-hidden={!sidebarOpen}
                        >
                            <Sidebar onNavigate={() => setSidebarOpen(false)} />
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)]"
                                aria-label="Close seller sidebar"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="hidden lg:block">
                            <Sidebar />
                        </div>

                        <div className="lg:pl-64 transition-all duration-200 overflow-x-hidden">
                            <Header onMenuClick={() => setSidebarOpen(true)} />
                            <main id="seller-main-content" className="p-4 sm:p-6 lg:p-8" tabIndex={-1}>
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
                            <QuickActionsFAB />
                        </div>
                    </div>
                </ToastProvider>
            </ThemeProvider>
        </AuthGuard>
    );
}
