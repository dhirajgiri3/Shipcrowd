import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../../http';
import {
    SupportTicket,
    SupportTicketFilters,
    UpdateTicketPayload,
    AddNotePayload,
    SupportMetrics
} from '@/src/types/domain/support';
import { showSuccessToast, handleApiError } from '@/src/lib/error';

const ADMIN_SUPPORT_KEYS = {
    tickets: (filters?: SupportTicketFilters) => ['admin', 'support', 'tickets', filters] as const,
    ticket: (id: string) => ['admin', 'support', 'ticket', id] as const,
    metrics: ['admin', 'support', 'metrics'] as const,
};

export const useAdminSupportTickets = (
    filters: SupportTicketFilters = {},
    options?: Omit<UseQueryOptions<any, ApiError>, 'queryKey'>
) => {
    return useQuery({
        queryKey: ADMIN_SUPPORT_KEYS.tickets(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.page) params.append('page', String(filters.page));
            if (filters.limit) params.append('limit', String(filters.limit));
            if (filters.status && filters.status !== 'all') params.append('status', filters.status);
            if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
            if (filters.category && filters.category !== 'all') params.append('category', filters.category);
            if (filters.search) params.append('search', filters.search);

            const { data } = await apiClient.get(`/admin/support/tickets?${params.toString()}`);
            return data.data;
        },
        ...options
    });
};

export const useAdminSupportTicketDetail = (
    id: string | null,
    options?: Omit<UseQueryOptions<SupportTicket, ApiError>, 'queryKey'>
) => {
    return useQuery({
        queryKey: ADMIN_SUPPORT_KEYS.ticket(id || ''),
        queryFn: async () => {
            if (!id) throw new Error('Ticket ID required');
            const { data } = await apiClient.get(`/admin/support/tickets/${id}`);
            return data.data;
        },
        enabled: !!id,
        ...options
    });
};

export const useAdminSupportMetrics = (
    options?: Omit<UseQueryOptions<SupportMetrics, ApiError>, 'queryKey'>
) => {
    return useQuery({
        queryKey: ADMIN_SUPPORT_KEYS.metrics,
        queryFn: async () => {
            const { data } = await apiClient.get('/admin/support/metrics');
            return data.data;
        },
        ...options
    });
};

export const useAdminUpdateTicket = (
    id: string,
    options?: UseMutationOptions<SupportTicket, ApiError, UpdateTicketPayload>
) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { data } = await apiClient.put(`/admin/support/tickets/${id}`, payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
            showSuccessToast('Ticket updated successfully');
        },
        onError: (error) => handleApiError(error, 'Failed to update ticket'),
        ...options
    });
};

export const useAdminAddTicketNote = (
    id: string,
    options?: UseMutationOptions<any, ApiError, AddNotePayload>
) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post(`/admin/support/tickets/${id}/notes`, payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_SUPPORT_KEYS.ticket(id) });
            showSuccessToast('Note added successfully');
        },
        onError: (error) => handleApiError(error, 'Failed to add note'),
        ...options
    });
};
