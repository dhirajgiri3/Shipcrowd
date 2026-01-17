'use client';

import { useState, useCallback, useEffect } from 'react';
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
  MapPin,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/core/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/core/Card';
import { Input } from '@/components/ui/core/Input';
import { toast } from 'sonner';
import { cn } from '@/src/shared/utils';
import { Alert, AlertDescription } from '@/components/ui/feedback/Alert';
import { Loader } from '@/components/ui';
import { useCreateOrder } from '@/src/core/api/hooks/useOrders';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import type { CreateOrderRequest, OrderFormData } from '@/src/types/order';

// Indian states list
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry'
];

// Steps definition
const steps = [
  { id: 'customer', title: 'Customer Details', icon: User, description: 'Who is this order for?' },
  { id: 'products', title: 'Products', icon: Box, description: 'What are you shipping?' },
  { id: 'payment', title: 'Payment & Logistics', icon: CreditCard, description: 'How is it paid?' },
  { id: 'review', title: 'Review', icon: CheckCircle2, description: 'Double check everything' }
];

export function CreateOrderClient() {
  const router = useRouter();
  const { isInitialized, isAuthenticated } = useAuth();
  const createOrderMutation = useCreateOrder({
    onSuccess: (order) => {
      toast.success(`Order ${order.orderNumber} created successfully!`);
      router.push('/seller/orders');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create order');
    }
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/login');
    }
  }, [isInitialized, isAuthenticated, router]);

  // Form State
  const [formData, setFormData] = useState<OrderFormData>({
    // Customer
    customerName: '',
    customerEmail: '',
    customerPhone: '',

    // Address
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',

    // Products (start with one empty product)
    products: [
      {
        id: '1',
        name: '',
        sku: '',
        quantity: 1,
        price: 0,
        weight: undefined,
        dimensions: undefined,
      },
    ],

    // Shipping & Payment
    warehouseId: '',
    paymentMethod: 'cod' as const,
    externalOrderNumber: '',
    notes: '',
    tags: '',

    // Totals (for preview)
    subtotal: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 0,
  });

  // Calculate totals when products change
  useEffect(() => {
    const subtotal = formData.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    setFormData((prev) => ({
      ...prev,
      subtotal,
      total: subtotal + prev.tax + prev.shipping - prev.discount,
    }));
  }, [formData.products]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleProductChange = (productId: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === productId ? { ...p, [field]: value } : p
      ),
    }));
  };

  const addProduct = () => {
    const newId = String(Math.max(...formData.products.map((p) => parseInt(p.id) || 0)) + 1);
    setFormData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          id: newId,
          name: '',
          sku: '',
          quantity: 1,
          price: 0,
          weight: undefined,
          dimensions: undefined,
        },
      ],
    }));
  };

  const removeProduct = (productId: string) => {
    if (formData.products.length > 1) {
      setFormData((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
      }));
    } else {
      toast.error('At least one product is required');
    }
  };

  const validateStep = (stepIndex: number): boolean => {
    setError(null);

    if (stepIndex === 0) {
      // Customer Details
      if (!formData.customerName) return setErrorAndReturn('Customer Name is required');
      if (!formData.customerPhone || formData.customerPhone.length < 10) {
        return setErrorAndReturn('Valid Phone Number (10 digits) is required');
      }
      if (!formData.addressLine1) return setErrorAndReturn('Address Line 1 is required');
      if (!formData.city) return setErrorAndReturn('City is required');
      if (!formData.state) return setErrorAndReturn('State is required');
      if (!formData.postalCode || formData.postalCode.length !== 6) {
        return setErrorAndReturn('Valid Postal Code (6 digits) is required');
      }
    }

    if (stepIndex === 1) {
      // Products
      if (formData.products.length === 0) return setErrorAndReturn('At least one product is required');
      for (const product of formData.products) {
        if (!product.name) return setErrorAndReturn('Product name is required');
        if (!product.quantity || product.quantity < 1) return setErrorAndReturn('Quantity must be at least 1');
        if (!product.price || product.price <= 0) return setErrorAndReturn('Price must be greater than 0');
      }
    }

    if (stepIndex === 2) {
      // Payment & Logistics
      if (!formData.paymentMethod) return setErrorAndReturn('Payment method is required');
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

    const payload: CreateOrderRequest = {
      customerInfo: {
        name: formData.customerName,
        email: formData.customerEmail || undefined,
        phone: formData.customerPhone,
        address: {
          line1: formData.addressLine1,
          line2: formData.addressLine2 || undefined,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          postalCode: formData.postalCode,
        },
      },
      products: formData.products.map((p) => ({
        name: p.name,
        sku: p.sku || undefined,
        quantity: p.quantity,
        price: p.price,
        weight: p.weight ? Number(p.weight) : undefined,
        dimensions: p.dimensions
          ? {
            length: p.dimensions.length ? Number(p.dimensions.length) : undefined,
            width: p.dimensions.width ? Number(p.dimensions.width) : undefined,
            height: p.dimensions.height ? Number(p.dimensions.height) : undefined,
          }
          : undefined,
      })),
      paymentMethod: formData.paymentMethod,
      warehouseId: formData.warehouseId || undefined,
      externalOrderNumber: formData.externalOrderNumber || undefined,
      notes: formData.notes || undefined,
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : undefined,
    };

    await createOrderMutation.mutateAsync(payload);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Customer Details
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Customer Name <span className="text-[var(--error)]">*</span>
              </label>
              <Input
                placeholder="John Doe"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Phone Number <span className="text-[var(--error)]">*</span>
              </label>
              <Input
                placeholder="+91 98765 43210"
                value={formData.customerPhone}
                onChange={(e) => handleInputChange('customerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Email (Optional)</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={formData.customerEmail}
                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Address Line 1 <span className="text-[var(--error)]">*</span>
              </label>
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
              <label className="text-sm font-medium text-[var(--text-primary)]">
                City <span className="text-[var(--error)]">*</span>
              </label>
              <Input
                placeholder="Mumbai"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                State <span className="text-[var(--error)]">*</span>
              </label>
              <select
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)]"
              >
                <option value="">Select a state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Postal Code <span className="text-[var(--error)]">*</span>
              </label>
              <Input
                placeholder="400001"
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value.slice(0, 6))}
              />
            </div>
          </div>
        );

      case 1:
        // Products
        return (
          <div className="space-y-4">
            {formData.products.map((product, index) => (
              <div
                key={product.id}
                className="p-4 border border-[var(--border-subtle)] rounded-lg space-y-4 relative"
              >
                {formData.products.length > 1 && (
                  <button
                    onClick={() => removeProduct(product.id)}
                    className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <h4 className="font-medium text-[var(--text-primary)]">Product {index + 1}</h4>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                      Product Name <span className="text-[var(--error)]">*</span>
                    </label>
                    <Input
                      placeholder="Blue Denim Jacket"
                      value={product.name}
                      onChange={(e) => handleProductChange(product.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">SKU (Optional)</label>
                    <Input
                      placeholder="SKU-123"
                      value={product.sku}
                      onChange={(e) => handleProductChange(product.id, 'sku', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                      Quantity <span className="text-[var(--error)]">*</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={product.quantity}
                      onChange={(e) => handleProductChange(product.id, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">
                      Price (₹) <span className="text-[var(--error)]">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="999"
                      value={product.price}
                      onChange={(e) => handleProductChange(product.id, 'price', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]">Weight (kg)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.5"
                      value={product.weight || ''}
                      onChange={(e) => handleProductChange(product.id, 'weight', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                <div className="text-sm text-[var(--text-secondary)]">
                  Subtotal: ₹{(product.quantity * product.price).toFixed(2)}
                </div>
              </div>
            ))}

            <button
              onClick={addProduct}
              className="w-full py-3 border border-dashed border-[var(--border-subtle)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Another Product
            </button>
          </div>
        );

      case 2:
        // Payment & Logistics
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-[var(--text-primary)]">Payment Method</label>
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => handleInputChange('paymentMethod', 'prepaid')}
                  className={cn(
                    'cursor-pointer p-4 rounded-xl border flex items-center gap-3 transition-all',
                    formData.paymentMethod === 'prepaid'
                      ? 'border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/20 shadow-sm'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      formData.paymentMethod === 'prepaid' ? 'border-[var(--primary-blue)]' : 'border-[var(--text-muted)]'
                    )}
                  >
                    {formData.paymentMethod === 'prepaid' && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary-blue)]" />}
                  </div>
                  <span className="font-medium text-[var(--text-primary)]">Prepaid</span>
                </div>
                <div
                  onClick={() => handleInputChange('paymentMethod', 'cod')}
                  className={cn(
                    'cursor-pointer p-4 rounded-xl border flex items-center gap-3 transition-all',
                    formData.paymentMethod === 'cod'
                      ? 'border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/20 shadow-sm'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      formData.paymentMethod === 'cod' ? 'border-[var(--primary-blue)]' : 'border-[var(--text-muted)]'
                    )}
                  >
                    {formData.paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary-blue)]" />}
                  </div>
                  <span className="font-medium text-[var(--text-primary)]">Cash on Delivery</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">External Order Number (Optional)</label>
              <Input
                placeholder="ORD-001"
                value={formData.externalOrderNumber}
                onChange={(e) => handleInputChange('externalOrderNumber', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Notes (Optional)</label>
              <textarea
                placeholder="Add any special instructions..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">Tags (Optional, comma-separated)</label>
              <Input
                placeholder="tag1, tag2, tag3"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
        // Review
        return (
          <div className="space-y-6">
            <div className="bg-[var(--bg-secondary)] rounded-xl p-6 space-y-4 border border-[var(--border-subtle)]">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-[var(--primary-blue)]" />
                Order Summary
              </h3>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Customer</p>
                  <p className="font-medium text-[var(--text-primary)]">{formData.customerName}</p>
                  <p className="text-[var(--text-secondary)]">{formData.customerPhone}</p>
                  <p className="text-[var(--text-secondary)]">
                    {formData.addressLine1}, {formData.addressLine2 ? formData.addressLine2 + ', ' : ''}
                    {formData.city} - {formData.postalCode}, {formData.state}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Products</p>
                  {formData.products.map((product, index) => (
                    <div key={product.id} className="text-[var(--text-secondary)] mb-2">
                      <span className="font-medium text-[var(--text-primary)]">{product.name}</span>
                      <span className="text-[var(--text-muted)]"> × {product.quantity} @ ₹{product.price}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-3">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Pricing</p>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--text-secondary)]">Subtotal:</span>
                    <span className="text-[var(--text-primary)]">₹{formData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-[var(--text-primary)]">Total:</span>
                    <span className="text-[var(--primary-blue)]">₹{formData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[var(--primary-blue-soft)]/10 rounded-xl border border-[var(--primary-blue)]/20">
              <Truck className="w-5 h-5 text-[var(--primary-blue)] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Ready to create order?</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Creating this order will register it in the system. You can then generate shipping labels and schedule pickup.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Don't render until auth is initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show if not authenticated
  if (!isAuthenticated) {
    return null;
  }

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
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Create New Order</h1>
        <p className="text-[var(--text-secondary)] mt-2">Enter order details to create a shipment.</p>
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
                      'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 outline-none focus:ring-2 focus:ring-[var(--primary-blue)]/20',
                      isActive
                        ? 'bg-[var(--primary-blue)] text-white shadow-lg shadow-blue-500/20'
                        : isCompleted
                          ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                          : 'text-[var(--text-muted)]'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', isActive ? 'bg-white/20' : 'bg-[var(--bg-tertiary)]')}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className={cn('text-sm font-bold', isActive ? 'text-white' : 'text-[var(--text-primary)]')}>{step.title}</p>
                    </div>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'absolute left-7 bottom-0 top-12 w-0.5 h-4 mb-2 -ml-px z-0',
                        isCompleted ? 'bg-[var(--success)]' : 'bg-[var(--border-subtle)]'
                      )}
                    />
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
              <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">{steps[currentStep].title}</CardTitle>
              <CardDescription className="text-[var(--text-secondary)]">{steps[currentStep].description}</CardDescription>
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
                    <>
                      <Loader variant="dots" size="sm" />
                      Creating...
                    </>
                  ) : (
                    'Create Order'
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
