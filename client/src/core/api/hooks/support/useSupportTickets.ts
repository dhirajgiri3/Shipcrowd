import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import {
    SupportTicket,
    SupportTicketFilters,
    CreateTicketPayload,
    UpdateTicketPayload,
    AddNotePayload,
    SupportMetrics
} from '@/src/types/domain/support';
import { showSuccessToast, handleApiError } from '@/src/lib/error';

const SUPPORT_KEYS = {
    all: ['support'] as const,
    tickets: (filters?: SupportTicketFilters) => ['support', 'tickets', filters] as const,
    ticket: (id: string) => ['support', 'ticket', id] as const,
    metrics: ['support', 'metrics'] as const,
};

// --- Queries ---

export const useSupportTickets = (filters: SupportTicketFilters = {}, options?: Omit<UseQueryOptions<any, ApiError>, 'queryKey'>) => {
    return useQuery({
        queryKey: SUPPORT_KEYS.tickets(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.page) params.append('page', String(filters.page));
            if (filters.limit) params.append('limit', String(filters.limit));
            if (filters.status && filters.status !== 'all') params.append('status', filters.status);
            if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
            if (filters.category && filters.category !== 'all') params.append('category', filters.category);
            if (filters.search) params.append('search', filters.search);

            const { data } = await apiClient.get(`/support/tickets?${params.toString()}`);
            return data.data; // { tickets: [], pagination: {} }
        },
        ...options
    });
};

export const useSupportTicketDetail = (id: string | null, options?: Omit<UseQueryOptions<SupportTicket, ApiError>, 'queryKey'>) => {
    return useQuery({
        queryKey: SUPPORT_KEYS.ticket(id || ''),
        queryFn: async () => {
            if (!id) throw new Error("Ticket ID required");
            const { data } = await apiClient.get(`/support/tickets/${id}`);
            return data.data;
        },
        enabled: !!id,
        ...options
    });
};

export const useSupportMetrics = (options?: Omit<UseQueryOptions<SupportMetrics, ApiError>, 'queryKey'>) => {
    return useQuery({
        queryKey: SUPPORT_KEYS.metrics,
        queryFn: async () => {
            const { data } = await apiClient.get('/support/metrics');
            return data.data;
        },
        ...options
    });
};

// --- Mutations ---

export const useCreateTicket = (options?: UseMutationOptions<SupportTicket, ApiError, CreateTicketPayload>) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post('/support/tickets', payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.tickets({}) });
            queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.metrics });
            showSuccessToast('Support ticket created successfully');
        },
        onError: (error) => handleApiError(error, 'Failed to create ticket'),
        ...options
    });
};

export const useUpdateTicket = (id: string, options?: UseMutationOptions<SupportTicket, ApiError, UpdateTicketPayload>) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { data } = await apiClient.put(`/support/tickets/${id}`, payload);
            return data.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.tickets({}) });
            queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.ticket(id) });
            queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.metrics });
            showSuccessToast('Ticket updated successfully');
        },
        onError: (error) => handleApiError(error, 'Failed to update ticket'),
        ...options
    });
};

export const useAddTicketNote = (id: string, options?: UseMutationOptions<any, ApiError, AddNotePayload>) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post(`/support/tickets/${id}/notes`, payload);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SUPPORT_KEYS.ticket(id) });
            showSuccessToast('Note added successfully');
        },
        onError: (error) => handleApiError(error, 'Failed to add note'),
        ...options
    });
};
