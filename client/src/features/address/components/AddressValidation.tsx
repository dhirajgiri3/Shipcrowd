/**
 * Address Validation Component
 * 
 * Reusable address input form with real-time validation and auto-fill.
 * Features:
 * - Pincode input with auto-validation
 * - City/State auto-fill on valid pincode
 * - Serviceability check status
 * - Inline validation errors
 * - Dark mode support
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCityStateFromPincode, usePincodeServiceability } from '@/src/core/api/hooks/logistics/useAddress';
import { MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { Address, AddressValidationError, PincodeServiceability } from '@/src/types/api/logistics';

interface AddressValidationProps {
    initialAddress?: Partial<Address>;
    onValidAddress?: (address: Address, serviceability: PincodeServiceability) => void;
    onAddressChange?: (address: Partial<Address>) => void;
    onValidationError?: (errors: AddressValidationError[]) => void;
    showServiceability?: boolean;
    required?: boolean;
    disabled?: boolean;
    className?: string;
}

export function AddressValidation({
    initialAddress = {},
    onValidAddress,
    onAddressChange,
    onValidationError,
    showServiceability = true,
    required = false,
    disabled = false,
    className = '',
}: AddressValidationProps) {
    const [address, setAddress] = useState<Partial<Address>>({
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        landmark: '',
        contactName: '',
        contactPhone: '',
        ...initialAddress,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isPincodeAutoFilled, setIsPincodeAutoFilled] = useState(false);

    // Pincode lookup hooks
    const { data: pincodeInfo, isLoading: isPincodeLoading } = useCityStateFromPincode(address.pincode || '');
    const { data: serviceability, isLoading: isServiceabilityLoading } = usePincodeServiceability(
        address.pincode || '',
        { enabled: showServiceability && !!pincodeInfo }
    );

    // Auto-fill city and state when pincode info is fetched
    useEffect(() => {
        if (pincodeInfo && !isPincodeAutoFilled) {
            setAddress(prev => ({
                ...prev,
                city: pincodeInfo.city,
                state: pincodeInfo.state,
            }));
            setIsPincodeAutoFilled(true);
        }
    }, [pincodeInfo, isPincodeAutoFilled]);

    // Reset auto-fill flag when pincode changes
    useEffect(() => {
        setIsPincodeAutoFilled(false);
    }, [address.pincode]);

    // Notify parent on address change
    useEffect(() => {
        onAddressChange?.(address);
    }, [address, onAddressChange]);

    // Validate fields
    const validateField = useCallback((field: keyof Address, value: string): string | null => {
        switch (field) {
            case 'line1':
                if (required && !value.trim()) return 'Address Line 1 is required';
                if (value && value.length < 5) return 'Address must be at least 5 characters';
                break;
            case 'city':
                if (required && !value.trim()) return 'City is required';
                break;
            case 'state':
                if (required && !value.trim()) return 'State is required';
                break;
            case 'pincode':
                if (required && !value.trim()) return 'Pincode is required';
                if (value && !/^\d{6}$/.test(value)) return 'Pincode must be 6 digits';
                break;
            case 'contactPhone':
                if (value && !/^[6-9]\d{9}$/.test(value.replace(/\s/g, ''))) {
                    return 'Enter a valid 10-digit mobile number';
                }
                break;
        }
        return null;
    }, [required]);

    // Validate all fields
    const validateAll = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        const fields: (keyof Address)[] = ['line1', 'city', 'state', 'pincode', 'contactPhone'];

        fields.forEach(field => {
            const error = validateField(field, String(address[field] || ''));
            if (error) newErrors[field] = error;
        });

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0 && onValidationError) {
            const validationErrors: AddressValidationError[] = Object.entries(newErrors).map(([field, message]) => ({
                field: field as keyof Address,
                message,
                code: `INVALID_${field.toUpperCase()}`,
            }));
            onValidationError(validationErrors);
        }

        return Object.keys(newErrors).length === 0;
    }, [address, validateField, onValidationError]);

    // Check if address is complete and valid
    useEffect(() => {
        if (
            address.line1 &&
            address.city &&
            address.state &&
            address.pincode &&
            serviceability &&
            validateAll() &&
            onValidAddress
        ) {
            onValidAddress(address as Address, serviceability);
        }
    }, [address, serviceability, validateAll, onValidAddress]);

    // Handle field change
    const handleChange = (field: keyof Address, value: string) => {
        setAddress(prev => ({ ...prev, [field]: value }));

        // Validate on change if field was touched
        if (touched[field]) {
            const error = validateField(field, value);
            setErrors(prev => ({
                ...prev,
                [field]: error || '',
            }));
        }
    };

    // Handle field blur
    const handleBlur = (field: keyof Address) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        const error = validateField(field, String(address[field] || ''));
        setErrors(prev => ({
            ...prev,
            [field]: error || '',
        }));
    };

    const inputClasses = (field: keyof Address) => `
    w-full px-4 py-3 rounded-lg border transition-colors
    ${errors[field] && touched[field]
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'
        }
    bg-white dark:bg-gray-800
    text-gray-900 dark:text-white
    placeholder:text-gray-400 dark:placeholder:text-gray-500
    focus:outline-none focus:ring-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

    const labelClasses = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
    const errorClasses = 'text-xs text-red-500 mt-1 flex items-center gap-1';

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Address Line 1 */}
            <div>
                <label className={labelClasses}>
                    Address Line 1 {required && <span className="text-red-500">*</span>}
                </label>
                <input
                    type="text"
                    value={address.line1}
                    onChange={(e) => handleChange('line1', e.target.value)}
                    onBlur={() => handleBlur('line1')}
                    placeholder="House/Flat No., Building Name, Street"
                    className={inputClasses('line1')}
                    disabled={disabled}
                />
                {errors.line1 && touched.line1 && (
                    <p className={errorClasses}>
                        <AlertCircle className="w-3 h-3" />
                        {errors.line1}
                    </p>
                )}
            </div>

            {/* Address Line 2 */}
            <div>
                <label className={labelClasses}>Address Line 2</label>
                <input
                    type="text"
                    value={address.line2}
                    onChange={(e) => handleChange('line2', e.target.value)}
                    placeholder="Area, Locality (Optional)"
                    className={inputClasses('line2')}
                    disabled={disabled}
                />
            </div>

            {/* Pincode, City, State Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pincode */}
                <div>
                    <label className={labelClasses}>
                        Pincode {required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={address.pincode}
                            onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            onBlur={() => handleBlur('pincode')}
                            placeholder="6-digit"
                            maxLength={6}
                            className={`${inputClasses('pincode')} pl-10 pr-10`}
                            disabled={disabled}
                        />
                        {isPincodeLoading && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 animate-spin" />
                        )}
                        {pincodeInfo && !isPincodeLoading && (
                            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                        )}
                    </div>
                    {errors.pincode && touched.pincode && (
                        <p className={errorClasses}>
                            <AlertCircle className="w-3 h-3" />
                            {errors.pincode}
                        </p>
                    )}
                </div>

                {/* City */}
                <div>
                    <label className={labelClasses}>
                        City {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="text"
                        value={address.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        onBlur={() => handleBlur('city')}
                        placeholder="City"
                        className={`${inputClasses('city')} ${isPincodeAutoFilled ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}
                        disabled={disabled || isPincodeLoading}
                    />
                    {errors.city && touched.city && (
                        <p className={errorClasses}>
                            <AlertCircle className="w-3 h-3" />
                            {errors.city}
                        </p>
                    )}
                </div>

                {/* State */}
                <div>
                    <label className={labelClasses}>
                        State {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="text"
                        value={address.state}
                        onChange={(e) => handleChange('state', e.target.value)}
                        onBlur={() => handleBlur('state')}
                        placeholder="State"
                        className={`${inputClasses('state')} ${isPincodeAutoFilled ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}
                        disabled={disabled || isPincodeLoading}
                    />
                    {errors.state && touched.state && (
                        <p className={errorClasses}>
                            <AlertCircle className="w-3 h-3" />
                            {errors.state}
                        </p>
                    )}
                </div>
            </div>

            {/* Landmark */}
            <div>
                <label className={labelClasses}>Landmark</label>
                <input
                    type="text"
                    value={address.landmark}
                    onChange={(e) => handleChange('landmark', e.target.value)}
                    placeholder="Near landmark (Optional)"
                    className={inputClasses('landmark')}
                    disabled={disabled}
                />
            </div>

            {/* Serviceability Status */}
            {showServiceability && address.pincode?.length === 6 && !isServiceabilityLoading && serviceability && (
                <div className={`p-3 rounded-lg flex items-center gap-3 ${serviceability.isServiceable
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                    }`}>
                    {serviceability.isServiceable ? (
                        <>
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <div>
                                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                    Serviceable Location
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    {serviceability.serviceableCouriers.length} courier partners available
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <div>
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                    Limited Serviceability
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Delivery may be delayed or unavailable
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default AddressValidation;
