'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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
  Loader2,
} from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/core/Card';
import { Input } from '@/src/components/ui/core/Input';
import { showSuccessToast, handleApiError } from '@/src/lib/error';
import { cn } from '@/src/lib/utils';
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import { Loader } from '@/src/components/ui';
import { useCreateOrder } from '@/src/core/api/hooks/orders/useOrders';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { useWarehouses } from '@/src/core/api/hooks/logistics/useWarehouses';
import { usePincodeAutocomplete } from '@/src/core/api/hooks/logistics/usePincodeAutocomplete';
import { orderApi } from '@/src/core/api/clients/orders/orderApi';
import type { CreateOrderRequest, OrderFormData } from '@/src/types/domain/order';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry',
];

const steps = [
  { id: 'customer', title: 'Customer Details', icon: User, description: 'Who is this order for?' },
  { id: 'products', title: 'Products', icon: Box, description: 'What are you shipping?' },
  { id: 'payment', title: 'Payment & Logistics', icon: CreditCard, description: 'How is it paid?' },
  { id: 'review', title: 'Review', icon: CheckCircle2, description: 'Double check everything' },
];

type PreflightState = {
  status: 'idle' | 'checking' | 'success' | 'error';
  message?: string;
};

const mapServerFieldToLocal = (field: string): string => {
  const map: Record<string, string> = {
    'customerInfo.name': 'customerName',
    'customerInfo.phone': 'customerPhone',
    'customerInfo.email': 'customerEmail',
    'customerInfo.address.line1': 'addressLine1',
    'customerInfo.address.line2': 'addressLine2',
    'customerInfo.address.city': 'city',
    'customerInfo.address.state': 'state',
    'customerInfo.address.postalCode': 'postalCode',
    warehouseId: 'warehouseId',
    externalOrderNumber: 'externalOrderNumber',
    products: 'products',
  };

  return map[field] || field;
};

