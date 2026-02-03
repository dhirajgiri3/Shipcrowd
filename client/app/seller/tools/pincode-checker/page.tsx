/**
 * Pincode Serviceability Checker Page
 * 
 * Standalone tool for checking pincode serviceability across all courier partners.
 * Features:
 * - Single pincode check with detailed courier coverage
 * - Route serviceability (origin → destination)
 * - Export coverage report
 */

'use client';

import React, { useState } from 'react';
import { PincodeChecker } from '@/src/features/address';
import { useRouteServiceability } from '@/src/core/api/hooks/logistics/useAddress';
import {
    MapPin,
    ArrowRight,
    Search,
    Truck,
    Clock,
    IndianRupee,
    Download,
    CheckCircle2,
    XCircle,
    Loader2,
    RotateCcw,
} from 'lucide-react';
import type { CourierCoverage, ServiceabilityCheckRequest } from '@/src/types/api/logistics';

export default function PincodeCheckerPage() {
    const [mode, setMode] = useState<'single' | 'route'>('single');
    const [originPincode, setOriginPincode] = useState('');
    const [destinationPincode, setDestinationPincode] = useState('');
    const [singleResult, setSingleResult] = useState<{
        pincode: string;
        isServiceable: boolean;
        couriers: CourierCoverage[];
    } | null>(null);

    // Route serviceability query
    const routeRequest: ServiceabilityCheckRequest = {
        originPincode,
        destinationPincode,
    };
    const {
        data: routeResult,
        isLoading: isRouteLoading,
        isError: isRouteError,
        refetch: refetchRoute,
    } = useRouteServiceability(routeRequest, {
        enabled: mode === 'route' && originPincode.length === 6 && destinationPincode.length === 6,
    });

    const handleReset = () => {
        setOriginPincode('');
        setDestinationPincode('');
        setSingleResult(null);
    };

    const handleExport = () => {
        const data = mode === 'single' ? singleResult?.couriers : routeResult?.availableCouriers;
        if (!data) return;

        const csv = [
            ['Courier', 'Serviceable', 'COD Available', 'Prepaid', 'Est. Days', 'Zone'].join(','),
            ...data.map(c => [
                c.courierDisplayName,
                c.serviceable ? 'Yes' : 'No',
                c.codAvailable ? 'Yes' : 'No',
                c.prepaidAvailable ? 'Yes' : 'No',
                c.estimatedDays,
                c.zone,
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `serviceability-${mode === 'single' ? singleResult?.pincode : `${originPincode}-${destinationPincode}`}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                        Pincode Serviceability Checker
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                        Check delivery coverage and courier availability for any pincode in India
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm border border-[var(--border-default)] p-6 mb-6">
                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={() => setMode('single')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2
                ${mode === 'single'
                                    ? 'bg-[var(--primary-blue)] text-white shadow-lg'
                                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                }`}
                        >
                            <MapPin className="w-5 h-5" />
                            Single Pincode
                        </button>
                        <button
                            onClick={() => setMode('route')}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2
                ${mode === 'route'
                                    ? 'bg-[var(--primary-blue)] text-white shadow-lg'
                                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                }`}
                        >
                            <ArrowRight className="w-5 h-5" />
                            Route Check
                        </button>
                    </div>

                    {/* Single Pincode Mode */}
                    {mode === 'single' && (
                        <div className="space-y-6">
                            <PincodeChecker
                                onServiceabilityResult={(result) => setSingleResult(result)}
                                showCourierDetails={true}
                            />
                        </div>
                    )}

                    {/* Route Check Mode */}
                    {mode === 'route' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
                                {/* Origin */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Origin Pincode
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--success)]" />
                                        <input
                                            type="text"
                                            value={originPincode}
                                            onChange={(e) => setOriginPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="6-digit pincode"
                                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-lg font-medium tracking-wider focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
                                            maxLength={6}
                                        />
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="hidden md:flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
                                        <ArrowRight className="w-5 h-5 text-[var(--text-muted)]" />
                                    </div>
                                </div>

                                {/* Destination */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Destination Pincode
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--error)]" />
                                        <input
                                            type="text"
                                            value={destinationPincode}
                                            onChange={(e) => setDestinationPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="6-digit pincode"
                                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-lg font-medium tracking-wider focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]"
                                            maxLength={6}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Route Results */}
                            {isRouteLoading && (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-[var(--primary-blue)] animate-spin" />
                                    <span className="ml-3 text-[var(--text-secondary)]">Checking route serviceability...</span>
                                </div>
                            )}

                            {isRouteError && (
                                <div className="p-4 rounded-lg bg-[var(--error-bg)] border border-[var(--error)]/20 text-center">
                                    <XCircle className="w-6 h-6 text-[var(--error)] mx-auto mb-2" />
                                    <p className="text-[var(--error)]">Failed to check route serviceability</p>
                                    <button
                                        onClick={() => refetchRoute()}
                                        className="mt-2 text-sm text-[var(--error)] hover:underline"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}

                            {routeResult && (
                                <div className="space-y-4">
                                    {/* Route Summary */}
                                    <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-6 text-white">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-center">
                                                <p className="text-sm opacity-80">Origin</p>
                                                <p className="text-2xl font-bold">{originPincode}</p>
                                                <p className="text-sm">{routeResult.origin.city}</p>
                                            </div>
                                            <ArrowRight className="w-8 h-8" />
                                            <div className="text-center">
                                                <p className="text-sm opacity-80">Destination</p>
                                                <p className="text-2xl font-bold">{destinationPincode}</p>
                                                <p className="text-sm">{routeResult.destination.city}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                                            {routeResult.cheapestOption && (
                                                <div className="flex items-center gap-2">
                                                    <IndianRupee className="w-5 h-5" />
                                                    <div>
                                                        <p className="text-xs opacity-80">Cheapest</p>
                                                        <p className="font-semibold">{routeResult.cheapestOption.courier}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {routeResult.fastestOption && (
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-5 h-5" />
                                                    <div>
                                                        <p className="text-xs opacity-80">Fastest</p>
                                                        <p className="font-semibold">{routeResult.fastestOption.courier} ({routeResult.fastestOption.estimatedDays}d)</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Available Couriers */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                                            <Truck className="w-4 h-4" />
                                            Available Couriers ({routeResult.availableCouriers.length})
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {routeResult.availableCouriers.map((courier) => (
                                                <div
                                                    key={courier.courier}
                                                    className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-default)] p-4 hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <h5 className="font-semibold text-[var(--text-primary)]">
                                                            {courier.courierDisplayName}
                                                        </h5>
                                                        <div className="flex gap-1">
                                                            {courier.codAvailable && (
                                                                <span className="text-xs bg-[var(--success)]/10 text-[var(--success)] px-2 py-0.5 rounded-full">
                                                                    COD
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-sm text-[var(--text-secondary)]">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {courier.estimatedDays} days
                                                        </div>
                                                        <div>Zone: {courier.zone}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                {(singleResult || routeResult) && (
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-blue)] hover:bg-[var(--primary-blue)]/90 text-white rounded-lg transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export Report
                        </button>
                    </div>
                )}

                {/* Info Section */}
                <div className="mt-8 bg-[var(--primary-blue)]/5 rounded-xl p-6 border border-[var(--primary-blue)]/20">
                    <h3 className="font-semibold text-[var(--primary-blue)] mb-3">
                        About Pincode Serviceability
                    </h3>
                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            Check coverage for all major courier partners including Velocity, Delhivery, Ekart, XpressBees, and BlueDart
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            View COD availability, delivery time estimates, and zone information
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            Export serviceability data to CSV for bulk analysis
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
