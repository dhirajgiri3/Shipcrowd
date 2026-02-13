/**
 * Communication API Hooks
 * 
 * React Query hooks for SMS/Email templates and notification rules.
 * Backend: GET/POST /api/v1/communication/*
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/src/core/api/http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

// ==================== Import Types ====================
import type {
    CommunicationTemplate,
    NotificationRule,
    TemplateListFilters,
    CreateTemplatePayload,
    UpdateTemplatePayload,
    RuleListFilters,
    CreateRulePayload,
    UpdateRulePayload,
    TestTemplatePayload,
    RenderedTemplate,
} from '@/src/types/api/communication';

// ==================== Template Query Hooks ====================

/**
 * Get list of communication templates with filters
 */
export const useTemplates = (
    filters?: TemplateListFilters,
    options?: Omit<UseQueryOptions<CommunicationTemplate[]>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<CommunicationTemplate[]>({
        queryKey: queryKeys.communication.templates(filters),
        queryFn: async () => {
            const response = await apiClient.get('/communication/templates', { params: filters });
            return response.data.data.templates;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get single template by ID
 */
export const useTemplate = (
    templateId: string,
    options?: Omit<UseQueryOptions<CommunicationTemplate>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<CommunicationTemplate>({
        queryKey: queryKeys.communication.template(templateId),
        queryFn: async () => {
            const response = await apiClient.get(`/communication/templates/${templateId}`);
            return response.data.data;
        },
        enabled: !!templateId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

// ==================== Template Mutation Hooks ====================

/**
 * Create a new communication template
 */
export const useCreateTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation<CommunicationTemplate, Error, CreateTemplatePayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/communication/templates', payload);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.templates() });
            showSuccessToast('Template created successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Create Template');
        },
    });
};

/**
 * Update an existing template
 */
export const useUpdateTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation<CommunicationTemplate, Error, UpdateTemplatePayload>({
        mutationFn: async ({ templateId, ...payload }) => {
            const response = await apiClient.put(`/communication/templates/${templateId}`, payload);
            return response.data.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.template(data.templateId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.templates() });
            showSuccessToast('Template updated successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Update Template');
        },
    });
};

/**
 * Delete a template
 */
export const useDeleteTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (templateId) => {
            await apiClient.delete(`/communication/templates/${templateId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.templates() });
            showSuccessToast('Template deleted successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Delete Template');
        },
    });
};

/**
 * Test a template with sample data
 */
export const useTestTemplate = () => {
    return useMutation<RenderedTemplate, Error, TestTemplatePayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/communication/templates/test', payload);
            return response.data.data;
        },
        onSuccess: () => {
            showSuccessToast('Test message sent successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Send Test Message');
        },
    });
};

// ==================== Notification Rules Query Hooks ====================

/**
 * Get list of notification rules with filters
 */
export const useRules = (
    filters?: RuleListFilters,
    options?: Omit<UseQueryOptions<NotificationRule[]>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<NotificationRule[]>({
        queryKey: queryKeys.communication.rules_list(filters),
        queryFn: async () => {
            const response = await apiClient.get('/communication/rules', { params: filters });
            return response.data.data;
        },
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get single rule by ID
 */
export const useRule = (
    ruleId: string,
    options?: Omit<UseQueryOptions<NotificationRule>, 'queryKey' | 'queryFn'>
) => {
    return useQuery<NotificationRule>({
        queryKey: queryKeys.communication.rule(ruleId),
        queryFn: async () => {
            const response = await apiClient.get(`/communication/rules/${ruleId}`);
            return response.data.data;
        },
        enabled: !!ruleId,
        ...CACHE_TIMES.MEDIUM,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

// ==================== Notification Rules Mutation Hooks ====================

/**
 * Create a new notification rule
 */
export const useCreateRule = () => {
    const queryClient = useQueryClient();

    return useMutation<NotificationRule, Error, CreateRulePayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/communication/rules', payload);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.rules() });
            showSuccessToast('Notification rule created successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Create Rule');
        },
    });
};

/**
 * Update an existing notification rule
 */
export const useUpdateRule = () => {
    const queryClient = useQueryClient();

    return useMutation<NotificationRule, Error, UpdateRulePayload>({
        mutationFn: async ({ ruleId, ...payload }) => {
            const response = await apiClient.put(`/communication/rules/${ruleId}`, payload);
            return response.data.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.rule(data.ruleId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.rules() });
            showSuccessToast('Rule updated successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Update Rule');
        },
    });
};

/**
 * Toggle rule active status
 */
export const useToggleRule = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { ruleId: string; isActive: boolean }>({
        mutationFn: async ({ ruleId, isActive }) => {
            await apiClient.patch(`/communication/rules/${ruleId}/toggle`, { isActive });
        },
        onSuccess: (_, { ruleId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.rule(ruleId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.rules() });
            showSuccessToast('Rule status updated');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Update Rule Status');
        },
    });
};

/**
 * Delete a notification rule
 */
export const useDeleteRule = () => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (ruleId) => {
            await apiClient.delete(`/communication/rules/${ruleId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.communication.rules() });
            showSuccessToast('Rule deleted successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Delete Rule');
        },
    });
};

/**
 * Test a notification rule
 */
export const useTestRule = () => {
    return useMutation<void, Error, { ruleId: string; testData?: Record<string, any> }>({
        mutationFn: async ({ ruleId, testData }) => {
            await apiClient.post(`/communication/rules/${ruleId}/test`, { testData });
        },
        onSuccess: () => {
            showSuccessToast('Test rule executed successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Failed to Test Rule');
        },
    });
};
