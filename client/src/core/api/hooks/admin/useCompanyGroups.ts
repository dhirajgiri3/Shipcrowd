import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';

export interface CompanyGroup {
    _id: string;
    name: string;
    description?: string;
    companyIds: Array<{ _id: string; name: string } | string>;
    createdAt: string;
    updatedAt: string;
}

export const useCompanyGroups = (
    params?: { search?: string; page?: number; limit?: number },
    options?: Partial<UseQueryOptions<{ groups: CompanyGroup[]; pagination: any }, ApiError>>
) => {
    return useQuery<{ groups: CompanyGroup[]; pagination: any }, ApiError>({
        queryKey: ['admin', 'company-groups', params],
        queryFn: async () => {
            const query = new URLSearchParams();
            if (params?.search) query.append('search', params.search);
            if (params?.page) query.append('page', params.page.toString());
            if (params?.limit) query.append('limit', params.limit.toString());

            const response = await apiClient.get(`/admin/company-groups?${query.toString()}`);
            return {
                groups: response.data.data || [],
                pagination: response.data.pagination || {},
            };
        },
        ...options,
    });
};

export const useCreateCompanyGroup = (
    options?: UseMutationOptions<CompanyGroup, ApiError, { name: string; description?: string; companyIds: string[] }>
) => {
    const queryClient = useQueryClient();
    return useMutation<CompanyGroup, ApiError, { name: string; description?: string; companyIds: string[] }>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/admin/company-groups', payload);
            return response.data.data.group;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'company-groups'] });
        },
        ...options,
    });
};
