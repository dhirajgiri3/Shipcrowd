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
  Truck,
  Clock,
  IndianRupee,
  FileOutput,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '@/src/components/ui/layout/PageHeader';
import { PillTabs } from '@/src/components/ui/core/PillTabs';
import { Button } from '@/src/components/ui/core/Button';
import { Input } from '@/src/components/ui/core/Input';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { handleApiError } from '@/src/lib/error';
import type { CourierCoverage, ServiceabilityCheckRequest } from '@/src/types/api/logistics';
import { useSellerExport } from '@/src/core/api/hooks/seller/useSellerExports';

const MODE_TABS = [
  { key: 'single', label: 'Single Pincode' },
  { key: 'route', label: 'Route Check' },
] as const;

export default function PincodeCheckerPage() {
  const [mode, setMode] = useState<'single' | 'route'>('single');
  const [originPincode, setOriginPincode] = useState('');
  const [destinationPincode, setDestinationPincode] = useState('');
  const [singleResult, setSingleResult] = useState<{
    pincode: string;
    isServiceable: boolean;
    couriers: CourierCoverage[];
  } | null>(null);
  const exportSellerData = useSellerExport();

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
    exportSellerData.mutate({
      module: 'pincode_checker',
      filters: {
        mode,
        pincode: singleResult?.pincode || '',
        originPincode: originPincode || '',
        destinationPincode: destinationPincode || '',
        generatedAt: new Date().toISOString(),
        rows: data,
      },
      filename: `serviceability-${mode === 'single' ? singleResult?.pincode : `${originPincode}-${destinationPincode}`}.csv`,
    });
  };

  const handleRetryRoute = () => {
    refetchRoute().catch((err) => handleApiError(err, 'Failed to check route serviceability'));
  };

  return (
    <div className="min-h-screen space-y-8 pb-20 animate-fade-in">
      <PageHeader
        title="Pincode Serviceability Checker"
        description="Check delivery coverage and courier availability for any pincode in India"
        breadcrumbs={[
          { label: 'Tools', href: '/seller/tools' },
          { label: 'Pincode Checker', active: true },
        ]}
        backUrl="/seller/tools"
      />

      {/* Mode Toggle */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-6 shadow-sm">
        <PillTabs
          tabs={MODE_TABS}
          activeTab={mode}
          onTabChange={(key) => setMode(key as 'single' | 'route')}
          className="mb-6"
        />

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
            <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr,auto,1fr]">
              {/* Origin */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Origin Pincode
                </label>
                <Input
                  type="text"
                  value={originPincode}
                  onChange={(e) =>
                    setOriginPincode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="6-digit pincode"
                  maxLength={6}
                  size="lg"
                  icon={<MapPin className="h-5 w-5 text-[var(--success)]" />}
                  className="text-lg font-medium tracking-wider"
                />
              </div>

              {/* Arrow */}
              <div className="hidden items-center justify-center md:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
                  <ArrowRight className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
              </div>

              {/* Destination */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Destination Pincode
                </label>
                <Input
                  type="text"
                  value={destinationPincode}
                  onChange={(e) =>
                    setDestinationPincode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="6-digit pincode"
                  maxLength={6}
                  size="lg"
                  icon={<MapPin className="h-5 w-5 text-[var(--error)]" />}
                  className="text-lg font-medium tracking-wider"
                />
              </div>
            </div>

            {/* Route Results */}
            {isRouteLoading && (
              <div className="py-12">
                <Loader
                  variant="spinner"
                  size="lg"
                  message="Checking route serviceability..."
                  centered
                />
              </div>
            )}

            {isRouteError && (
              <div className="rounded-xl border border-[var(--error)]/20 bg-[var(--error-bg)] p-6 text-center">
                <XCircle className="mx-auto mb-2 h-6 w-6 text-[var(--error)]" />
                <p className="text-[var(--error)]">Failed to check route serviceability</p>
                <Button variant="outline" size="sm" onClick={handleRetryRoute} className="mt-3">
                  Try Again
                </Button>
              </div>
            )}

            {routeResult && (
              <div className="space-y-4">
                {/* Route Summary - design system gradient */}
                <div className="rounded-xl border border-[var(--border-default)] bg-gradient-to-r from-[var(--success)] to-[var(--primary-blue)] p-6 text-white shadow-sm">
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
                <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
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
                <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
                  <Truck className="h-4 w-4" />
                  Available Couriers ({routeResult.availableCouriers.length})
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {routeResult.availableCouriers.map((courier) => (
                    <div
                      key={courier.courier}
                      className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 transition-shadow hover:shadow-md"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <h5 className="font-semibold text-[var(--text-primary)]">
                          {courier.courierDisplayName}
                        </h5>
                        <div className="flex gap-1">
                          {courier.codAvailable && (
                            <span className="rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-xs text-[var(--success)]">
                              COD
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button variant="primary" onClick={handleExport}>
            <FileOutput className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      )}

      {/* Info Section */}
      <div className="rounded-xl border border-[var(--primary-blue)]/20 bg-[var(--primary-blue)]/5 p-6">
        <h3 className="mb-3 font-semibold text-[var(--primary-blue)]">
          About Pincode Serviceability
        </h3>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Check coverage for all major courier partners including Velocity, Delhivery, Ekart,
            XpressBees, and BlueDart
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            View COD availability, delivery time estimates, and zone information
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Export serviceability data to CSV for bulk analysis
          </li>
        </ul>
      </div>
    </div>
    );
}
