"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Box,
    CreditCard,
    CheckCircle2,
    ChevronRight,
    ArrowLeft,
    Truck,
    Package,
    AlertCircle,
    Loader2,
    MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/core/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/core/Card';
import { Input } from '@/components/ui/core/Input';
import { toast } from 'sonner';
import { cn } from '@/src/shared/utils';
import { Alert, AlertDescription } from '@/components/ui/feedback/Alert';

// API Hooks
import { useCreateOrder, CreateOrderPayload } from '@/src/core/api/hooks/useOrders';
import { useWarehouses } from '@/src/core/api/hooks/useWarehouses';

// Steps definition
const steps = [
    { id: 'customer', title: 'Customer Details', icon: User, description: 'Who is this order for?' },
    { id: 'order', title: 'Order Info', icon: Box, description: 'What are you shipping?' },
    { id: 'payment', title: 'Payment & Logistics', icon: CreditCard, description: 'How is it paid?' },
    { id: 'review', title: 'Review', icon: CheckCircle2, description: 'Double check everything' }
];

export default function CreateOrderPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // API Mutations & Queries
    const createOrderMutation = useCreateOrder({
        onSuccess: () => {
            // Toast handled by hook
            router.push('/seller/orders');
        }
    });

    const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();

    // Form State
    const [formData, setFormData] = useState({
        // Customer
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        addressLine1: '',
        addressLine2: '',
        pincode: '',
        city: '',
        state: '',
        country: 'India',

        // Order
        orderId: '', // Client side ID or Order Number
        orderDate: new Date().toISOString().split('T')[0],
        productName: '',
        sku: '',
        quantity: 1,
        price: '',
        weight: '', // in kg
        length: '',
        width: '',
        height: '',

        // Payment
        paymentMode: 'prepaid' as 'prepaid' | 'cod',
        codAmount: '',
        warehouseId: ''
    });

    // Auto-select default warehouse
    useEffect(() => {
        if (warehouses && warehouses.length > 0 && !formData.warehouseId) {
            const defaultWarehouse = warehouses.find(w => w.isDefault) || warehouses[0];
            setFormData(prev => ({ ...prev, warehouseId: defaultWarehouse._id }));
        }
    }, [warehouses, formData.warehouseId]);

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const validateStep = (stepIndex: number): boolean => {
        setError(null);
        if (stepIndex === 0) {
            if (!formData.customerName) return setErrorAndReturn('Customer Name is required');
            if (!formData.customerPhone || formData.customerPhone.length < 10) return setErrorAndReturn('Valid Phone Number is required');
            if (!formData.addressLine1) return setErrorAndReturn('Address Line 1 is required');
            if (!formData.pincode || formData.pincode.length < 6) return setErrorAndReturn('Valid Pincode is required');
            if (!formData.city) return setErrorAndReturn('City is required');
        }
        if (stepIndex === 1) {
            if (!formData.orderId) return setErrorAndReturn('Order ID is required');
            if (!formData.productName) return setErrorAndReturn('Product Name is required');
            if (!formData.weight || parseFloat(formData.weight) <= 0) return setErrorAndReturn('Valid Weight is required');
            if (!formData.price || parseFloat(formData.price) <= 0) return setErrorAndReturn('Valid Price is required');
            if (!formData.quantity || formData.quantity < 1) return setErrorAndReturn('Quantity must be at least 1');
        }
        if (stepIndex === 2) {
            if (formData.paymentMode === 'cod' && (!formData.codAmount || parseFloat(formData.codAmount) <= 0)) {
                return setErrorAndReturn('Valid COD Amount is required');
            }
            if (!formData.warehouseId) return setErrorAndReturn('Pickup Warehouse is required. Please create a warehouse in settings if none exist.');
        }
        return true;
    };

    const setErrorAndReturn = (msg: string) => {
        setError(msg);
        return false;
    };

    const nextStep = () => {
        if (validateStep(currentStep) && currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            setError(null);
        }
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;

        const payload: CreateOrderPayload = {
            customerInfo: {
                name: formData.customerName,
                phone: formData.customerPhone,
                email: formData.customerEmail,
                address: {
                    line1: formData.addressLine1,
                    line2: formData.addressLine2,
                    city: formData.city,
                    state: formData.state || 'State', // ideally should be fetched via pincode
                    country: formData.country,
                    postalCode: formData.pincode,
                }
            },
            products: [{
                name: formData.productName,
                sku: formData.sku,
                quantity: Number(formData.quantity),
                price: Number(formData.price),
                weight: Number(formData.weight),
            }],
            paymentMethod: formData.paymentMode,
            warehouseId: formData.warehouseId,
            notes: `Order ID: ${formData.orderId}` // Storing custom order ID in notes for now as backend might generate its own _id
        };

        createOrderMutation.mutate(payload);
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Customer Name <span className="text-red-500">*</span></label>
                            <Input
                                placeholder="John Doe"
                                value={formData.customerName}
                                onChange={(e) => handleInputChange('customerName', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Phone Number <span className="text-red-500">*</span></label>
                            <Input
                                placeholder="+91 98765 43210"
                                value={formData.customerPhone}
                                onChange={(e) => handleInputChange('customerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Email (Optional)</label>
                            <Input
                                placeholder="john@example.com"
                                value={formData.customerEmail}
                                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Address Line 1 <span className="text-red-500">*</span></label>
                            <Input
                                placeholder="House No, Building, Street"
                                value={formData.addressLine1}
                                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Address Line 2 (Optional)</label>
                            <Input
                                placeholder="Landmark, Area"
                                value={formData.addressLine2}
                                onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Pincode <span className="text-red-500">*</span></label>
                            <Input
                                placeholder="110001"
                                value={formData.pincode}
                                onChange={(e) => handleInputChange('pincode', e.target.value.slice(0, 6))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">City <span className="text-red-500">*</span></label>
                            <Input
                                placeholder="City"
                                value={formData.city}
                                onChange={(e) => handleInputChange('city', e.target.value)}
                            />
                        </div>
                    </div>
                );
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Order ID / Ref No <span className="text-red-500">*</span></label>
                                <Input
                                    placeholder="ORD-001"
                                    value={formData.orderId}
                                    onChange={(e) => handleInputChange('orderId', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Order Date</label>
                                <Input
                                    type="date"
                                    value={formData.orderDate}
                                    onChange={(e) => handleInputChange('orderDate', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Product Name <span className="text-red-500">*</span></label>
                                <Input
                                    placeholder="Blue Denim Jacket"
                                    value={formData.productName}
                                    onChange={(e) => handleInputChange('productName', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">SKU (Optional)</label>
                                <Input
                                    placeholder="SKU-123"
                                    value={formData.sku}
                                    onChange={(e) => handleInputChange('sku', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Weight (kg) <span className="text-red-500">*</span></label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.5"
                                    value={formData.weight}
                                    onChange={(e) => handleInputChange('weight', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Value (₹) <span className="text-red-500">*</span></label>
                                <Input
                                    type="number"
                                    placeholder="999"
                                    value={formData.price}
                                    onChange={(e) => handleInputChange('price', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Quantity <span className="text-red-500">*</span></label>
                                <Input
                                    type="number"
                                    placeholder="1"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Payment Mode</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    onClick={() => handleInputChange('paymentMode', 'prepaid')}
                                    className={cn(
                                        "cursor-pointer p-4 rounded-xl border flex items-center gap-3 transition-all",
                                        formData.paymentMode === 'prepaid'
                                            ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/20 shadow-sm"
                                            : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                        formData.paymentMode === 'prepaid' ? "border-[var(--primary-blue)]" : "border-[var(--text-muted)]"
                                    )}>
                                        {formData.paymentMode === 'prepaid' && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary-blue)]" />}
                                    </div>
                                    <span className="font-medium text-[var(--text-primary)]">Prepaid</span>
                                </div>
                                <div
                                    onClick={() => handleInputChange('paymentMode', 'cod')}
                                    className={cn(
                                        "cursor-pointer p-4 rounded-xl border flex items-center gap-3 transition-all",
                                        formData.paymentMode === 'cod'
                                            ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/20 shadow-sm"
                                            : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                        formData.paymentMode === 'cod' ? "border-[var(--primary-blue)]" : "border-[var(--text-muted)]"
                                    )}>
                                        {formData.paymentMode === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary-blue)]" />}
                                    </div>
                                    <span className="font-medium text-[var(--text-primary)]">Cash on Delivery</span>
                                </div>
                            </div>
                        </div>

                        {formData.paymentMode === 'cod' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
                                <label className="text-sm font-medium text-[var(--text-primary)]">COD Amount to Collect <span className="text-red-500">*</span></label>
                                <Input
                                    type="number"
                                    placeholder="Amount"
                                    value={formData.codAmount}
                                    onChange={(e) => handleInputChange('codAmount', e.target.value)}
                                />
                            </div>
                        )}

                        <div className="space-y-2 pt-2">
                            <label className="text-sm font-medium text-[var(--text-primary)]">Pickup Location <span className="text-red-500">*</span></label>
                            {warehousesLoading ? (
                                <div className="h-10 w-full bg-[var(--bg-secondary)] animate-pulse rounded-md" />
                            ) : (
                                <div className="grid gap-3">
                                    {warehouses?.map((warehouse) => (
                                        <div
                                            key={warehouse._id}
                                            onClick={() => handleInputChange('warehouseId', warehouse._id)}
                                            className={cn(
                                                "cursor-pointer p-4 rounded-xl border flex items-start gap-3 transition-all",
                                                formData.warehouseId === warehouse._id
                                                    ? "border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/10"
                                                    : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]"
                                            )}
                                        >
                                            <div className="mt-1">
                                                <MapPin className={cn(
                                                    "w-5 h-5",
                                                    formData.warehouseId === warehouse._id ? "text-[var(--primary-blue)]" : "text-[var(--text-muted)]"
                                                )} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-[var(--text-primary)]">{warehouse.name}</span>
                                                    {warehouse.isDefault && <span className="text-[10px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">Default</span>}
                                                </div>
                                                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                                                    {warehouse.address.line1}, {warehouse.address.city}, {warehouse.address.postalCode}
                                                </p>
                                            </div>
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1",
                                                formData.warehouseId === warehouse._id ? "border-[var(--primary-blue)]" : "border-[var(--text-muted)]"
                                            )}>
                                                {formData.warehouseId === warehouse._id && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary-blue)]" />}
                                            </div>
                                        </div>
                                    ))}
                                    {(!warehouses || warehouses.length === 0) && (
                                        <div className="p-4 text-center border border-[var(--border-subtle)] border-dashed rounded-xl bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                                            No warehouses found. Please add a warehouse in Settings.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6">
                        <div className="bg-[var(--bg-secondary)] rounded-xl p-6 space-y-4 border border-[var(--border-subtle)]">
                            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-lg">
                                <Package className="w-5 h-5 text-[var(--primary-blue)]" />
                                Review Order
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <div>
                                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Customer</p>
                                    <p className="font-medium text-[var(--text-primary)] text-base">{formData.customerName}</p>
                                    <p className="text-[var(--text-secondary)]">{formData.customerPhone}</p>
                                    <p className="text-[var(--text-secondary)] mt-1">
                                        {formData.addressLine1}, {formData.addressLine2 ? formData.addressLine2 + ', ' : ''}
                                        {formData.city} - {formData.pincode}
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Items</p>
                                        <p className="font-medium text-[var(--text-primary)] text-base">{formData.productName}</p>
                                        <p className="text-[var(--text-secondary)]">Qty: {formData.quantity} | Weight: {formData.weight}kg</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Payment</p>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-[var(--text-primary)] capitalize">{formData.paymentMode}</span>
                                            <span className="text-[var(--text-secondary)]">
                                                — Value: ₹{formData.price}
                                                {formData.paymentMode === 'cod' && ` (Collect ₹${formData.codAmount})`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-[var(--primary-blue-soft)]/10 rounded-xl border border-[var(--primary-blue)]/20">
                            <Truck className="w-5 h-5 text-[var(--primary-blue)] shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">Ready to ship?</p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                    Creating this order will register it in the system.
                                    You can proceed to generate shipping labels and schedule pickup from the Orders dashboard.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    className="mb-4 pl-0 hover:bg-transparent hover:text-[var(--primary-blue)] transition-colors text-[var(--text-secondary)]"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Orders
                </Button>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Create New Shipment</h1>
                <p className="text-[var(--text-secondary)] mt-2">Enter shipment details to generate a label and schedule pickup.</p>
            </div>

            <div className="flex gap-8 flex-col lg:flex-row">
                {/* Steps Sidebar */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="sticky top-24 space-y-1">
                        {steps.map((step, index) => {
                            const isActive = index === currentStep;
                            const isCompleted = index < currentStep;
                            const Icon = step.icon;

                            return (
                                <div key={step.id} className="relative">
                                    <button
                                        onClick={() => index < currentStep && setCurrentStep(index)}
                                        disabled={index > currentStep}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 outline-none focus:ring-2 focus:ring-[var(--primary-blue)]/20",
                                            isActive
                                                ? "bg-[var(--primary-blue)] text-white shadow-lg shadow-blue-500/20"
                                                : isCompleted
                                                    ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                                                    : "text-[var(--text-muted)]"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                            isActive ? "bg-white/20" : "bg-[var(--bg-tertiary)]"
                                        )}>
                                            {isCompleted ? <CheckCircle2 className="w-5 h-5 text-[var(--success)]" /> : <Icon className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className={cn("text-sm font-bold", isActive ? "text-white" : "text-[var(--text-primary)]")}>{step.title}</p>
                                        </div>
                                    </button>
                                    {index < steps.length - 1 && (
                                        <div className={cn(
                                            "absolute left-7 bottom-0 top-12 w-0.5 h-4 mb-2 -ml-px z-0",
                                            isCompleted ? "bg-[var(--success)]" : "bg-[var(--border-subtle)]"
                                        )} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Form */}
                <div className="flex-1">
                    <Card className="bg-[var(--bg-primary)] border-[var(--border-subtle)] shadow-xl overflow-hidden min-h-[500px] flex flex-col">
                        <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
                            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                                {steps[currentStep].title}
                            </CardTitle>
                            <CardDescription className="text-[var(--text-secondary)]">
                                {steps[currentStep].description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 flex-1">
                            {error && (
                                <Alert variant="error" className="mb-6 bg-[var(--error-bg)] border-[var(--error)]/20 text-[var(--error)]">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {renderStepContent()}
                                </motion.div>
                            </AnimatePresence>
                        </CardContent>
                        <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 flex justify-between items-center">
                            <Button
                                variant="outline"
                                onClick={prevStep}
                                disabled={currentStep === 0 || createOrderMutation.isPending}
                                className="border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                            >
                                Previous
                            </Button>

                            {currentStep === steps.length - 1 ? (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={createOrderMutation.isPending}
                                    className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-hover)] text-white shadow-lg shadow-blue-500/20 w-40"
                                >
                                    {createOrderMutation.isPending ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                                    ) : (
                                        "Create Order"
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={nextStep}
                                    className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-hover)] text-white shadow-lg shadow-blue-500/20"
                                >
                                    Next Step <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
