"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, MapPin, Package, Truck, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { StatusBadge } from '@/src/components/ui/data/StatusBadge';
import { formatCurrency } from '@/src/lib/utils';
import { Order } from '@/src/types/domain/order';
import { useShipments } from '@/src/core/api/hooks/orders/useShipments';
import { isSellerOrderShippable } from '@/src/lib/utils/order-shipping-eligibility';

interface OrderDetailsPanelProps {
    order: Order | null;
    onClose: () => void;
    onShipOrder?: (order: Order) => void;
}

export const OrderDetailsPanel = React.memo(OrderDetailsPanelComponent);

function OrderDetailsPanelComponent({ order, onClose, onShipOrder }: OrderDetailsPanelProps) {
    const router = useRouter();
    const orderId = order?._id || '';
    const normalizedStatus = String(order?.currentStatus || '').toLowerCase();
    const shouldLookupShipment = Boolean(
        order &&
        (order.hasShipment ?? (
            !!order.shippingDetails?.trackingNumber ||
            ['shipped', 'delivered', 'rto'].includes(normalizedStatus)
        ))
    );
    const { data: shipmentLookup, isLoading: isShipmentLookupLoading } = useShipments(
        { orderId, page: 1, limit: 1 },
        { enabled: Boolean(orderId) && shouldLookupShipment }
    );

    if (!order) return null;

    const customerAddress = order.customerInfo.address;
    const formattedAddress = `${customerAddress.line1}${customerAddress.line2 ? `, ${customerAddress.line2}` : ''}\n${customerAddress.city}, ${customerAddress.state} ${customerAddress.postalCode}`;
    const linkedShipment = shipmentLookup?.shipments?.[0];
    const trackingNumber = linkedShipment?.trackingNumber || order.shippingDetails?.trackingNumber || null;
    const shipmentStatus = linkedShipment?.currentStatus || null;
    const shipmentCarrier = linkedShipment?.carrier || order.shippingDetails?.provider || null;
    const hasShipmentContext = Boolean(trackingNumber || shipmentStatus || shipmentCarrier);

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
                        className="fixed inset-0 h-[100dvh] bg-black/40 backdrop-blur-sm z-50 overflow-hidden"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-[100dvh] w-full sm:w-[500px] bg-[var(--bg-primary)] shadow-2xl z-50 border-l border-[var(--border-subtle)] flex flex-col"
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
                            <div className="flex items-center gap-2">
                                {onShipOrder && isSellerOrderShippable(order) && (
                                    <Button
                                        size="sm"
                                        onClick={() => onShipOrder(order)}
                                        className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white"
                                        aria-label={`Ship order ${order.orderNumber}`}
                                    >
                                        <Truck className="w-4 h-4 mr-1.5" />
                                        Ship Now
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-[var(--bg-secondary)]">
                                    <X className="w-5 h-5 text-[var(--text-secondary)]" />
                                </Button>
                            </div>
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

                            {/* Shipment Context */}
                            {shouldLookupShipment && (
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-[var(--primary-blue)]" /> Shipment
                                    </h3>
                                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 p-4 space-y-3">
                                        {isShipmentLookupLoading ? (
                                            <div className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Loading shipment details...
                                            </div>
                                        ) : hasShipmentContext ? (
                                            <>
                                                {trackingNumber && (
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-[var(--text-muted)]">Tracking</span>
                                                        <span className="font-mono font-semibold text-[var(--text-primary)]">{trackingNumber}</span>
                                                    </div>
                                                )}
                                                {shipmentCarrier && (
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-[var(--text-muted)]">Carrier</span>
                                                        <span className="font-medium text-[var(--text-primary)] capitalize">{shipmentCarrier}</span>
                                                    </div>
                                                )}
                                                {shipmentStatus && (
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-[var(--text-muted)]">Shipment Status</span>
                                                        <StatusBadge domain="shipment" status={shipmentStatus} size="sm" />
                                                    </div>
                                                )}
                                                <div className="pt-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => router.push(`/seller/shipments?search=${encodeURIComponent(trackingNumber || order.orderNumber)}`)}
                                                        aria-label="Track shipment"
                                                    >
                                                        Track Shipment
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-sm text-[var(--text-muted)]">
                                                No linked shipment found yet.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

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
                                        <span className="whitespace-pre-line">{formattedAddress}</span>
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
