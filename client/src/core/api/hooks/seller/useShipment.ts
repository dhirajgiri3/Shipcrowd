/**
 * Shipment Hooks
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { shipmentApi } from '../../clients/shipping/shipmentApi';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../http';

/**
 * Get shipment details by AWB
 */
export const useShipmentByAwb = (awb?: string) => {
    return useQuery({
        queryKey: queryKeys.shipments.tracking(awb || ''), // Using tracking key as it fits best, or create new one
        queryFn: async () => {
            if (!awb) throw new Error("AWB is required");
            return await shipmentApi.getShipmentByAwb(awb);
        },
        enabled: !!awb && awb.length > 5, // Only run if AWB is seemingly valid
        ...CACHE_TIMES.SHORT, // Short cache as status might change
        retry: false, // Don't retry on user input errors
    });
};

/**
 * Generate Label Mutation
 */
export const useGenerateLabel = () => {
    return useMutation({
        mutationFn: async (awb: string) => await shipmentApi.generateLabel(awb),
        onSuccess: () => {
            showSuccessToast('Label generated successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to generate label');
        },
    });
};
