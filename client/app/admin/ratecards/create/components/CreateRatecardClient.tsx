"use client";
export const dynamic = "force-dynamic";

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/src/components/ui/core/Button';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useCreateAdminRateCard, useAdminRateCards } from '@/src/core/api/hooks/admin/useAdminRateCards';
import { RateCardWizard } from '../../components/RateCardWizard';
import { buildRateCardPayload, initialRateCardFormData, RateCardFormData } from '../../components/ratecardWizard.utils';

export function CreateRatecardClient() {
    const { addToast } = useToast();
    const router = useRouter();
    const { mutate: createRateCard, isPending } = useCreateAdminRateCard();
    const { data: existingCards } = useAdminRateCards({ limit: 100 });

    const categoryOptions = useMemo(() => {
        const categories = new Set<string>();
        existingCards?.rateCards?.forEach(card => {
            if (card.rateCardCategory) categories.add(card.rateCardCategory);
        });
        return Array.from(categories);
    }, [existingCards]);

    const handleSubmit = async (formData: RateCardFormData) => {
        if (!formData.name.trim()) {
            addToast('Please provide a rate card name', 'error');
            return;
        }
        if (!formData.companyId) {
            addToast('Please select a company', 'error');
            return;
        }
        if (!formData.useAdvancedPricing && !formData.isGeneric && (!formData.carrier || !formData.serviceType)) {
            addToast('Please select a courier and service, or choose "Generic Rate Card"', 'error');
            return;
        }
        if (!formData.rateCardCategory) {
            addToast('Please select a rate card category', 'error');
            return;
        }
        if (!formData.basicZoneA) {
            addToast('Please set at least Zone A rate', 'error');
            return;
        }

        const payload = buildRateCardPayload(formData, 'create');
        createRateCard(payload, {
            onSuccess: () => {
                addToast('Rate card created successfully!', 'success');
                router.push('/admin/ratecards');
            },
            onError: (error: any) => {
                addToast(error?.response?.data?.message || 'Failed to create rate card', 'error');
            }
        });
    };

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
                            Create Rate Card
                        </h1>
                        <p className="text-[var(--text-muted)] text-sm mt-1">
                            Define pricing for a courier service
                        </p>
                    </div>
                </div>
            </div>

            <RateCardWizard
                initialData={initialRateCardFormData}
                onSubmit={handleSubmit}
                onSaveDraft={(draftData) => handleSubmit({ ...draftData, status: 'draft' })}
                submitLabel={isPending ? 'Saving...' : 'Create Rate Card'}
                categoryOptions={categoryOptions}
            />
        </div>
    );
}
