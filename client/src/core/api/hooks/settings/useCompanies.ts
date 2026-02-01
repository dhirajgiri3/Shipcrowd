import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError } from '@/src/lib/error';
import { Company } from './useProfile';

export interface CompaniesResponse {
    companies: Company[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface CompaniesFilters {
    search?: string;
    page?: number;
    limit?: number;
}

/**
 * Get all companies (Admin only)
 */
export const useCompanies = (
    filters: CompaniesFilters = {},
    options?: UseQueryOptions<CompaniesResponse, ApiError>
) => {
    return useQuery<CompaniesResponse, ApiError>({
        queryKey: queryKeys.settings.companies(filters),
        queryFn: async () => {
            const response = await apiClient.get('/companies', { params: filters });
            return response.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};

/**
 * Get company statistics
 */
export const useCompanyStats = (companyId: string, options?: UseQueryOptions<any, ApiError>) => {
    return useQuery<any, ApiError>({
        queryKey: queryKeys.settings.companyStats(companyId),
        queryFn: async () => {
            // You can extend this to fetch orders/shipments count for the company
            const response = await apiClient.get(`/companies/${companyId}`);
            return response.data.company;
        },
        enabled: !!companyId,
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
