"use client";
export const dynamic = "force-dynamic";

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/src/components/ui/core/Button';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useAdminRateCard, useUpdateAdminRateCard } from '@/src/core/api/hooks/admin/useAdminRateCards';
import { RateCardWizard } from '../../../components/RateCardWizard';
import {
    RateCardFormData,
    buildRateCardPayload,
    initialRateCardFormData,
    mapAdminRateCardToFormState
} from '../../../components/ratecardWizard.utils';

interface EditRatecardClientProps {
    rateCardId: string;
}

export function EditRatecardClient({ rateCardId }: EditRatecardClientProps) {
    const { addToast } = useToast();
    const router = useRouter();
    const { data: rateCard, isLoading } = useAdminRateCard(rateCardId);
    const { mutate: updateRateCard, isPending } = useUpdateAdminRateCard();

    const editState = useMemo(() => {
        if (!rateCard) {
            return {
                formData: initialRateCardFormData,
                warnings: [],
                isReadOnly: false,
            };
        }
        return mapAdminRateCardToFormState(rateCard);
    }, [rateCard]);

    const { formData: initialData, warnings, isReadOnly } = editState;

    const handleSubmit = async (formData: RateCardFormData) => {
        if (isReadOnly) {
            addToast('This rate card is read-only in the editor. Please edit it from the advanced tools.', 'info');
            return;
        }

        if (!formData.name.trim()) {
            addToast('Please provide a rate card name', 'error');
            return;
        }

        if (!formData.isGeneric && (!formData.carrier || !formData.serviceType)) {
            addToast('Please select a courier and service', 'error');
            return;
        }

        const payload = buildRateCardPayload(formData, 'update');

        updateRateCard({ id: rateCardId, data: payload }, {
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

            {warnings.length > 0 && (
                <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4">
                    <div className="flex items-start gap-2 text-[var(--warning)]">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <div className="space-y-1 text-sm">
                            {warnings.map((warning, idx) => (
                                <div key={idx}>{warning}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <RateCardWizard
                key={rateCard?._id || 'loading'}
                initialData={initialData}
                onSubmit={handleSubmit}
                onSaveDraft={(draftData) => handleSubmit({ ...draftData, status: 'draft' })}
                submitLabel={isPending ? 'Updating...' : 'Update Rate Card'}
                isReadOnly={isReadOnly}
                categoryOptions={rateCard.rateCardCategory ? [rateCard.rateCardCategory] : []}
            />
        </div>
    );
}
