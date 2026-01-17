"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Truck, MapPin, CreditCard, Loader2, CheckCircle2, ChevronRight, Weight } from "lucide-react";
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { useWarehouses } from "@/src/core/api/hooks/useWarehouses";
import { useCreateOrder } from "@/src/core/api/hooks/useOrders";
import { useToast } from '@/src/components/ui/feedback/Toast';
import { RecentCustomer } from "@/src/core/api/hooks/useRecentCustomers";
import { cn, formatCurrency } from "@/src/shared/utils";

interface QuickOrderModalProps {
    customer: RecentCustomer | null;
    isOpen: boolean;
    onClose: () => void;
}

export function QuickOrderModal({ customer, isOpen, onClose }: QuickOrderModalProps) {
    const { addToast } = useToast();
    const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();
    const createOrder = useCreateOrder({
        onSuccess: (order) => {
            addToast(`Order ${order.orderNumber} created successfully!`, 'success');
            onClose();
        },
        onError: () => {
            addToast('Failed to create order', 'error');
        }
    });

    const [formData, setFormData] = useState({
        productName: '',
        sku: '',
        quantity: 1,
        weight: 0.5,
        price: 0,
        warehouseId: '',
        paymentMode: 'prepaid' as 'prepaid' | 'cod',
    });

    // Set default warehouse when warehouses load
    useEffect(() => {
        if (warehouses && warehouses.length > 0 && !formData.warehouseId) {
            const defaultWarehouse = warehouses.find((w: any) => w.isDefault) || warehouses[0];
            setFormData(prev => ({ ...prev, warehouseId: defaultWarehouse._id }));
        }
    }, [warehouses, formData.warehouseId]);

    // Set preferred payment mode from customer
    useEffect(() => {
        if (customer?.preferredPayment) {
            setFormData(prev => ({ ...prev, paymentMode: customer.preferredPayment }));
        }
    }, [customer]);

    const handleSubmit = async () => {
        if (!customer) return;

        if (!formData.productName.trim()) {
            addToast('Please enter a product name', 'error');
            return;
        }
        if (formData.price <= 0) {
            addToast('Please enter a valid price', 'error');
            return;
        }
        if (!formData.warehouseId) {
            addToast('Please select a warehouse', 'error');
            return;
        }

        // Create order with real API
        await createOrder.mutateAsync({
            customerInfo: {
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: {
                    line1: customer.addressLine1 || '',
                    line2: customer.addressLine2,
                    city: customer.city,
                    state: customer.state,
                    country: customer.country || 'India',
                    postalCode: customer.postalCode,
                },
            },
            products: [
                {
                    name: formData.productName,
                    sku: formData.sku || undefined,
                    quantity: formData.quantity,
                    price: formData.price,
                    weight: formData.weight,
                },
            ],
            paymentMethod: formData.paymentMode,
            warehouseId: formData.warehouseId,
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                        className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="bg-[var(--bg-primary)] rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto ring-1 ring-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-[var(--bg-secondary)]/50 backdrop-blur-md px-8 py-6 border-b border-[var(--border-subtle)] flex items-center justify-between sticky top-0 z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                                        Quick Create Order
                                    </h2>
                                    <p className="text-sm text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5">
                                        Shipment for <span className="font-semibold text-[var(--text-primary)]">{customer?.name}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="h-9 w-9 rounded-full bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-center transition-all hover:rotate-90"
                                >
                                    <X className="h-4 w-4 text-[var(--text-secondary)]" />
                                </button>
                            </div>

                            {/* Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">

                                {/* Customer Snapshot */}
                                <div className="p-4 rounded-2xl bg-[var(--info-bg)]/30 border border-[var(--info-border)]/50 flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-[var(--primary-blue)] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-lg shadow-blue-500/20">
                                        {customer?.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Deliver To</p>
                                            <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5 truncate">{customer?.name}</p>
                                            <p className="text-xs text-[var(--text-secondary)] truncate">{customer?.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Address</p>
                                            <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5 line-clamp-1">{customer?.addressLine1 || customer?.city}</p>
                                            <p className="text-xs text-[var(--text-secondary)] truncate">{customer?.city}, {customer?.state} - {customer?.postalCode}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Product Details Section */}
                                <section className="space-y-4">
                                    <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                        <Package className="h-4 w-4" /> Item Details
                                    </h3>

                                    <div className="grid grid-cols-12 gap-5">
                                        <div className="col-span-12 md:col-span-8">
                                            <div className="group">
                                                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block ml-1 group-focus-within:text-[var(--primary-blue)] transition-colors">Product Name</label>
                                                <Input
                                                    value={formData.productName}
                                                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                                    placeholder="e.g. Graphic Print T-Shirt - Black"
                                                    className="h-12 text-base bg-[var(--bg-secondary)]/30 border-transparent hover:border-[var(--border-subtle)] focus:border-[var(--primary-blue)]/50 focus:bg-[var(--bg-primary)] transition-all font-medium"
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-6 md:col-span-4">
                                            <div className="group">
                                                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block ml-1">SKU</label>
                                                <Input
                                                    value={formData.sku}
                                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                                    placeholder="Optional"
                                                    className="h-12 bg-[var(--bg-secondary)]/30 border-transparent hover:border-[var(--border-subtle)] focus:border-[var(--primary-blue)]/50 focus:bg-[var(--bg-primary)] transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-4">
                                            <div className="group">
                                                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block ml-1">Price (₹)</label>
                                                <Input
                                                    type="number"
                                                    value={formData.price || ''}
                                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                                    className="h-12 font-bold bg-[var(--bg-secondary)]/30 border-transparent hover:border-[var(--border-subtle)] focus:border-[var(--primary-blue)]/50 focus:bg-[var(--bg-primary)] transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="col-span-4">
                                            <div className="group">
                                                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block ml-1">Weight (Kg)</label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step={0.1}
                                                        value={formData.weight}
                                                        onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0.1 })}
                                                        className="h-12 pl-10 bg-[var(--bg-secondary)]/30 border-transparent hover:border-[var(--border-subtle)] focus:border-[var(--primary-blue)]/50 focus:bg-[var(--bg-primary)] transition-all"
                                                    />
                                                    <Weight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-4">
                                            <div className="group">
                                                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block ml-1">Qty</label>
                                                <div className="flex bg-[var(--bg-secondary)]/30 rounded-xl border border-transparent hover:border-[var(--border-subtle)] p-1">
                                                    <button
                                                        onClick={() => setFormData(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                                                        className="h-10 w-8 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] rounded-lg transition-colors"
                                                    >-</button>
                                                    <div className="flex-1 flex items-center justify-center font-bold text-[var(--text-primary)]">
                                                        {formData.quantity}
                                                    </div>
                                                    <button
                                                        onClick={() => setFormData(p => ({ ...p, quantity: p.quantity + 1 }))}
                                                        className="h-10 w-8 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] rounded-lg transition-colors"
                                                    >+</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div className="h-px bg-[var(--border-subtle)]/50 w-full" />

                                {/* Warehouse & Payment - Split Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <section className="space-y-4">
                                        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                            <Truck className="h-4 w-4" /> Pickup From
                                        </h3>
                                        {warehousesLoading ? (
                                            <div className="h-14 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
                                        ) : (
                                            <div className="space-y-2">
                                                {warehouses?.slice(0, 2).map((w: any) => (
                                                    <button
                                                        key={w._id}
                                                        onClick={() => setFormData(p => ({ ...p, warehouseId: w._id }))}
                                                        className={cn(
                                                            "w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all duration-200",
                                                            formData.warehouseId === w._id
                                                                ? "bg-[var(--primary-blue-soft)]/30 border-[var(--primary-blue)]"
                                                                : "bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "h-5 w-5 rounded-full border flex items-center justify-center",
                                                            formData.warehouseId === w._id ? "border-[var(--primary-blue)] bg-[var(--primary-blue)]" : "border-[var(--text-muted)]"
                                                        )}>
                                                            {formData.warehouseId === w._id && <div className="h-2 w-2 rounded-full bg-white" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={cn("text-xs font-bold truncate", formData.warehouseId === w._id ? "text-[var(--primary-blue)]" : "text-[var(--text-primary)]")}>
                                                                {w.name}
                                                            </p>
                                                            <p className="text-[10px] text-[var(--text-muted)] truncate">{w.address?.city}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                            <CreditCard className="h-4 w-4" /> Payment
                                        </h3>
                                        <div className="flex gap-3">
                                            {(['prepaid', 'cod'] as const).map((mode) => (
                                                <button
                                                    key={mode}
                                                    onClick={() => setFormData(p => ({ ...p, paymentMode: mode }))}
                                                    className={cn(
                                                        "flex-1 p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all duration-200",
                                                        formData.paymentMode === mode
                                                            ? "bg-[var(--primary-blue-soft)]/30 border-[var(--primary-blue)]"
                                                            : "bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "text-xs font-bold uppercase",
                                                        formData.paymentMode === mode ? "text-[var(--primary-blue)]" : "text-[var(--text-secondary)]"
                                                    )}>
                                                        {mode}
                                                    </span>
                                                    {mode === 'prepaid' && <span className="text-[10px] text-[var(--success)] font-medium">Fastest</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm">
                                <div className="text-sm">
                                    <span className="text-[var(--text-muted)]">Total Amount:</span>
                                    <span className="ml-2 text-xl font-bold text-[var(--text-primary)]">
                                        {formatCurrency(formData.price * formData.quantity)}
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="ghost" onClick={onClose} disabled={false}>
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleSubmit}
                                        disabled={createOrder.isPending}
                                        className="shadow-brand hover:shadow-brand-lg px-6"
                                    >
                                        {createOrder.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                Create Order <ChevronRight className="h-4 w-4 ml-1 opacity-80" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default QuickOrderModal;