export function CreateOrderClient() {
  const router = useRouter();
  const { isInitialized, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [routePreflight, setRoutePreflight] = useState<PreflightState>({ status: 'idle' });

  const { data: warehouses = [], isLoading: isWarehousesLoading } = useWarehouses();

  const createOrderMutation = useCreateOrder({
    onSuccess: (order) => {
      showSuccessToast(`Order ${order.orderNumber} created successfully!`);
      router.push('/seller/orders');
    },
    onError: (apiError) => {
      handleApiError(apiError, 'Failed to create order');
    },
  });

  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
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
    warehouseId: '',
    paymentMethod: 'cod',
    externalOrderNumber: '',
    notes: '',
    tags: '',
    subtotal: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 0,
  });

  const { data: pincodeInfo, isLoading: isPincodeLoading, error: pincodeLookupError, isSuccess: isPincodeSuccess } =
    usePincodeAutocomplete(formData.postalCode);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/login');
    }
  }, [isInitialized, isAuthenticated, router]);

  useEffect(() => {
    if (!formData.warehouseId && warehouses.length > 0) {
      const defaultWarehouse = warehouses.find((warehouse) => warehouse.isDefault) || warehouses[0];
      if (defaultWarehouse) {
        setFormData((prev) => ({ ...prev, warehouseId: defaultWarehouse._id }));
      }
    }
  }, [warehouses, formData.warehouseId]);

  useEffect(() => {
    if (isPincodeSuccess && pincodeInfo) {
      setFormData((prev) => ({
        ...prev,
        city: pincodeInfo.city || prev.city,
        state: pincodeInfo.state || prev.state,
      }));
    }
  }, [isPincodeSuccess, pincodeInfo]);

  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => warehouse._id === formData.warehouseId),
    [warehouses, formData.warehouseId]
  );

  const totals = useMemo(() => {
    const subtotal = formData.products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    const total = subtotal + formData.tax + formData.shipping - formData.discount;
    return { subtotal, total };
  }, [formData.products, formData.tax, formData.shipping, formData.discount]);

  const totalWeight = useMemo(() => {
    const weight = formData.products.reduce((sum, product) => {
      const productWeight = product.weight && product.weight > 0 ? product.weight : 0.5;
      return sum + productWeight * product.quantity;
    }, 0);
    return Math.max(weight, 0.001);
  }, [formData.products]);

  useEffect(() => {
    const canCheck =
      !!selectedWarehouse?.address?.postalCode &&
      /^\d{6}$/.test(formData.postalCode) &&
      formData.products.some((product) => product.name && product.quantity > 0 && product.price > 0);

    if (!canCheck) {
      setRoutePreflight({ status: 'idle' });
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setRoutePreflight({ status: 'checking', message: 'Checking route serviceability...' });
        const response = await orderApi.getCourierRates({
          fromPincode: selectedWarehouse.address.postalCode,
          toPincode: formData.postalCode,
          weight: totalWeight,
          paymentMode: formData.paymentMethod,
          orderValue: totals.total,
          length: 20,
          width: 15,
          height: 10,
        });

        if (!response.data?.length) {
          setRoutePreflight({
            status: 'error',
            message: 'Route is not serviceable for the selected warehouse and destination pincode.',
          });
          return;
        }

        setRoutePreflight({
          status: 'success',
          message: `${response.data.length} courier option(s) available for this route.`,
        });
      } catch {
        setRoutePreflight({
          status: 'error',
          message: 'Could not validate route serviceability. Please verify warehouse and destination pincode.',
        });
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [selectedWarehouse, formData.postalCode, formData.products, formData.paymentMethod, totalWeight, totals.total]);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    clearFieldError(field);
  }, [clearFieldError]);

  const handleProductChange = useCallback((productId: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((product) =>
        product.id === productId ? { ...product, [field]: value } : product
      ),
    }));
    setError(null);
    clearFieldError('products');
  }, [clearFieldError]);

  const addProduct = useCallback(() => {
    const newId = String(Math.max(...formData.products.map((product) => parseInt(product.id, 10) || 0)) + 1);
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
  }, [formData.products]);

  const removeProduct = useCallback((productId: string) => {
    if (formData.products.length <= 1) {
      setError('At least one product is required');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((product) => product.id !== productId),
    }));
  }, [formData.products.length]);

  const validateStep = useCallback((stepIndex: number): boolean => {
    const nextErrors: Record<string, string> = {};

    if (stepIndex === 0) {
      if (!formData.customerName.trim()) nextErrors.customerName = 'Customer name is required';
      if (!/^\d{10}$/.test(formData.customerPhone)) nextErrors.customerPhone = 'Valid 10-digit phone number is required';
      if (!formData.addressLine1.trim()) nextErrors.addressLine1 = 'Address line 1 is required';
      if (!formData.city.trim()) nextErrors.city = 'City is required';
      if (!formData.state.trim()) nextErrors.state = 'State is required';
      if (!/^\d{6}$/.test(formData.postalCode)) nextErrors.postalCode = 'Valid 6-digit postal code is required';
      if (formData.postalCode.length === 6 && (pincodeLookupError || !isPincodeSuccess)) {
        nextErrors.postalCode = 'Postal code could not be validated';
      }
    }

    if (stepIndex === 1) {
      if (!formData.products.length) nextErrors.products = 'At least one product is required';
      formData.products.forEach((product, index) => {
        if (!product.name.trim()) nextErrors[`products.${index}.name`] = 'Product name is required';
        if (!product.quantity || product.quantity < 1) nextErrors[`products.${index}.quantity`] = 'Quantity must be at least 1';
        if (!product.price || product.price <= 0) nextErrors[`products.${index}.price`] = 'Price must be greater than 0';
      });
    }

    if (stepIndex === 2) {
      if (!formData.paymentMethod) nextErrors.paymentMethod = 'Payment method is required';
      if (!formData.warehouseId) nextErrors.warehouseId = 'Warehouse is required';
      if (routePreflight.status === 'checking') nextErrors.preflight = 'Route validation is in progress';
      if (routePreflight.status === 'error') nextErrors.preflight = routePreflight.message || 'Route is not serviceable';
      if (routePreflight.status === 'idle') nextErrors.preflight = 'Route serviceability must be verified before creating order';
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstError = Object.values(nextErrors)[0];
      setError(firstError || 'Please fix validation errors');
      return false;
    }

    setError(null);
    return true;
  }, [formData, isPincodeSuccess, pincodeLookupError, routePreflight]);

  const nextStep = useCallback(() => {
    if (validateStep(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, validateStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setError(null);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return;

    const payload: CreateOrderRequest = {
      customerInfo: {
        name: formData.customerName.trim(),
        email: formData.customerEmail?.trim() || undefined,
        phone: formData.customerPhone,
        address: {
          line1: formData.addressLine1.trim(),
          line2: formData.addressLine2?.trim() || undefined,
          city: formData.city.trim(),
          state: formData.state.trim(),
          country: formData.country,
          postalCode: formData.postalCode,
        },
      },
      products: formData.products.map((product) => ({
        name: product.name.trim(),
        sku: product.sku?.trim() || undefined,
        quantity: Number(product.quantity),
        price: Number(product.price),
        weight: product.weight ? Number(product.weight) : undefined,
        dimensions: product.dimensions
          ? {
            length: product.dimensions.length ? Number(product.dimensions.length) : undefined,
            width: product.dimensions.width ? Number(product.dimensions.width) : undefined,
            height: product.dimensions.height ? Number(product.dimensions.height) : undefined,
          }
          : undefined,
      })),
      paymentMethod: formData.paymentMethod,
      warehouseId: formData.warehouseId || undefined,
      externalOrderNumber: formData.externalOrderNumber?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      tags: formData.tags
        ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : undefined,
    };

    try {
      await createOrderMutation.mutateAsync(payload);
    } catch (submitError: any) {
      const details = submitError?.details || submitError?.response?.data?.error?.details || [];
      const parsedFieldErrors: Record<string, string> = {};

      if (Array.isArray(details)) {
        details.forEach((detail: { field?: string; message?: string }) => {
          if (!detail?.field || !detail?.message) return;
          parsedFieldErrors[mapServerFieldToLocal(detail.field)] = detail.message;
        });
      }

      if (Object.keys(parsedFieldErrors).length) {
        setFieldErrors((prev) => ({ ...prev, ...parsedFieldErrors }));
      }

      setError(submitError?.message || 'Failed to create order');
    }
  }, [createOrderMutation, currentStep, formData, validateStep]);

  const getFieldError = useCallback((field: string) => fieldErrors[field], [fieldErrors]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            <div>
              <label htmlFor="customerName" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Customer Name <span className="text-[var(--error)]">*</span>
              </label>
              <Input
                id="customerName"
                value={formData.customerName}
                placeholder="John Doe"
                aria-invalid={!!getFieldError('customerName')}
                aria-describedby={getFieldError('customerName') ? 'customerName-error' : undefined}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
              />
              {getFieldError('customerName') && <p id="customerName-error" className="text-xs text-[var(--error)] mt-1.5">{getFieldError('customerName')}</p>}
            </div>

            <div>
              <label htmlFor="customerPhone" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Phone Number <span className="text-[var(--error)]">*</span>
              </label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                placeholder="9876543210"
                inputMode="numeric"
                aria-invalid={!!getFieldError('customerPhone')}
                aria-describedby={getFieldError('customerPhone') ? 'customerPhone-error' : undefined}
                onChange={(e) => handleInputChange('customerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
              {getFieldError('customerPhone') && <p id="customerPhone-error" className="text-xs text-[var(--error)] mt-1.5">{getFieldError('customerPhone')}</p>}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="customerEmail" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Email <span className="text-[var(--text-muted)] font-normal ml-1">(Optional)</span>
              </label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                placeholder="john@example.com"
                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
              />
            </div>

            <div className="md:col-span-2 border-t border-[var(--border-subtle)]"></div>

            <div className="md:col-span-2">
              <label htmlFor="addressLine1" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Address Line 1 <span className="text-[var(--error)]">*</span>
              </label>
              <Input
                id="addressLine1"
                value={formData.addressLine1}
                placeholder="House No, Building, Street"
                aria-invalid={!!getFieldError('addressLine1')}
                aria-describedby={getFieldError('addressLine1') ? 'addressLine1-error' : undefined}
                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
              />
              {getFieldError('addressLine1') && <p id="addressLine1-error" className="text-xs text-[var(--error)] mt-1.5">{getFieldError('addressLine1')}</p>}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="addressLine2" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Address Line 2 <span className="text-[var(--text-muted)] font-normal ml-1">(Optional)</span>
              </label>
              <Input
                id="addressLine2"
                value={formData.addressLine2}
                placeholder="Landmark, Area"
                onChange={(e) => handleInputChange('addressLine2', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                City <span className="text-[var(--error)]">*</span>
              </label>
              <Input
                id="city"
                value={formData.city}
                placeholder="Mumbai"
                aria-invalid={!!getFieldError('city')}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
              {getFieldError('city') && <p className="text-xs text-[var(--error)] mt-1.5">{getFieldError('city')}</p>}
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                State <span className="text-[var(--error)]">*</span>
              </label>
              <div className="relative">
                <select
                  id="state"
                  value={formData.state}
                  aria-invalid={!!getFieldError('state')}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue-soft)] focus:border-[var(--primary-blue)] transition-all appearance-none"
                >
                  <option value="">Select a state</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] rotate-90" />
                </div>
              </div>
              {getFieldError('state') && <p className="text-xs text-[var(--error)] mt-1.5">{getFieldError('state')}</p>}
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Postal Code <span className="text-[var(--error)]">*</span>
              </label>
              <div className="relative">
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  placeholder="400001"
                  aria-invalid={!!getFieldError('postalCode')}
                  onChange={(e) => handleInputChange('postalCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              </div>
              <div className="text-xs text-[var(--text-secondary)] min-h-[20px] mt-1.5 pl-1">
                {isPincodeLoading && <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Validating pincode...</span>}
                {!isPincodeLoading && formData.postalCode.length === 6 && isPincodeSuccess && pincodeInfo && (
                  <span className="text-[var(--success)] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified: {pincodeInfo.city}, {pincodeInfo.state}</span>
                )}
                {!isPincodeLoading && formData.postalCode.length === 6 && pincodeLookupError && (
                  <span className="text-[var(--error)] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Invalid pincode</span>
                )}
              </div>
              {getFieldError('postalCode') && <p className="text-xs text-[var(--error)] mt-1">{getFieldError('postalCode')}</p>}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            {formData.products.map((product, index) => (
              <div key={product.id} className="p-6 border border-[var(--border-subtle)] rounded-xl space-y-6 relative bg-[var(--bg-secondary)]/30">
                {formData.products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(product.id)}
                    className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors p-1"
                    aria-label={`Remove product ${index + 1}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-subtle)]">
                  <div className="h-8 w-8 rounded-full bg-[var(--primary-blue-soft)] text-[var(--primary-blue)] flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <h4 className="font-semibold text-[var(--text-primary)]">Product Details</h4>
                </div>

                <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
                  <div>
                    <label htmlFor={`product-name-${product.id}`} className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                      Product Name <span className="text-[var(--error)]">*</span>
                    </label>
                    <Input
                      id={`product-name-${product.id}`}
                      value={product.name}
                      placeholder="e.g. Blue Denim Jacket"
                      aria-invalid={!!getFieldError(`products.${index}.name`) || !!getFieldError('products')}
                      onChange={(e) => handleProductChange(product.id, 'name', e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor={`product-sku-${product.id}`} className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                      SKU <span className="text-[var(--text-muted)] font-normal ml-1">(Optional)</span>
                    </label>
                    <Input
                      id={`product-sku-${product.id}`}
                      value={product.sku}
                      placeholder="e.g. SKU-123"
                      onChange={(e) => handleProductChange(product.id, 'sku', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-x-6 gap-y-6 md:grid-cols-3">
                  <div>
                    <label htmlFor={`product-qty-${product.id}`} className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                      Quantity <span className="text-[var(--error)]">*</span>
                    </label>
                    <Input
                      id={`product-qty-${product.id}`}
                      type="number"
                      min="1"
                      value={product.quantity}
                      aria-invalid={!!getFieldError(`products.${index}.quantity`)}
                      onChange={(e) => handleProductChange(product.id, 'quantity', Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label htmlFor={`product-price-${product.id}`} className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                      Price (₹) <span className="text-[var(--error)]">*</span>
                    </label>
                    <Input
                      id={`product-price-${product.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.price}
                      aria-invalid={!!getFieldError(`products.${index}.price`)}
                      onChange={(e) => handleProductChange(product.id, 'price', Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label htmlFor={`product-weight-${product.id}`} className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                      Weight (kg) <span className="text-[var(--text-muted)] font-normal ml-1">(Optional)</span>
                    </label>
                    <Input
                      id={`product-weight-${product.id}`}
                      type="number"
                      step="0.01"
                      value={product.weight || ''}
                      onChange={(e) => handleProductChange(product.id, 'weight', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                <div className="flex justify-end p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Subtotal: <span className="font-bold text-[var(--text-primary)]">₹{(product.quantity * product.price).toFixed(2)}</span>
                  </p>
                </div>
              </div>
            ))}

            {getFieldError('products') && <p className="text-xs text-[var(--error)] text-center p-2 bg-[var(--error-bg)] rounded-md">{getFieldError('products')}</p>}

            <button
              type="button"
              onClick={addProduct}
              className="w-full py-4 border border-dashed border-[var(--border-subtle)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--primary-blue)] hover:border-[var(--primary-blue)] hover:bg-[var(--primary-blue-soft)]/10 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Another Product
            </button>
          </div>
        );

      case 2:
        return (
          <div>
            <fieldset className="mb-8">
              <legend className="text-base font-semibold text-[var(--text-primary)] mb-4">Payment Method</legend>
              <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { value: 'prepaid', label: 'Prepaid' },
                  { value: 'cod', label: 'Cash on Delivery' },
                ].map((option) => (
                  <label
                    key={option.value}
                    htmlFor={`payment-${option.value}`}
                    className={cn(
                      'cursor-pointer relative p-5 rounded-xl border-2 flex items-center gap-4 transition-all duration-200',
                      formData.paymentMethod === option.value
                        ? 'border-[var(--primary-blue)] bg-[var(--primary-blue-soft)]/10 shadow-sm ring-1 ring-[var(--primary-blue)]/10'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-tertiary)]'
                    )}
                  >
                    <input
                      id={`payment-${option.value}`}
                      type="radio"
                      name="paymentMethod"
                      value={option.value}
                      checked={formData.paymentMethod === option.value}
                      onChange={() => handleInputChange('paymentMethod', option.value)}
                      className="sr-only"
                    />
                    <div className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                      formData.paymentMethod === option.value ? 'border-[var(--primary-blue)]' : 'border-[var(--text-muted)]'
                    )}>
                      {formData.paymentMethod === option.value && <div className="w-3 h-3 rounded-full bg-[var(--primary-blue)] animate-scale-in" />}
                    </div>
                    <div>
                      <span className="font-semibold text-[var(--text-primary)] block text-base">{option.label}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {option.value === 'prepaid' ? 'Pay online securely' : 'Collect cash upon delivery'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mb-8">
              <label htmlFor="warehouseId" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Fulfillment Warehouse <span className="text-[var(--error)]">*</span>
              </label>
              <div className="relative">
                <select
                  id="warehouseId"
                  value={formData.warehouseId || ''}
                  onChange={(e) => handleInputChange('warehouseId', e.target.value)}
                  disabled={isWarehousesLoading}
                  aria-invalid={!!getFieldError('warehouseId')}
                  className="w-full h-10 px-3 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue-soft)] focus:border-[var(--primary-blue)] appearance-none transition-all"
                >
                  <option value="">{isWarehousesLoading ? 'Loading warehouses...' : 'Select warehouse'}</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}{warehouse.isDefault ? ' (Default)' : ''} - {warehouse.address.city}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] rotate-90" />
                </div>
              </div>
              {getFieldError('warehouseId') && <p className="text-xs text-[var(--error)] mt-1.5">{getFieldError('warehouseId')}</p>}
            </div>

            <AnimatePresence>
              {routePreflight.status !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-sm flex items-center gap-3 mt-6 mb-8',
                    routePreflight.status === 'success' && 'border-[var(--success)]/20 bg-[var(--success)]/5 text-[var(--success)]',
                    routePreflight.status === 'error' && 'border-[var(--error)]/20 bg-[var(--error-bg)] text-[var(--error)]',
                    routePreflight.status === 'checking' && 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  )}
                >
                  {routePreflight.status === 'checking' ? (
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  ) : routePreflight.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  )}

                  <p className="font-medium">
                    {routePreflight.message || 'Route serviceability check will run automatically.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {getFieldError('preflight') && <p className="text-xs text-[var(--error)] mt-1.5">{getFieldError('preflight')}</p>}

            <div className="mb-8">
              <label htmlFor="externalOrderNumber" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                External Order Number <span className="text-[var(--text-muted)] font-normal ml-1">(Optional)</span>
              </label>
              <Input
                id="externalOrderNumber"
                value={formData.externalOrderNumber}
                placeholder="e.g. ORD-001"
                onChange={(e) => handleInputChange('externalOrderNumber', e.target.value)}
              />
            </div>

            <div className="mb-8">
              <label htmlFor="notes" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Notes <span className="text-[var(--text-muted)] font-normal ml-1">(Optional)</span>
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                rows={3}
                placeholder="Add any special instructions..."
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-4 py-3 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue-soft)] focus:border-[var(--primary-blue)] transition-all"
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Tags <span className="text-[var(--text-muted)] font-normal ml-1">(Optional)</span>
              </label>
              <Input
                id="tags"
                value={formData.tags}
                placeholder="e.g. priority, fragile, repeat-customer"
                onChange={(e) => handleInputChange('tags', e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
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
                    {formData.addressLine1}, {formData.addressLine2 ? `${formData.addressLine2}, ` : ''}
                    {formData.city} - {formData.postalCode}, {formData.state}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Products</p>
                  {formData.products.map((product) => (
                    <div key={product.id} className="text-[var(--text-secondary)] mb-2">
                      <span className="font-medium text-[var(--text-primary)]">{product.name}</span>
                      <span className="text-[var(--text-muted)]"> × {product.quantity} @ ₹{product.price}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Warehouse</p>
                  <p className="text-[var(--text-secondary)]">
                    {selectedWarehouse ? `${selectedWarehouse.name} (${selectedWarehouse.address.city})` : 'Not selected'}
                  </p>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-3">
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Pricing</p>
                  <div className="flex justify-between mb-1">
                    <span className="text-[var(--text-secondary)]">Subtotal:</span>
                    <span className="text-[var(--text-primary)]">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-[var(--text-primary)]">Total:</span>
                    <span className="text-[var(--primary-blue)]">₹{totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[var(--primary-blue-soft)]/10 rounded-xl border border-[var(--primary-blue)]/20">
              <Truck className="w-5 h-5 text-[var(--primary-blue)] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Ready to create order?</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  This order will be created with strict address and route validation. Shipment booking can continue from the shipments page.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
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
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-1">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const Icon = step.icon;

              return (
                <div key={step.id} className="relative">
                  <button
                    type="button"
                    aria-current={isActive ? 'step' : undefined}
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
                      {isCompleted ? <CheckCircle2 className="w-5 h-5 text-[var(--success)]" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <p className={cn('text-sm font-bold', isActive ? 'text-white' : 'text-[var(--text-primary)]')}>{step.title}</p>
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

        <div className="flex-1">
          <Card className="bg-[var(--bg-primary)] border-[var(--border-subtle)] shadow-xl overflow-hidden min-h-[500px] flex flex-col">
            <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
              <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">{steps[currentStep].title}</CardTitle>
              <CardDescription className="text-[var(--text-secondary)]">{steps[currentStep].description}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1">
              {error && (
                <Alert
                  variant="error"
                  role="status"
                  aria-live="polite"
                  className="mb-6 bg-[var(--error-bg)] border-[var(--error)]/20 text-[var(--error)]"
                >
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
                  className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/20 w-40"
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
                  className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-deep)] text-white shadow-lg shadow-blue-500/20"
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
