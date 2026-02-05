import { useState, useEffect } from 'react';
import axios from 'axios';

// Types (should ideally be in a types file)
interface NDRDetails {
    id: string;
    orderNumber: string;
    awb: string;
    reason: string;
    attemptNumber: number;
    detectedAt: string;
    resolutionDeadline: string;
    shippingAddress: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        pincode: string;
        phone: string;
    };
    orderItems: Array<{
        name: string;
        quantity: number;
        image?: string;
    }>;
    totalAmount: number;
    paymentMode: string;
}

interface UseNDRCustomerPortalReturn {
    loading: boolean;
    error: string | null;
    ndrDetails: NDRDetails | null;
    fetchDetails: (token: string) => Promise<void>;
    updateAddress: (token: string, data: { line1: string; line2?: string; landmark?: string; alternatePhone?: string }) => Promise<boolean>;
    rescheduleDelivery: (token: string, date: string) => Promise<boolean>;
    cancelOrder: (token: string, reason: string) => Promise<boolean>;
}

export const useNDRCustomerPortal = (): UseNDRCustomerPortalReturn => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [ndrDetails, setNdrDetails] = useState<NDRDetails | null>(null);

    // Helper to get base URL - assumes same host if not configured
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api/v1';

    const fetchDetails = async (token: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/public/resolve-ndr/${token}`);
            if (response.data.success) {
                setNdrDetails(response.data.data);
            } else {
                setError(response.data.error || 'Failed to load details');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to load details');
        } finally {
            setLoading(false);
        }
    };

    const updateAddress = async (token: string, data: any) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/public/resolve-ndr/${token}/update-address`, data);
            return response.data.success;
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to update address');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const rescheduleDelivery = async (token: string, date: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/public/resolve-ndr/${token}/reschedule`, { date });
            return response.data.success;
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to reschedule');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const cancelOrder = async (token: string, reason: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/public/resolve-ndr/${token}/cancel`, { reason });
            return response.data.success;
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to cancel order');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        ndrDetails,
        fetchDetails,
        updateAddress,
        rescheduleDelivery,
        cancelOrder
    };
};
