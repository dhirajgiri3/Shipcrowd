/**
 * Pincode Checker Component
 * 
 * Checks pincode serviceability and displays courier coverage.
 * Features:
 * - Pincode input with validation
 * - Auto-fetch city/state on valid pincode
 * - Display all courier coverage information
 * - COD availability indicator per courier
 * - Estimated delivery days
 */

'use client';

import React, { useState, useEffect } from 'react';
import { usePincodeLookup } from '@/src/core/api/hooks/logistics/useAddress';
import { MapPin, Truck, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { CourierCoverage } from '@/src/types/api/logistics';

interface PincodeCheckerProps {
    onServiceabilityResult?: (result: {
        pincode: string;
        isServiceable: boolean;
        couriers: CourierCoverage[]
    }) => void;
    onError?: (error: string) => void;
    showCourierDetails?: boolean;
    compact?: boolean;
    className?: string;
}

export function PincodeChecker({
    onServiceabilityResult,
    onError,
    showCourierDetails = true,
    compact = false,
    className = '',
}: PincodeCheckerProps) {
    const [pincode, setPincode] = useState('');
    const [debouncedPincode, setDebouncedPincode] = useState('');

    // Debounce pincode input
    useEffect(() => {
        const timer = setTimeout(() => {
            if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
                setDebouncedPincode(pincode);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [pincode]);

    const {
        pincodeInfo,
        serviceability,
        isLoading,
        isError,
        error,
        isServiceable,
        availableCouriers,
    } = usePincodeLookup(debouncedPincode);

    // Notify parent when serviceability result changes
    useEffect(() => {
        if (serviceability && onServiceabilityResult) {
            onServiceabilityResult({
                pincode: debouncedPincode,
                isServiceable,
                couriers: availableCouriers,
            });
        }
    }, [serviceability, isServiceable, availableCouriers, debouncedPincode, onServiceabilityResult]);

    // Notify parent on error
    useEffect(() => {
        if (isError && onError && error) {
            onError(error.message || 'Failed to check pincode');
        }
    }, [isError, error, onError]);

    const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setPincode(value);
    };

    const isPincodeValid = pincode.length === 6 && /^\d{6}$/.test(pincode);

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Pincode Input */}
            <div className="relative">
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={pincode}
                        onChange={handlePincodeChange}
                        placeholder="Enter 6-digit pincode"
                        className={`w-full pl-10 pr-10 py-3 rounded-lg border transition-colors text-lg font-medium tracking-wider
              ${isError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'}
              bg-white dark:bg-gray-800 
              focus:outline-none focus:ring-2
            `}
                        maxLength={6}
                    />
                    {isLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500 animate-spin" />
                    )}
                </div>

                {/* Validation indicator */}
                {pincode.length > 0 && pincode.length < 6 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Enter {6 - pincode.length} more digits
                    </p>
                )}
            </div>

            {/* City/State Auto-fill */}
            {pincodeInfo && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-lg">
                    <MapPin className="w-4 h-4 text-primary-500" />
                    <span className="font-medium">{pincodeInfo.city}</span>
                    <span className="text-gray-400">•</span>
                    <span>{pincodeInfo.state}</span>
                    {pincodeInfo.isMetro && (
                        <>
                            <span className="text-gray-400">•</span>
                            <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                                Metro
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Serviceability Status Banner */}
            {isPincodeValid && !isLoading && serviceability && (
                <div className={`p-4 rounded-lg ${isServiceable
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                    <div className="flex items-center gap-3">
                        {isServiceable ? (
                            <>
                                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                                <div>
                                    <p className="font-semibold text-green-800 dark:text-green-200">
                                        Serviceable Pincode
                                    </p>
                                    <p className="text-sm text-green-600 dark:text-green-400">
                                        {availableCouriers.length} courier{availableCouriers.length !== 1 ? 's' : ''} available
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                <div>
                                    <p className="font-semibold text-red-800 dark:text-red-200">
                                        Not Serviceable
                                    </p>
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        No courier partners deliver to this pincode
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Error State */}
            {isError && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">Failed to check serviceability. Please try again.</span>
                    </div>
                </div>
            )}

            {/* Courier Coverage Grid */}
            {showCourierDetails && isServiceable && availableCouriers.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Available Couriers ({availableCouriers.length})
                    </h4>

                    <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                        {availableCouriers.map((courier) => (
                            <CourierCard key={courier.courier} courier={courier} compact={compact} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ==================== Courier Card Sub-component ====================

interface CourierCardProps {
    courier: CourierCoverage;
    compact?: boolean;
}

function CourierCard({ courier, compact = false }: CourierCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white">
                        {courier.courierDisplayName}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Zone: {courier.zone}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {courier.codAvailable && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                            COD
                        </span>
                    )}
                    {courier.expressAvailable && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            Express
                        </span>
                    )}
                </div>
            </div>

            {!compact && (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{courier.estimatedDaysMin ?? courier.estimatedDays}-{courier.estimatedDaysMax ?? courier.estimatedDays} days</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {courier.prepaidAvailable ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-gray-600 dark:text-gray-400">Prepaid</span>
                    </div>

                    {courier.sundayDelivery && (
                        <div className="flex items-center gap-2 col-span-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-gray-600 dark:text-gray-400">Sunday Delivery</span>
                        </div>
                    )}

                    {courier.codLimit && (
                        <div className="col-span-2 text-xs text-gray-500 dark:text-gray-400">
                            COD Limit: ₹{courier.codLimit.toLocaleString()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default PincodeChecker;
