/**
 * Rate Card Management Hooks
 * Hooks for managing rate card assignments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rateCardManagementApi, AssignRateCardData } from '../../clients/shipping/rateCardManagementApi';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { ApiError } from '../../http';

/**
 * Hook to fetch rate card assignments
 */
export const useRateCardAssignments = () => {
    return useQuery({
        queryKey: ['admin', 'ratecards', 'assignments'],
        queryFn: () => rateCardManagementApi.getAssignments(),
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to assign rate card to seller
 */
export const useAssignRateCard = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: AssignRateCardData) => rateCardManagementApi.assign(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'ratecards'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.sellers.all() });
            showSuccessToast('Rate card assigned successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to assign rate card');
        },
    });
};

/**
 * Hook to unassign rate card
 */
export const useUnassignRateCard = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (assignmentId: string) => rateCardManagementApi.unassign(assignmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'ratecards'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.sellers.all() });
            showSuccessToast('Rate card unassigned successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to unassign rate card');
        },
    });
};

/**
 * Hook to fetch available couriers
 */
export const useAvailableCouriers = () => {
    return useQuery({
        queryKey: ['admin', 'ratecards', 'couriers'],
        queryFn: () => rateCardManagementApi.getAvailableCouriers(),
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
    });
};

/**
 * Hook to bulk assign rate cards
 */
export const useBulkAssignRateCards = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (assignments: AssignRateCardData[]) =>
            rateCardManagementApi.bulkAssign(assignments),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'ratecards'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.sellers.all() });
            showSuccessToast('Rate cards assigned successfully');
        },
        onError: (error: ApiError) => {
            handleApiError(error, 'Failed to bulk assign rate cards');
        },
    });
};
