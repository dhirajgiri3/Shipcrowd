import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys, FilterParams } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import { SupportTicket, CreateTicketPayload } from '@/src/types/domain/support';

// Types
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
    options?: Omit<UseQueryOptions<TicketResponse, ApiError>, 'queryKey' | 'queryFn'>
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
    options?: Omit<UseQueryOptions<SupportTicket, ApiError>, 'queryKey' | 'queryFn'>
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

export async function uploadSupportAttachments(files: File[]): Promise<string[]> {
    if (!files.length) return [];
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const { data } = await apiClient.post<{ success: boolean; data: { urls: string[] } }>(
        '/support/upload',
        formData
    );
    return (data as { data?: { urls?: string[] } })?.data?.urls ?? [];
}

export function useAddSupportTicketNote(
    ticketId: string,
    options?: UseMutationOptions<SupportTicket, ApiError, { message: string; type: 'reply' }>
) {
    const queryClient = useQueryClient();

    return useMutation<SupportTicket, ApiError, { message: string; type: 'reply' }>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ success: boolean; data: SupportTicket }>(
                `/support/tickets/${ticketId}/notes`,
                payload
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support', 'ticket', ticketId] });
            queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
            showSuccessToast('Reply sent successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}
