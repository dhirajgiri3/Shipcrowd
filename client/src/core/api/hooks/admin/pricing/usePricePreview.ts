
import { useState } from 'react';
import { apiClient } from '@/src/core';
import { useToast } from '@/src/components/ui/feedback/Toast';
import { useQuery } from '@tanstack/react-query';

export interface PricingBreakdown {
    subtotal: number;
    shipping: number;
    codCharge: number;
    tax: {
        cgst: number;
        sgst: number;
        igst: number;
        total: number;
    };
    discount: number;
    total: number;
    metadata: any;
    pricingProvider: string;
}

export interface PricingFormData {
    companyId: string;
    userId: string;
    fromPincode: string;
    toPincode: string;
    weight: string;
    length: string;
    width: string;
    height: string;
    paymentMode: 'prepaid' | 'cod';
    orderValue: string;
    carrier: string;
    serviceType: string;
    strict: boolean;
}

const INITIAL_FORM_STATE: PricingFormData = {
    companyId: '',
    userId: '',
    fromPincode: '110001',
    toPincode: '400001',
    weight: '0.5',
    length: '10',
    width: '10',
    height: '10',
    paymentMode: 'prepaid',
    orderValue: '1000',
    carrier: '',
    serviceType: '',
    strict: false
};

export const usePricePreview = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PricingBreakdown | null>(null);
    const [formData, setFormData] = useState<PricingFormData>(INITIAL_FORM_STATE);

    // Fetch Companies
    const { data: companiesData } = useQuery({
        queryKey: ['companies', 'active'],
        queryFn: async () => {
            const res = await apiClient.get('/companies?status=active');
            return res.data?.data || [];
        }
    });

    const companies = Array.isArray(companiesData) ? companiesData : [];

    const handleCalculate = async () => {
        if (!formData.companyId) {
            addToast('Please select a company', 'error');
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const payload = {
                companyId: formData.companyId,
                fromPincode: formData.fromPincode,
                toPincode: formData.toPincode,
                weight: Number(formData.weight),
                dimensions: {
                    length: Number(formData.length),
                    width: Number(formData.width),
                    height: Number(formData.height)
                },
                paymentMode: formData.paymentMode,
                orderValue: Number(formData.orderValue),
                carrier: formData.carrier || undefined,
                serviceType: formData.serviceType || undefined,
                strict: formData.strict
            };

            const response = await apiClient.post('/price/preview', payload);
            setResult(response.data.data);
            addToast('Price calculated successfully', 'success');
        } catch (error: any) {
            addToast(error?.response?.data?.message || 'Calculation failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const updateFormData = (updates: Partial<PricingFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    return {
        formData,
        updateFormData,
        companies,
        loading,
        result,
        handleCalculate
    };
};
