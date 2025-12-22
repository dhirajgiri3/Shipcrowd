"use client";

import { useState } from 'react';
import { Sidebar } from '@/components/admin/Sidebar';
import { Header } from '@/components/admin/Header';
import { ToastProvider } from '@/src/shared/components/Toast';
import { X } from 'lucide-react';
import { cn } from '@/src/shared/utils';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <ToastProvider>
            <div className="min-h-screen bg-[var(--bg-secondary)]">
                {/* Mobile sidebar overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Mobile sidebar */}
                <div className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:hidden",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <Sidebar />
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="absolute top-4 right-4 p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] z-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Desktop sidebar */}
                <div className="hidden lg:block">
                    <Sidebar />
                </div>

                {/* Main content */}
                <div className="lg:pl-64 transition-all duration-200">
                    <Header onMenuClick={() => setSidebarOpen(true)} />
                    <main className="p-4 sm:p-6 lg:p-8">
                        <div className="mx-auto max-w-7xl">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ToastProvider>
    );
}
