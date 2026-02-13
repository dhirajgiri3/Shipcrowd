"use client";

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { useSmartRateCalculator } from '@/src/core/api/hooks/logistics/useSmartRateCalculator';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { SmartRateInput, CourierRateOption, ratesApi } from '@/src/core/api/clients/shipping/ratesApi';
import { RateInputForm } from './RateInputForm';
import { RateResults } from './RateResults';

export function RatesClient() {
    const { addToast } = useToast();
    const calculateSmartRates = useSmartRateCalculator();

    const [formData, setFormData] = useState<SmartRateInput>({
        originPincode: '560001',
        destinationPincode: '110001',
        weight: 0.5,
        paymentMode: 'prepaid',
        orderValue: 1000,
        dimensions: {
            length: 10,
            width: 10,
            height: 10,
        },
    });

    const [customWeights, setCustomWeights] = useState({
        price: 40,
        speed: 30,
        reliability: 15,
        performance: 15,
    });

    const [results, setResults] = useState<CourierRateOption[] | null>(null);
    const [recommendation, setRecommendation] = useState<string | null>(null);
    const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);

    const handleCalculate = async () => {
        // Validation
        if (!formData.originPincode || formData.originPincode.length !== 6) {
            addToast('Please enter a valid 6-digit origin pincode', 'error');
            return;
        }
        if (!formData.destinationPincode || formData.destinationPincode.length !== 6) {
            addToast('Please enter a valid 6-digit destination pincode', 'error');
            return;
        }
        if (formData.weight <= 0) {
            addToast('Weight must be greater than 0', 'error');
            return;
        }

        // Serviceability check
        try {
            const [originCheck, destCheck] = await Promise.all([
                ratesApi.checkServiceability(formData.originPincode),
                ratesApi.checkServiceability(formData.destinationPincode),
            ]);

            if (!originCheck.serviceable) {
                addToast(`Origin pincode ${formData.originPincode} is not serviceable`, 'error');
                return;
            }
            if (!destCheck.serviceable) {
                addToast(`Destination pincode ${formData.destinationPincode} is not serviceable`, 'error');
                return;
            }
        } catch (error) {
            // Non-blocking: proceed with rate calculation even if serviceability check fails
            console.warn('Serviceability check failed, proceeding with rate calculation:', error);
        }

        try {
            const response = await calculateSmartRates.mutateAsync({
                ...formData,
                scoringWeights: customWeights,
            });

            setResults(response.rates);
            setRecommendation(response.recommendation);
            addToast(`Found ${response.totalOptions} courier options`, 'success');
        } catch (error) {
            console.error('Smart rate calculation failed:', error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 rounded-xl bg-[var(--primary-blue-soft)] flex items-center justify-center border border-[var(--primary-blue-light)]/20 shadow-sm">
                    <Calculator className="h-6 w-6 text-[var(--primary-blue)]" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Smart Rate Calculator</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Compare shipping rates with AI-powered recommendations
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Input Form (Sticky) */}
                <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-6 space-y-4">
                    <RateInputForm
                        formData={formData}
                        setFormData={setFormData}
                        onCalculate={handleCalculate}
                        isPending={calculateSmartRates.isPending}
                        customWeights={customWeights}
                        setCustomWeights={setCustomWeights}
                    />
                </div>

                {/* Right Column: Results */}
                <div className="lg:col-span-8 xl:col-span-8">
                    <RateResults
                        results={results}
                        recommendation={recommendation}
                        expandedBreakdown={expandedBreakdown}
                        setExpandedBreakdown={setExpandedBreakdown}
                    />
                </div>
            </div>
        </div>
    );
}
