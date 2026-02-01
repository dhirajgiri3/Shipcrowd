import { useMutation, useQuery, useQueryClient, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys, FilterParams } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

/**
 * Notification Template Management Hooks
 *
 * Purpose: Manage reusable notification templates for WhatsApp, Email, SMS
 *
 * Features:
 * - Create/Update/Delete templates
 * - List templates with filters
 * - Get templates by ID or code
 * - Render templates with variable substitution
 * - Get default templates by category/channel
 * - Template statistics
 * - Seed default templates (admin only)
 */

export interface NotificationTemplate {
    _id: string;
    companyId?: string; // null = global template
    name: string;
    code: string;
    category: 'ndr' | 'rto' | 'delivery' | 'pickup' | 'cod' | 'general' | 'marketing';
    channel: 'whatsapp' | 'email' | 'sms';
    subject?: string; // For email only
    body: string;
    variables: string[]; // List of available variables (e.g., ['customerName', 'awb', 'orderId'])
    isActive: boolean;
    isDefault: boolean;
    usageCount: number;
    lastUsedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTemplatePayload {
    companyId?: string; // undefined = use current company, null = global (admin only)
    name: string;
    code: string;
    category: 'ndr' | 'rto' | 'delivery' | 'pickup' | 'cod' | 'general' | 'marketing';
    channel: 'whatsapp' | 'email' | 'sms';
    subject?: string;
    body: string;
    isDefault?: boolean;
}

export interface UpdateTemplatePayload {
    name?: string;
    subject?: string;
    body?: string;
    isActive?: boolean;
    isDefault?: boolean;
}

export interface RenderTemplatePayload {
    variables: Record<string, any>;
}

export interface RenderResult {
    subject?: string;
    body: string;
    missingVariables: string[];
}

export interface TemplateListFilters extends FilterParams {
    category?: 'ndr' | 'rto' | 'delivery' | 'pickup' | 'cod' | 'general' | 'marketing';
    channel?: 'whatsapp' | 'email' | 'sms';
    isActive?: boolean;
    includeGlobal?: boolean;
}

export interface TemplateStats {
    category: string;
    channel: string;
    totalTemplates: number;
    activeTemplates: number;
    totalUsage: number;
}

interface PaginatedResult<T> {
    templates: T[];
    total: number;
    page: number;
    pages: number;
}

/**
 * List notification templates with filters
 */
export function useNotificationTemplates(
    filters?: TemplateListFilters,
    options?: UseQueryOptions<PaginatedResult<NotificationTemplate>, ApiError>
) {
    return useQuery<PaginatedResult<NotificationTemplate>, ApiError>({
        queryKey: queryKeys.communication.templates(filters),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: PaginatedResult<NotificationTemplate> }>(
                '/communication/templates',
                { params: filters }
            );
            return data.data;
        },
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Get notification template by ID
 */
export function useNotificationTemplate(
    id: string,
    options?: UseQueryOptions<NotificationTemplate, ApiError>
) {
    return useQuery<NotificationTemplate, ApiError>({
        queryKey: queryKeys.communication.template(id),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: NotificationTemplate }>(
                `/communication/templates/${id}`
            );
            return data.data;
        },
        enabled: !!id,
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Get notification template by code
 */
export function useNotificationTemplateByCode(
    code: string,
    options?: UseQueryOptions<NotificationTemplate | null, ApiError>
) {
    return useQuery<NotificationTemplate | null, ApiError>({
        queryKey: queryKeys.communication.templateByCode(code),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: NotificationTemplate | null }>(
                `/communication/templates/code/${code}`
            );
            return data.data;
        },
        enabled: !!code,
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Get default template for category/channel
 */
export function useDefaultNotificationTemplate(
    category: string,
    channel: string,
    options?: UseQueryOptions<NotificationTemplate | null, ApiError>
) {
    return useQuery<NotificationTemplate | null, ApiError>({
        queryKey: queryKeys.communication.defaultTemplate(category, channel),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: NotificationTemplate | null }>(
                `/communication/templates/default/${category}/${channel}`
            );
            return data.data;
        },
        enabled: !!category && !!channel,
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Get template statistics
 */
export function useTemplateStats(
    options?: UseQueryOptions<TemplateStats[], ApiError>
) {
    return useQuery<TemplateStats[], ApiError>({
        queryKey: queryKeys.communication.templateStats(),
        queryFn: async () => {
            const { data } = await apiClient.get<{ success: boolean; data: TemplateStats[] }>(
                '/communication/templates/stats'
            );
            return data.data;
        },
        ...CACHE_TIMES.LONG,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Create notification template
 */
export function useCreateNotificationTemplate(
    options?: UseMutationOptions<NotificationTemplate, ApiError, CreateTemplatePayload>
) {
    const queryClient = useQueryClient();

    return useMutation<NotificationTemplate, ApiError, CreateTemplatePayload>({
        mutationFn: async (payload) => {
            const { data } = await apiClient.post<{ success: boolean; data: NotificationTemplate }>(
                '/communication/templates',
                payload
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.all() });
            showSuccessToast('Notification template created successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Update notification template
 */
export function useUpdateNotificationTemplate(
    options?: UseMutationOptions<NotificationTemplate, ApiError, { id: string; data: UpdateTemplatePayload }>
) {
    const queryClient = useQueryClient();

    return useMutation<NotificationTemplate, ApiError, { id: string; data: UpdateTemplatePayload }>({
        mutationFn: async ({ id, data }) => {
            const response = await apiClient.patch<{ success: boolean; data: NotificationTemplate }>(
                `/communication/templates/${id}`,
                data
            );
            return response.data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.templates() });
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.template(variables.id) });
            showSuccessToast('Template updated successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Delete notification template
 */
export function useDeleteNotificationTemplate(
    options?: UseMutationOptions<void, ApiError, string>
) {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (id) => {
            await apiClient.delete(`/communication/templates/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.templates() });
            showSuccessToast('Template deleted successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Render template with variables
 */
export function useRenderTemplate(
    options?: UseMutationOptions<RenderResult, ApiError, { id: string; variables: Record<string, any> }>
) {
    return useMutation<RenderResult, ApiError, { id: string; variables: Record<string, any> }>({
        mutationFn: async ({ id, variables }) => {
            const { data } = await apiClient.post<{ success: boolean; data: RenderResult }>(
                `/communication/templates/${id}/render`,
                { variables }
            );
            return data.data;
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Render template by code with variables
 */
export function useRenderTemplateByCode(
    options?: UseMutationOptions<RenderResult, ApiError, { code: string; variables: Record<string, any> }>
) {
    return useMutation<RenderResult, ApiError, { code: string; variables: Record<string, any> }>({
        mutationFn: async ({ code, variables }) => {
            const { data } = await apiClient.post<{ success: boolean; data: RenderResult }>(
                '/communication/templates/render-by-code',
                { code, variables }
            );
            return data.data;
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}

/**
 * Seed default templates (admin only)
 */
export function useSeedDefaultTemplates(
    options?: UseMutationOptions<void, ApiError, void>
) {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, void>({
        mutationFn: async () => {
            await apiClient.post('/communication/templates/seed-defaults');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.all() });
            showSuccessToast('Default templates seeded successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
}
