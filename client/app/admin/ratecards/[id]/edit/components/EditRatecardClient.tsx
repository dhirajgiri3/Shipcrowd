"use client";
export const dynamic = "force-dynamic";

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useAdminRateCard, useUpdateAdminRateCard } from '@/src/core/api/hooks/admin/useAdminRateCards';
import { RateCardWizard } from '../../../components/RateCardWizard';
import { RateCardFormData, initialRateCardFormData, buildRateCardPayload } from '../../../components/ratecardWizard.utils';

interface EditRatecardClientProps {
    rateCardId: string;
}

export function EditRatecardClient({ rateCardId }: EditRatecardClientProps) {
    const { addToast } = useToast();
    const router = useRouter();
    const { data: rateCard, isLoading } = useAdminRateCard(rateCardId);
    const { mutate: updateRateCard, isPending } = useUpdateAdminRateCard();

    // Derive initial data directly from rateCard
    const initialData = useMemo<RateCardFormData>(() => {
        if (!rateCard) return initialRateCardFormData;

        const baseRate = rateCard.baseRates?.[0];
        const weightRule = rateCard.weightRules?.[0];
        const multipliers = rateCard.zoneMultipliers || { zoneA: 1 };
        const basePrice = baseRate?.basePrice || 0;

        // Calculate additional weight/price from weight rules if available
        // Default to 500g logic if not explicitly found
        const additionalWeight = 500; // Fixed as per previous logic, or assert from weightRules[0].minWeight/maxWeight difference
        const additionalZoneA = weightRule?.pricePerKg
            ? (weightRule.pricePerKg / 1000) * additionalWeight
            : 0;

        return {
            ...initialRateCardFormData,
            courierProviderId: baseRate?.carrier || '',
            courierServiceId: baseRate?.serviceType || '',
            rateCardCategory: rateCard.rateCardCategory || '',
            shipmentType: rateCard.shipmentType || 'forward',
            gst: String(rateCard.gst || 18),
            minimumFare: String(rateCard.minimumFare || rateCard.minimumCall || 0),
            minimumFareCalculatedOn: rateCard.minimumFareCalculatedOn || 'freight',
            zoneBType: rateCard.zoneBType || 'state',
            status: (rateCard.status as any) || 'active',
            isGeneric: rateCard.name?.startsWith('GENERIC') || false,
            basicWeight: String((baseRate?.maxWeight || 0.5) * 1000),
            basicZoneA: String(basePrice),
            basicZoneB: multipliers.zoneB ? String((basePrice * multipliers.zoneB).toFixed(2)) : '',
            basicZoneC: multipliers.zoneC ? String((basePrice * multipliers.zoneC).toFixed(2)) : '',
            basicZoneD: multipliers.zoneD ? String((basePrice * multipliers.zoneD).toFixed(2)) : '',
            basicZoneE: multipliers.zoneE ? String((basePrice * multipliers.zoneE).toFixed(2)) : '',
            additionalWeight: String(additionalWeight),
            additionalZoneA: String(additionalZoneA || ''),
            codPercentage: String(rateCard.codPercentage || 2.5),
            codMinimumCharge: String(rateCard.codMinimumCharge || 25),
        };
    }, [rateCard]);

    const handleSubmit = async (formData: RateCardFormData) => {
        if (!formData.isGeneric && (!formData.courierProviderId || !formData.courierServiceId)) {
            addToast('Please select a courier and service', 'error');
            return;
        }

        const payload = buildRateCardPayload(formData);
        const updatePayload = {
            ...payload,
            name: rateCard?.name || payload.name,
        };

        updateRateCard({ id: rateCardId, data: updatePayload }, {
            onSuccess: () => {
                addToast('Rate card updated successfully!', 'success');
                router.push('/admin/ratecards');
            },
            onError: (error: any) => {
                addToast(error?.response?.data?.message || 'Failed to update rate card', 'error');
            }
        });
    };

    if (isLoading || !rateCard) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader className="h-8 w-8 text-[var(--primary-blue)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/ratecards">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <CreditCard className="h-6 w-6 text-[var(--primary-blue)]" />
                            Edit Rate Card
                        </h1>
                        <p className="text-[var(--text-muted)] text-sm mt-1">
                            Modify pricing for this service
                        </p>
                    </div>
                </div>
            </div>

            {/* Key prop ensures component remounts when ID changes or data loads */}
            <RateCardWizard
                key={rateCard?._id || 'loading'}
                initialData={initialData}
                onSubmit={handleSubmit}
                onSaveDraft={(draftData) => handleSubmit({ ...draftData, status: 'draft' })}
                submitLabel={isPending ? 'Updating...' : 'Update Rate Card'}
            />
        </div>
    );
}
