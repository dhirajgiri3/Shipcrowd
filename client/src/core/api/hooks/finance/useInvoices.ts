import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys, FilterParams } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// Types
export interface Invoice {
    _id: string;
    invoiceNumber: string;
    type: 'tax_invoice' | 'credit_note';
    customer: {
        name: string;
        gstin?: string;
    };
    amount: {
        subtotal: number;
        tax: number;
        total: number;
    };
    status: 'draft' | 'issued' | 'paid' | 'cancelled';
    date: string;
    dueDate?: string;
    irn?: string;
}

export interface CreateInvoicePayload {
    customerId: string;
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>;
    type: 'tax_invoice' | 'credit_note';
}

export interface InvoiceListResponse {
    invoices: Invoice[];
    pagination?: {
        total: number;
        pages: number;
        current: number;
    };
}

// Hooks

/**
 * List invoices
 */
export function useInvoices(
    filters?: FilterParams & { status?: string; type?: string; customerId?: string },
    options?: UseQueryOptions<InvoiceListResponse, ApiError>
) {
    return useQuery<InvoiceListResponse, ApiError>({
        queryKey: ['finance', 'invoices', filters], // TODO: Add to queryKeys
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: InvoiceListResponse }>(
                '/billing/invoices',
                { params: filters }
            );
            return data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Get single invoice
 */
export function useInvoice(
    id: string,
    options?: UseQueryOptions<Invoice, ApiError>
) {
    return useQuery<Invoice, ApiError>({
        queryKey: ['finance', 'invoice', id],
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: Invoice }>(
                `/billing/invoices/${id}`
            );
            return data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Create invoice
 */
export function useCreateInvoice(
    options?: UseMutationOptions<Invoice, ApiError, CreateInvoicePayload>
) {
    const queryClient = useQueryClient();

    return useMutation<Invoice, ApiError, CreateInvoicePayload>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ success: boolean; data: Invoice }>(
                '/billing/invoices',
                payload
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] });
            showSuccessToast('Invoice created successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Download invoice
 */
export function useDownloadInvoice(
    options?: UseMutationOptions<Blob, ApiError, string>
) {
    return useMutation<Blob, ApiError, string>({
        mutationFn: async (id) => {
            const response = await apiClient.get(`/billing/invoices/${id}/download`, {
                responseType: 'blob'
            });
            return response.data;
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
}

/**
 * Send invoice
 */
export function useSendInvoice(
    options?: UseMutationOptions<void, ApiError, { id: string; email?: string }>
) {
    return useMutation<void, ApiError, { id: string; email?: string }>({
        mutationFn: async ({ id, email }) => {
            await apiClient.post(`/billing/invoices/${id}/send`, { email });
        },
        onSuccess: () => {
            showSuccessToast('Invoice sent successfully');
        },
        onError: (error) => handleApiError(error),
        ...options,
    });
}
