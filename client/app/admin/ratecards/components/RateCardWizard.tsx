"use client";

import { useMemo } from 'react';
import { useMultiStepForm } from '@/src/hooks/forms/useMultiStepForm';
import { Button } from '@/src/components/ui/core/Button';
import { Step1BasicInfo } from '../create/steps/Step1BasicInfo';
import { Step2ZonePricing } from '../create/steps/Step2ZonePricing';
import { Step3WeightRules } from '../create/steps/Step3WeightRules';
import { Step4Overhead } from '../create/steps/Step4Overhead';
import { Step5Review } from '../create/steps/Step5Review';
import { RateCardFormData, calculateMultipliers } from './ratecardWizard.utils';

interface RateCardWizardProps {
    initialData: RateCardFormData;
    onSubmit: (data: RateCardFormData) => Promise<void> | void;
    onSaveDraft?: (data: RateCardFormData) => Promise<void> | void;
    submitLabel?: string;
}

export function RateCardWizard({ initialData, onSubmit, onSaveDraft, submitLabel = 'Save Rate Card' }: RateCardWizardProps) {
    const steps = useMemo(() => ([
        { id: 'basic', title: 'Basic', fields: ['courierProviderId', 'courierServiceId', 'rateCardCategory'] },
        { id: 'zones', title: 'Zones', fields: ['basicWeight', 'basicZoneA'] },
        { id: 'weights', title: 'Weight', fields: ['additionalWeight', 'additionalZoneA'] },
        { id: 'overhead', title: 'Overhead', fields: ['codPercentage', 'codMinimumCharge'] },
        { id: 'review', title: 'Review' },
    ] as const), []);

    const {
        currentStep,
        totalSteps,
        formData,
        nextStep,
        prevStep,
        setFieldValue,
        isLastStep,
        isSubmitting,
        canProceed,
        complete,
    } = useMultiStepForm<RateCardFormData>({
        steps: steps.map((step, index) => ({
            id: step.id,
            title: step.title,
            fields: step.fields as any,
            validate: () => true,
            description: '',
        })),
        initialData,
        onComplete: async (data) => {
            await onSubmit(data);
        },
    });

    const multipliers = calculateMultipliers(formData);
    const stepCanProceed = (() => {
        if (currentStep === 0) {
            if (formData.isGeneric) {
                return formData.rateCardCategory.trim().length > 0;
            }
            return (
                formData.courierProviderId.trim().length > 0 &&
                formData.courierServiceId.trim().length > 0 &&
                formData.rateCardCategory.trim().length > 0
            );
        }
        return canProceed;
    })();

    const handleChange = (field: keyof RateCardFormData, value: string | boolean) => {
        setFieldValue(field, value as any);
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return <Step1BasicInfo formData={formData} onChange={handleChange} />;
            case 1:
                return <Step2ZonePricing formData={formData} onChange={handleChange} multipliers={multipliers} />;
            case 2:
                return <Step3WeightRules formData={formData} onChange={handleChange} multipliers={multipliers} />;
            case 3:
                return <Step4Overhead formData={formData} onChange={handleChange} />;
            case 4:
                return <Step5Review formData={formData} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${index <= currentStep ? 'bg-[var(--primary-blue)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                            {index + 1}
                        </div>
                        <span className={`text-sm ${index <= currentStep ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                            {step.title}
                        </span>
                        {index < steps.length - 1 && <div className="w-6 h-px bg-[var(--border-default)]" />}
                    </div>
                ))}
            </div>

            <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-6">
                {renderStep()}
            </div>

            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={prevStep} disabled={currentStep === 0}>
                    Previous
                </Button>
                <div className="flex items-center gap-2">
                    {isLastStep && onSaveDraft && (
                        <Button variant="outline" onClick={() => onSaveDraft({ ...formData, status: 'draft' })}>
                            Save as Draft
                        </Button>
                    )}
                    <Button
                        onClick={isLastStep ? complete : nextStep}
                        disabled={!stepCanProceed || isSubmitting}
                    >
                        {isLastStep ? submitLabel : 'Next'}
                    </Button>
                </div>
            </div>

            <div className="text-xs text-[var(--text-muted)]">
                Step {currentStep + 1} of {totalSteps}
            </div>
        </div>
    );
}
