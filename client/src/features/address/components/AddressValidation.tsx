'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCityStateFromPincode, usePincodeServiceability } from '@/src/core/api/hooks/logistics/useAddress';
import { apiClient } from '@/src/core/api/http';
import { MapPin, Search, AlertCircle, Check, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription } from '@/src/components/ui/feedback/Alert';
import type { Address, AddressValidationError, PincodeInfo, PincodeServiceability } from '@/src/types/api/logistics';
import { Input } from '@/src/components/ui';
import { AddressAutocomplete } from './AddressAutocomplete';

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

type FieldVerificationState = 'unverified' | 'verified' | 'manual';

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
    const [isManualEntry, setIsManualEntry] = useState(false); // To control manual input visibility

    // Pincode lookup states
    const [pincodeInfo, setPincodeInfo] = useState<PincodeInfo | null>(null);
    const [isPincodeLoading, setIsPincodeLoading] = useState(false);
    const [pincodeError, setPincodeError] = useState<string | null>(null);
    const [showPincodeHelp, setShowPincodeHelp] = useState(false);

    // Animation state
    const [justFilledFields, setJustFilledFields] = useState<Record<string, boolean>>({});

    // Pincode serviceability hook (still uses the original hook)
    const { data: serviceability, isLoading: isServiceabilityLoading } = usePincodeServiceability(
        address.pincode || '',
        { enabled: showServiceability && !!pincodeInfo && address.pincode?.length === 6 }
    );

    // Debounce pincode lookup to avoid hitting API on every keystroke
    useEffect(() => {
        const lookupPincode = async () => {
            if (address.pincode?.length === 6) {
                // Clear previous errors
                setPincodeError(null);
                setIsPincodeLoading(true);
                try {
                    // Manual fetch using apiClient since hook doesn't expose fetcher
                    const response = await apiClient.get(`/serviceability/pincode/${address.pincode}/info`);
                    const info = response.data?.data?.data || response.data?.data;

                    if (info) {
                        setPincodeInfo(info);
                        // Auto-fill city and state if available
                        if (info.city && info.state) {
                            setAddress(prev => ({
                                ...prev,
                                city: info.city,
                                state: info.state
                            }));
                            // Trigger animation for auto-filled fields
                            triggerFieldAnimation('city');
                            setTimeout(() => triggerFieldAnimation('state'), 100);
                        }
                    } else {
                        setPincodeError("Pincode not found. Please enter details manually.");
                        setPincodeInfo(null);
                    }
                } catch (err) {
                    setPincodeError("Failed to verify pincode. You can enter details manually.");
                    setPincodeInfo(null);
                } finally {
                    setIsPincodeLoading(false);
                }
            } else {
                setPincodeInfo(null);
                setPincodeError(null);
            }
        };

        const timer = setTimeout(lookupPincode, 500);
        return () => clearTimeout(timer);
    }, [address.pincode]);

    const triggerFieldAnimation = (field: string) => {
        setJustFilledFields(prev => ({ ...prev, [field]: true }));
        setTimeout(() => {
            setJustFilledFields(prev => ({ ...prev, [field]: false }));
        }, 2000);
    };

    // Notify parent on address change
    useEffect(() => {
        onAddressChange?.(address);
    }, [address, onAddressChange]); // Added onAddressChange to dependencies for correctness

    // Handle autocomplete address selection
    const handleAddressAutoFill = useCallback((selectedAddress: Address) => {
        // Staggered animation for delight
        const fields = ['line1', 'line2', 'city', 'state', 'pincode'];

        fields.forEach((field, index) => {
            setTimeout(() => {
                triggerFieldAnimation(field);
            }, index * 150);
        });

        setAddress(prev => ({
            ...prev,
            line1: selectedAddress.line1,
            line2: selectedAddress.line2 || '',
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
            landmark: selectedAddress.landmark || '',
        }));

        setIsManualEntry(true); // Switch to manual view to show filled fields
    }, []);

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

    const errorClasses = 'text-xs text-red-500 mt-1 flex items-center gap-1';

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Address Line 1 - with Autocomplete */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address Line 1 {required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                    <AddressAutocomplete
                        value={address.line1 || ''}
                        onChange={(value) => handleChange('line1', value)}
                        onAddressSelect={handleAddressAutoFill}
                        placeholder="Start typing your address..."
                        disabled={disabled}
                        error={!!(errors.line1 && touched.line1)}
                    />
                    <AnimatePresence>
                        {justFilledFields['line1'] && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-primaryBlue"
                            >
                                <Check className="w-4 h-4" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {errors.line1 && touched.line1 && (
                    <p className={errorClasses}>
                        <AlertCircle className="w-3 h-3" />
                        {errors.line1}
                    </p>
                )}
            </div>

            {/* Address Line 2 */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                <div className="relative">
                    <Input
                        type="text"
                        value={address.line2 || ''}
                        onChange={(e) => handleChange('line2', e.target.value)}
                        placeholder="Area, Locality (Optional)"
                        disabled={disabled}
                        size="lg"
                        className={`transition-all duration-300 ${justFilledFields['line2'] ? 'bg-blue-50 border-blue-400' : ''}`}
                    />
                    <AnimatePresence>
                        {justFilledFields['line2'] && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-primaryBlue"
                            >
                                <Check className="w-4 h-4" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Pincode, City, State Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pincode */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Pincode {required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                        <Input
                            type="text"
                            value={address.pincode || ''}
                            onChange={(e) => {
                                // Only allow numbers and max 6 digits
                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                handleChange('pincode', val);
                            }}
                            onBlur={() => handleBlur('pincode')}
                            placeholder="6-digit"
                            maxLength={6}
                            disabled={disabled}
                            size="lg"
                            error={!!(errors.pincode && touched.pincode) || !!pincodeError}
                            icon={<MapPin className="w-4 h-4" />}
                            className={`transition-all duration-300 ${justFilledFields['pincode'] ? 'bg-blue-50 border-blue-400' : ''}`}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="postal-code"
                        />
                        {isPincodeLoading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            </div>
                        )}
                        {!isPincodeLoading && justFilledFields['pincode'] && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primaryBlue">
                                <Check className="w-4 h-4" />
                            </div>
                        )}
                    </div>
                    {pincodeError && (
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-red-500">{pincodeError}</p>
                            <button
                                onClick={() => setAddress(prev => ({ ...prev, pincode: '' }))}
                                className="text-xs text-slate-500 underline hover:text-slate-800"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                    {errors.pincode && touched.pincode && !pincodeError && (
                        <p className={errorClasses}>
                            <AlertCircle className="w-3 h-3" />
                            {errors.pincode}
                        </p>
                    )}
                </div>

                {/* City */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        City {required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                        <Input
                            type="text"
                            value={address.city || ''}
                            onChange={(e) => handleChange('city', e.target.value)}
                            onBlur={() => handleBlur('city')}
                            placeholder="City"
                            disabled={disabled || isPincodeLoading}
                            size="lg"
                            error={!!(errors.city && touched.city)}
                            readOnly={!!pincodeInfo?.city} // Lock if fetched from service
                            className={`transition-all duration-300 ${justFilledFields['city'] ? 'bg-blue-50 border-blue-400' : ''} ${pincodeInfo?.city ? 'bg-slate-50' : ''}`}
                            autoComplete="address-level2"
                        />
                        <AnimatePresence>
                            {justFilledFields['city'] && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primaryBlue"
                                >
                                    <Check className="w-4 h-4" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {errors.city && touched.city && (
                        <p className={errorClasses}>
                            <AlertCircle className="w-3 h-3" />
                            {errors.city}
                        </p>
                    )}
                </div>

                {/* State */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        State {required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                        <Input
                            type="text"
                            value={address.state || ''}
                            onChange={(e) => handleChange('state', e.target.value)}
                            onBlur={() => handleBlur('state')}
                            placeholder="State"
                            disabled={disabled || isPincodeLoading}
                            size="lg"
                            error={!!(errors.state && touched.state)}
                            readOnly={!!pincodeInfo?.state} // Lock if fetched from service
                            className={`transition-all duration-300 ${justFilledFields['state'] ? 'bg-blue-50 border-blue-400' : ''} ${pincodeInfo?.state ? 'bg-slate-50' : ''}`}
                            autoComplete="address-level1"
                        />
                        <AnimatePresence>
                            {justFilledFields['state'] && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primaryBlue"
                                >
                                    <Check className="w-4 h-4" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Landmark</label>
                <Input
                    type="text"
                    value={address.landmark || ''}
                    onChange={(e) => handleChange('landmark', e.target.value)}
                    placeholder="Near landmark (Optional)"
                    disabled={disabled}
                    size="lg"
                />
            </div>

            {/* Serviceability Status */}
            {showServiceability && address.pincode?.length === 6 && !isServiceabilityLoading && serviceability && (
                <div className={`p-3 rounded-lg flex items-center gap-3 ${serviceability.isServiceable
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-amber-50 border border-amber-200'
                    }`}>
                    {serviceability.isServiceable ? (
                        <>
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-green-800">
                                    Serviceable Location
                                </p>
                                <p className="text-xs text-green-600">
                                    {serviceability.serviceableCouriers.length} courier partners available
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <div>
                                <p className="text-sm font-medium text-amber-800">
                                    Limited Serviceability
                                </p>
                                <p className="text-xs text-amber-600">
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
