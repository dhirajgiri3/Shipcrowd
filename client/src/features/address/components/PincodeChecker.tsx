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
import { MapPin, Truck, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Input } from '@/src/components/ui/core/Input';
import { SpinnerLoader } from '@/src/components/ui/feedback/Loader';
import { handleApiError } from '@/src/lib/error';
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

    // Notify parent on error and show Toast
    useEffect(() => {
        if (isError && error) {
            handleApiError(error, 'Failed to check pincode');
            onError?.(error.message || 'Failed to check pincode');
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
                <Input
                    type="text"
                    value={pincode}
                    onChange={handlePincodeChange}
                    placeholder="Enter 6-digit pincode"
                    maxLength={6}
                    size="lg"
                    error={isError}
                    icon={<MapPin className="h-5 w-5 text-[var(--text-muted)]" />}
                    rightIcon={
                        isLoading ? (
                            <SpinnerLoader size="sm" />
                        ) : undefined
                    }
                    className="text-lg font-medium tracking-wider"
                />

                {/* Validation indicator */}
                {pincode.length > 0 && pincode.length < 6 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--warning)]">
                        <AlertCircle className="h-3 w-3" />
                        Enter {6 - pincode.length} more digits
                    </p>
                )}
            </div>

            {/* City/State Auto-fill */}
            {pincodeInfo && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-4 py-2 text-sm text-[var(--text-secondary)]">
                    <MapPin className="h-4 w-4 text-[var(--primary-blue)]" />
                    <span className="font-medium">{pincodeInfo.city}</span>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span>{pincodeInfo.state}</span>
                    {pincodeInfo.isMetro && (
                        <>
                            <span className="text-[var(--text-muted)]">•</span>
                            <span className="rounded-full bg-[var(--primary-blue-soft)] px-2 py-0.5 text-xs text-[var(--primary-blue)]">
                                Metro
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Serviceability Status Banner */}
            {isPincodeValid && !isLoading && serviceability && (
                <div
                    className={`rounded-lg border p-4 ${
                        isServiceable
                            ? 'border-[var(--success)]/20 bg-[var(--success-bg)]'
                            : 'border-[var(--error)]/20 bg-[var(--error-bg)]'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {isServiceable ? (
                            <>
                                <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
                                <div>
                                    <p className="font-semibold text-[var(--success)]">
                                        Serviceable Pincode
                                    </p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {availableCouriers.length} courier
                                        {availableCouriers.length !== 1 ? 's' : ''} available
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <XCircle className="h-6 w-6 text-[var(--error)]" />
                                <div>
                                    <p className="font-semibold text-[var(--error)]">Not Serviceable</p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        No courier partners deliver to this pincode
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Error State - Toast handles global feedback; inline for context */}
            {isError && (
                <div className="rounded-lg border border-[var(--error)]/20 bg-[var(--error-bg)] p-4">
                    <div className="flex items-center gap-3 text-[var(--error)]">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm">Failed to check serviceability. Please try again.</span>
                    </div>
                </div>
            )}

            {/* Courier Coverage Grid */}
            {showCourierDetails && isServiceable && availableCouriers.length > 0 && (
                <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
                        <Truck className="h-4 w-4" />
                        Available Couriers ({availableCouriers.length})
                    </h4>

                    <div
                        className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}
                    >
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
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
                <div>
                    <h5 className="font-semibold text-[var(--text-primary)]">
                        {courier.courierDisplayName}
                    </h5>
                    <p className="text-xs text-[var(--text-muted)]">Zone: {courier.zone}</p>
                </div>

                <div className="flex items-center gap-2">
                    {courier.codAvailable && (
                        <span className="rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-xs text-[var(--success)]">
                            COD
                        </span>
                    )}
                    {courier.expressAvailable && (
                        <span className="rounded-full bg-[var(--primary-blue-soft)] px-2 py-0.5 text-xs text-[var(--primary-blue)]">
                            Express
                        </span>
                    )}
                </div>
            </div>

            {!compact && (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Clock className="h-4 w-4" />
                        <span>
                            {courier.estimatedDaysMin ?? courier.estimatedDays}-
                            {courier.estimatedDaysMax ?? courier.estimatedDays} days
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {courier.prepaidAvailable ? (
                            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                        ) : (
                            <XCircle className="h-4 w-4 text-[var(--error)]" />
                        )}
                        <span className="text-[var(--text-secondary)]">Prepaid</span>
                    </div>

                    {courier.sundayDelivery && (
                        <div className="col-span-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                            <span className="text-[var(--text-secondary)]">Sunday Delivery</span>
                        </div>
                    )}

                    {courier.codLimit && (
                        <div className="col-span-2 text-xs text-[var(--text-muted)]">
                            COD Limit: ₹{courier.codLimit.toLocaleString()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default PincodeChecker;
