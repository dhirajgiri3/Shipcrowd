import { apiClient, ApiError } from '../../config/client';
import { handleApiError } from '@/src/lib/error';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
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
        queryKey: ['companies', filters],
        queryFn: async () => {
            const response = await apiClient.get('/companies', { params: filters });
            return response.data;
        },
        staleTime: 30000,
        ...options,
    });
};

/**
 * Get company statistics
 */
export const useCompanyStats = (companyId: string, options?: UseQueryOptions<any, ApiError>) => {
    return useQuery<any, ApiError>({
        queryKey: ['company-stats', companyId],
        queryFn: async () => {
            // You can extend this to fetch orders/shipments count for the company
            const response = await apiClient.get(`/companies/${companyId}`);
            return response.data.company;
        },
        enabled: !!companyId,
        staleTime: 30000,
        ...options,
    });
};
