"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Upload, Zap, User, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/src/shared/components/card";
import { Button } from "@/src/shared/components/button";
import { useRecentCustomers, RecentCustomer } from "@/src/core/api/hooks/useRecentCustomers";
import { QuickOrderModal } from "./QuickOrderModal";
import { CSVUploadModal } from "./CSVUploadModal";
import Link from "next/link";
import { cn } from "@/src/shared/utils";

export function QuickCreate() {
    const { data: recentCustomers, isLoading } = useRecentCustomers({ limit: 5 });
    const [selectedCustomer, setSelectedCustomer] = useState<RecentCustomer | null>(null);
    const [showCSVModal, setShowCSVModal] = useState(false);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <Card className="border-[var(--primary-blue)]/20 bg-gradient-to-br from-[var(--primary-blue-soft)]/10 via-transparent to-transparent overflow-hidden relative">
                    {/* Subtle decorative element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-blue)]/5 rounded-full blur-3xl pointer-events-none" />

                    <CardHeader className="relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-light)] flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Zap className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold text-[var(--text-primary)]">
                                        Quick Create
                                    </CardTitle>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                                        Ship to recent customers in 1 click
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6 relative z-10">
                        {/* Recent Customers - Horizontal Scroll */}
                        <div>
                            <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Recent Customers
                            </h4>

                            {isLoading ? (
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className="min-w-[200px] h-24 bg-[var(--bg-tertiary)] rounded-xl animate-pulse"
                                            style={{ animationDelay: `${i * 100}ms` }}
                                        />
                                    ))}
                                </div>
                            ) : recentCustomers && recentCustomers.length > 0 ? (
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                                    {recentCustomers.map((customer, index) => (
                                        <motion.button
                                            key={customer.id || customer.phone}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => setSelectedCustomer(customer)}
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={cn(
                                                "min-w-[200px] p-4 rounded-xl border border-[var(--border-default)]",
                                                "bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)]",
                                                "hover:border-[var(--primary-blue)]/50 hover:shadow-lg",
                                                "transition-all duration-200 text-left group"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-light)] flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--primary-blue)] transition-colors">
                                                        {customer.name}
                                                    </p>
                                                    <p className="text-xs text-[var(--text-muted)] truncate">
                                                        {customer.city}, {customer.state}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="text-xs text-[var(--text-tertiary)]">
                                                            {customer.totalOrders} orders
                                                        </span>
                                                        <span className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase",
                                                            customer.preferredPayment === 'cod'
                                                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                                                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                                        )}>
                                                            {customer.preferredPayment}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}

                                    {/* View All Card */}
                                    <Link
                                        href="/seller/orders"
                                        className={cn(
                                            "min-w-[120px] p-4 rounded-xl border border-dashed border-[var(--border-default)]",
                                            "bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]",
                                            "hover:border-[var(--primary-blue)]/50",
                                            "transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
                                        )}
                                    >
                                        <ArrowRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)] transition-colors" />
                                        <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--primary-blue)]">
                                            View All
                                        </span>
                                    </Link>
                                </div>
                            ) : (
                                <div className="p-6 text-center bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-default)]">
                                    <p className="text-sm text-[var(--text-muted)]">
                                        No recent customers yet. Create your first order!
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Link href="/seller/orders/create">
                                <Button
                                    variant="outline"
                                    className="h-auto py-4 w-full flex flex-col gap-2 hover:border-[var(--primary-blue)]/50 hover:bg-[var(--primary-blue-soft)]/10 transition-all group"
                                >
                                    <Package className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)]" />
                                    <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--primary-blue)]">
                                        Full Order Form
                                    </span>
                                </Button>
                            </Link>

                            <Button
                                variant="outline"
                                className="h-auto py-4 flex flex-col gap-2 hover:border-[var(--primary-blue)]/50 hover:bg-[var(--primary-blue-soft)]/10 transition-all group"
                                onClick={() => setShowCSVModal(true)}
                            >
                                <Upload className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)]" />
                                <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--primary-blue)]">
                                    CSV Upload
                                </span>
                            </Button>

                            <Link href="/seller/integrations">
                                <Button
                                    variant="outline"
                                    className="h-auto py-4 w-full flex flex-col gap-2 hover:border-[var(--primary-blue)]/50 hover:bg-[var(--primary-blue-soft)]/10 transition-all group"
                                >
                                    <Zap className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--primary-blue)]" />
                                    <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--primary-blue)]">
                                        API Connect
                                    </span>
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Quick Order Modal */}
            <QuickOrderModal
                customer={selectedCustomer}
                isOpen={!!selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
            />

            {/* CSV Upload Modal */}
            <CSVUploadModal
                isOpen={showCSVModal}
                onClose={() => setShowCSVModal(false)}
            />
        </>
    );
}

export default QuickCreate;
