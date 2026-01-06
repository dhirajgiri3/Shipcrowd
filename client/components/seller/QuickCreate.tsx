"use client";

import { lazy, Suspense, useState } from "react";
import { motion } from "framer-motion";
import { Package, Upload, Zap, User, ArrowRight, Plus, Search, Command } from "lucide-react";
import { Card } from "@/components/ui/core/Card";
import { Button } from "@/components/ui/core/Button";
import { useRecentCustomers, RecentCustomer } from "@/src/core/api/hooks/useRecentCustomers";
import Link from "next/link";
import { cn } from "@/src/shared/utils";

// Lazy load modals
const QuickOrderModal = lazy(() => import("./QuickOrderModal"));
const CSVUploadModal = lazy(() => import("./CSVUploadModal"));

export function QuickCreate() {
    const { data: recentCustomers, isLoading } = useRecentCustomers({ limit: 6 });
    const [selectedCustomer, setSelectedCustomer] = useState<RecentCustomer | null>(null);
    const [showCSVModal, setShowCSVModal] = useState(false);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 px-1">
                    <div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            Quick Actions
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                            Manage orders and shipments efficiently
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] group-focus-within:text-[var(--primary-blue)] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search actions..."
                                className="h-10 pl-9 pr-4 rounded-xl bg-[var(--bg-secondary)] border-none focus:ring-2 focus:ring-[var(--primary-blue)]/20 text-sm w-48 transition-all hover:bg-[var(--bg-tertiary)]"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
                                <Command className="h-3 w-3 text-[var(--text-muted)]" />
                                <span className="text-[10px] text-[var(--text-muted)] font-medium">K</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Main Section: Recent Customers (Col Span 8) */}
                    <Card className="lg:col-span-8 border-none shadow-sm bg-[var(--bg-primary)] overflow-hidden flex flex-col h-full ring-1 ring-[var(--border-subtle)]">
                        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]/30">
                            <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <User className="h-4 w-4 text-[var(--text-secondary)]" />
                                Jump Back In
                            </h4>
                            <Link href="/seller/orders" className="text-xs font-medium text-[var(--primary-blue)] hover:text-[var(--primary-blue-deep)] flex items-center gap-1 transition-colors">
                                View History <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>

                        <div className="p-5 flex-1 flex items-center">
                            {isLoading ? (
                                <div className="flex gap-4 w-full overflow-hidden">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-32 flex-1 rounded-2xl bg-[var(--bg-secondary)] animate-pulse" />
                                    ))}
                                </div>
                            ) : recentCustomers && recentCustomers.length > 0 ? (
                                <div className="flex gap-4 overflow-x-auto w-full pb-4 pt-1 px-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--border-strong)]/50 snap-x snap-mandatory">
                                    {recentCustomers.map((customer, index) => (
                                        <motion.button
                                            key={customer.id || customer.phone}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ y: -4, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                                            onClick={() => setSelectedCustomer(customer)}
                                            className="min-w-[200px] snap-start bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/30 rounded-2xl p-4 text-left group transition-all duration-300 relative flex flex-col justify-between h-36"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="h-10 w-10 rounded-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center text-sm font-bold text-[var(--text-primary)] shadow-sm group-hover:scale-110 transition-transform">
                                                        {customer.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--primary-blue)] text-white p-1.5 rounded-full shadow-lg shadow-[var(--primary-blue)]/20 transform translate-x-2 group-hover:translate-x-0">
                                                        <Plus className="h-3 w-3" />
                                                    </div>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate pr-2 group-hover:text-[var(--primary-blue)] transition-colors">
                                                        {customer.name}
                                                    </p>
                                                    <p className="text-xs text-[var(--text-secondary)] truncate">
                                                        {customer.city}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]/50 flex items-center justify-between">
                                                <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                                    Quick Ship
                                                </span>
                                                <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                                                    {customer.totalOrders} orders
                                                </span>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full text-center py-8 bg-[var(--bg-secondary)]/30 rounded-2xl border border-dashed border-[var(--border-subtle)]">
                                    <p className="text-sm text-[var(--text-muted)]">Start shipping to see your recent customers here.</p>
                                    <Button variant="link" size="sm" className="mt-1">Create first order</Button>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Sidebar: Primary Actions (Col Span 4) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        {/* Primary CTA */}
                        <Link href="/seller/orders/create" className="block group">
                            <button className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-deep)] p-1 transition-all duration-300 hover:shadow-brand-lg hover:scale-[1.01]">
                                <div className="relative h-full bg-white/10 backdrop-blur-sm rounded-xl p-5 flex flex-col items-start justify-between min-h-[140px]">
                                    <div className="flex items-start justify-between w-full">
                                        <div className="p-2.5 bg-white/20 rounded-lg text-white">
                                            <Package className="h-6 w-6" />
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-white/70 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <div className="mt-4 text-left">
                                        <h4 className="text-lg font-bold text-white">Create New Order</h4>
                                        <p className="text-blue-100 text-xs mt-1 font-medium">Manual entry for single shipment</p>
                                    </div>
                                </div>
                            </button>
                        </Link>

                        {/* Secondary Actions Grid */}
                        <div className="grid grid-cols-2 gap-3 flex-1">
                            <button
                                onClick={() => setShowCSVModal(true)}
                                className="group relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--primary-blue)]/50 hover:bg-[var(--bg-secondary)]/50 transition-all duration-300 hover:shadow-sm"
                            >
                                <div className="p-2.5 rounded-full bg-[var(--success-bg)] text-[var(--success)] group-hover:scale-110 transition-transform duration-300">
                                    <Upload className="h-5 w-5" />
                                </div>
                                <div className="text-center">
                                    <div className="text-xs font-bold text-[var(--text-primary)]">Bulk Upload</div>
                                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Import CSV</div>
                                </div>
                            </button>

                            <Link href="/seller/integrations" className="block h-full">
                                <button className="w-full h-full group relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:border-[var(--warning)]/50 hover:bg-[var(--bg-secondary)]/50 transition-all duration-300 hover:shadow-sm">
                                    <div className="p-2.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning)] group-hover:scale-110 transition-transform duration-300">
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs font-bold text-[var(--text-primary)]">Connect Store</div>
                                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Shopify / Woo</div>
                                    </div>
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Modals */}
            <Suspense fallback={null}>
                {selectedCustomer && (
                    <QuickOrderModal
                        customer={selectedCustomer}
                        isOpen={!!selectedCustomer}
                        onClose={() => setSelectedCustomer(null)}
                    />
                )}
            </Suspense>

            <Suspense fallback={null}>
                {showCSVModal && (
                    <CSVUploadModal
                        isOpen={showCSVModal}
                        onClose={() => setShowCSVModal(false)}
                    />
                )}
            </Suspense>
        </>
    );
}

export default QuickCreate;
