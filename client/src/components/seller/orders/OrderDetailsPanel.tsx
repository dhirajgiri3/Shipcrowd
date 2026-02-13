"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, MapPin, Package } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { cn, formatCurrency, formatDate } from '@/src/lib/utils';
import { Order } from '@/src/types/domain/order';

interface OrderDetailsPanelProps {
    order: Order | null;
    onClose: () => void;
}

export const OrderDetailsPanel = React.memo(OrderDetailsPanelComponent);

function OrderDetailsPanelComponent({ order, onClose }: OrderDetailsPanelProps) {
    const router = useRouter();

    if (!order) return null;

    return (
        <AnimatePresence>
            {order && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-hidden"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-[var(--bg-primary)] shadow-2xl z-50 border-l border-[var(--border-subtle)] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    Order #{order.orderNumber}
                                </h2>
                                <p className="text-sm text-[var(--text-muted)]">
                                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-[var(--bg-secondary)]">
                                <X className="w-5 h-5 text-[var(--text-secondary)]" />
                            </Button>
                        </div>

                        {/* Content Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Status Section */}
                            <div className="flex items-center justify-between bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-subtle)]">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Status</p>
                                    <StatusBadge domain="order" status={order.currentStatus} size="sm" />
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Payment</p>
                                    <StatusBadge domain="payment" status={order.paymentStatus} size="sm" />
                                </div>
                            </div>

                            {/* Customer Details */}
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                    <User className="w-4 h-4 text-[var(--primary-blue)]" /> Customer Details
                                </h3>
                                <div className="space-y-3 pl-6 border-l-2 border-[var(--border-subtle)] py-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-[var(--text-primary)]">{order.customerInfo.name}</p>
                                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-1">
                                                <Mail className="w-3.5 h-3.5" /> {order.customerInfo.email}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-1">
                                                <Phone className="w-3.5 h-3.5" /> {order.customerInfo.phone}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)] mt-2 bg-[var(--bg-secondary)]/50 p-2 rounded-lg">
                                        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>
                                            123, Green Park Extension, Next to City Mall,
                                            <br />New Delhi, Delhi - 110016
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-[var(--primary-blue)]" /> Order Items
                                </h3>
                                <div className="space-y-3">
                                    {order.products.map((product, idx) => (
                                        <div key={idx} className="flex gap-4 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-sm">
                                            <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center shrink-0">
                                                <Package className="w-8 h-8 text-[var(--text-muted)] opacity-50" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{product.name}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">SKU: {product.sku || 'N/A'}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs bg-[var(--bg-secondary)] px-2 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border-subtle)]">Qty: {product.quantity}</span>
                                                    <span className="font-mono text-sm font-semibold">{formatCurrency(product.price)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Summary */}
                            <div className="bg-[var(--bg-secondary)]/30 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Subtotal</span>
                                    <span className="font-medium">{formatCurrency(order.totals.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Tax (18%)</span>
                                    <span className="font-medium">{formatCurrency(order.totals.tax)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Shipping</span>
                                    <span className="font-medium">{formatCurrency(order.totals.shipping)}</span>
                                </div>
                                <div className="border-t border-[var(--border-subtle)] my-2 pt-2 flex justify-between text-base font-bold text-[var(--text-primary)]">
                                    <span>Total</span>
                                    <span>{formatCurrency(order.totals.total)}</span>
                                </div>
                            </div>
                        </div>


                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
