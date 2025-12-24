"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Truck, MapPin, CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/src/shared/components/button";
import { Input } from "@/src/shared/components/Input";
import { useWarehouses } from "@/src/core/api/hooks/useWarehouses";
import { useCreateOrder } from "@/src/core/api/hooks/useOrders";
import { useToast } from "@/src/shared/components/Toast";
import { RecentCustomer } from "@/src/core/api/hooks/useRecentCustomers";
import { cn } from "@/src/shared/utils";

interface QuickOrderModalProps {
    customer: RecentCustomer | null;
    isOpen: boolean;
    onClose: () => void;
}

export function QuickOrderModal({ customer, isOpen, onClose }: QuickOrderModalProps) {
    const { addToast } = useToast();
    const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();
    const createOrder = useCreateOrder({
        onSuccess: () => {
            addToast('Order created successfully!', 'success');
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

        createOrder.mutate({
            customerInfo: {
                name: customer.name,
                phone: customer.phone,
                email: customer.email || '',
                address: {
                    line1: customer.addressLine1 || '',
                    line2: '',
                    city: customer.city,
                    state: customer.state,
                    country: 'India',
                    postalCode: customer.postalCode,
                },
            },
            products: [{
                name: formData.productName,
                sku: formData.sku,
                quantity: formData.quantity,
                weight: formData.weight,
                price: formData.price,
            }],
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div
                            className="bg-[var(--bg-primary)] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[var(--border-default)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] p-6 rounded-t-3xl z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-light)] flex items-center justify-center shadow-lg shadow-blue-500/20">
                                            <Package className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                                Quick Order
                                            </h2>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                Ship to {customer?.name}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="h-8 w-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-colors"
                                    >
                                        <X className="h-4 w-4 text-[var(--text-muted)]" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Customer Info (Pre-filled, read-only) */}
                                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--primary-blue)] to-[var(--primary-blue-light)] flex items-center justify-center text-white font-bold text-lg shadow-md">
                                            {customer?.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-[var(--text-primary)]">
                                                {customer?.name}
                                            </h3>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                {customer?.phone}
                                            </p>
                                        </div>
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-[var(--text-muted)]" />
                                        <p>
                                            {customer?.city}, {customer?.state} - {customer?.postalCode}
                                        </p>
                                    </div>
                                    <div className="flex gap-3 mt-3 text-xs">
                                        <span className="text-[var(--text-muted)]">
                                            Previous orders: <span className="font-medium text-[var(--text-secondary)]">{customer?.totalOrders}</span>
                                        </span>
                                        <span className="text-[var(--text-muted)]">
                                            Avg. value: <span className="font-medium text-[var(--text-secondary)]">₹{customer?.avgOrderValue}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Product Details */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                        <Package className="h-5 w-5 text-[var(--primary-blue)]" />
                                        Product Details
                                    </h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                                                Product Name <span className="text-rose-500">*</span>
                                            </label>
                                            <Input
                                                value={formData.productName}
                                                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                                placeholder="e.g., Cotton T-Shirt"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                                                SKU (Optional)
                                            </label>
                                            <Input
                                                value={formData.sku}
                                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                                placeholder="e.g., TS-001"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                                                Quantity <span className="text-rose-500">*</span>
                                            </label>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={formData.quantity}
                                                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                                                Weight (kg) <span className="text-rose-500">*</span>
                                            </label>
                                            <Input
                                                type="number"
                                                step={0.1}
                                                min={0.1}
                                                value={formData.weight}
                                                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0.1 })}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                                                Price (₹) <span className="text-rose-500">*</span>
                                            </label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={formData.price || ''}
                                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Mode */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-[var(--primary-blue)]" />
                                        Payment Mode
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['prepaid', 'cod'] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                onClick={() => setFormData({ ...formData, paymentMode: mode })}
                                                className={cn(
                                                    "p-3 rounded-xl border transition-all duration-200 flex items-center justify-center gap-2",
                                                    formData.paymentMode === mode
                                                        ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/20 shadow-sm"
                                                        : "border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]"
                                                )}
                                            >
                                                <span className={cn(
                                                    "text-sm font-medium capitalize",
                                                    formData.paymentMode === mode
                                                        ? "text-[var(--primary-blue)]"
                                                        : "text-[var(--text-secondary)]"
                                                )}>
                                                    {mode === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Warehouse Selection */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                        <Truck className="h-5 w-5 text-[var(--primary-blue)]" />
                                        Pickup Warehouse
                                    </h4>
                                    {warehousesLoading ? (
                                        <div className="h-16 bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />
                                    ) : warehouses && warehouses.length > 0 ? (
                                        <div className="space-y-2">
                                            {warehouses.slice(0, 3).map((warehouse: any) => (
                                                <button
                                                    key={warehouse._id}
                                                    onClick={() => setFormData({ ...formData, warehouseId: warehouse._id })}
                                                    className={cn(
                                                        "w-full p-3 rounded-xl border transition-all duration-200 flex items-start gap-3 text-left",
                                                        formData.warehouseId === warehouse._id
                                                            ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/20 shadow-sm"
                                                            : "border-[var(--border-default)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]"
                                                    )}
                                                >
                                                    <MapPin className={cn(
                                                        "h-5 w-5 mt-0.5",
                                                        formData.warehouseId === warehouse._id
                                                            ? "text-[var(--primary-blue)]"
                                                            : "text-[var(--text-muted)]"
                                                    )} />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "font-medium",
                                                                formData.warehouseId === warehouse._id
                                                                    ? "text-[var(--primary-blue)]"
                                                                    : "text-[var(--text-primary)]"
                                                            )}>
                                                                {warehouse.name}
                                                            </span>
                                                            {warehouse.isDefault && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-[var(--text-secondary)]">
                                                            {warehouse.address?.city || 'City'}, {warehouse.address?.postalCode || 'PIN'}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-default)]">
                                            <p className="text-sm text-[var(--text-muted)]">
                                                No warehouses found. Please add a warehouse first.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="sticky bottom-0 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)] p-6 rounded-b-3xl">
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        className="flex-1"
                                        disabled={createOrder.isPending}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleSubmit}
                                        className="flex-1 shadow-lg shadow-blue-500/20"
                                        disabled={createOrder.isPending}
                                    >
                                        {createOrder.isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create & Ship Now'
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
