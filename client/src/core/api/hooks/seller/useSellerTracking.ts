import { useQuery } from '@tanstack/react-query';
import { trackingApi, NormalizedTrackingData } from '../../clients/trackingApi';
import { queryKeys } from '../../config/query-keys';

export const useSellerTracking = () => {

    // Hook for ad-hoc tracking search
    const useTrackShipment = (awb: string, enabled: boolean = false) => {
        return useQuery({
            queryKey: queryKeys.tracking.byAwb(awb),
            queryFn: () => trackingApi.getTrackingInfo(awb),
            enabled: enabled && !!awb,
            retry: false, // Don't retry if AWB is invalid
            staleTime: 1000 * 60 * 5, // 5 minutes
        });
    };

    return {
        useTrackShipment,
    };
};
