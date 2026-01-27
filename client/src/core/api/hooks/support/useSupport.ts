import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys, FilterParams } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// Types
export interface SupportTicket {
    _id: string;
    ticketId: string;
    subject: string;
    category: 'technical' | 'billing' | 'logistics' | 'other';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    description: string;
    attachments: string[];
    createdAt: string;
    updatedAt: string;
    lastReplyAt?: string;
}

export interface CreateTicketPayload {
    subject: string;
    category: string;
    priority: string;
    description: string;
    attachments?: string[];
}

export interface TicketResponse {
    tickets: SupportTicket[];
    pagination?: {
        total: number;
        pages: number;
        current: number;
    };
}

// Hooks
export function useSupportTickets(
    filters?: FilterParams & { status?: string; category?: string },
    options?: UseQueryOptions<TicketResponse, ApiError>
) {
    return useQuery<TicketResponse, ApiError>({
        queryKey: ['support', 'tickets', filters], // TODO: Add to queryKeys factory if not present
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: TicketResponse }>(
                '/support/tickets',
                { params: filters }
            );
            return data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useSupportTicket(
    id: string,
    options?: UseQueryOptions<SupportTicket, ApiError>
) {
    return useQuery<SupportTicket, ApiError>({
        queryKey: ['support', 'ticket', id],
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: SupportTicket }>(
                `/support/tickets/${id}`
            );
            return data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

export function useCreateSupportTicket(
    options?: UseMutationOptions<SupportTicket, ApiError, CreateTicketPayload>
) {
    const queryClient = useQueryClient();

    return useMutation<SupportTicket, ApiError, CreateTicketPayload>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ success: boolean; data: SupportTicket }>(
                '/support/tickets',
                payload
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
            showSuccessToast('Support ticket created successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}
