import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../http';
import { queryKeys } from '../../config/query-keys';
import { CACHE_TIMES, RETRY_CONFIG } from '../../config/cache.config';
import { handleApiError, showSuccessToast } from '@/src/lib/error';

/**
 * System Health Hooks
 * Frontend hooks for monitoring system health
 */

export interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    details?: any;
    timestamp: Date;
    responseTime?: number;
}

export interface SystemMetrics {
    uptime: number;
    memory: {
        total: number;
        free: number;
        used: number;
        usagePercent: number;
    };
    cpu: {
        cores: number;
        loadAverage: number[];
        usagePercent: number;
    };
    process: {
        pid: number;
        uptime: number;
        memoryUsage: {
            rss: number;
            heapTotal: number;
            heapUsed: number;
            external: number;
        };
        cpuUsage: {
            user: number;
            system: number;
        };
    };
}

export interface DatabaseHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    connected: boolean;
    responseTime?: number;
    connections?: {
        current: number;
        available: number;
    };
    replicationStatus?: string;
    lastError?: string;
}

export interface ExternalServiceHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    lastChecked: Date;
    endpoint?: string;
    error?: string;
}

export interface ComprehensiveHealthReport {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    systemMetrics: SystemMetrics;
    database: DatabaseHealth;
    externalServices: ExternalServiceHealth[];
    apiMetrics: {
        totalRequests: number;
        activeConnections: number;
        averageResponseTime: number;
        errorRate: number;
    };
}

/**
 * Basic health check (public, lightweight)
 */
export const useBasicHealthCheck = (options?: UseQueryOptions<HealthCheckResult, ApiError>) => {
    return useQuery<HealthCheckResult, ApiError>({
        queryKey: queryKeys.system.health.basic(),
        queryFn: async () => {
            const response = await apiClient.get('/health');
            return response.data.data;
        },
        staleTime: 30000, // 30 seconds
        gcTime: 60000, // 1 minute
        retry: 1, // Only retry once for health checks
        refetchOnWindowFocus: true,
        ...options,
    });
};

/**
 * Detailed health report (admin only)
 */
export const useDetailedHealthCheck = (options?: UseQueryOptions<ComprehensiveHealthReport, ApiError>) => {
    return useQuery<ComprehensiveHealthReport, ApiError>({
        queryKey: queryKeys.system.health.detailed(),
        queryFn: async () => {
            const response = await apiClient.get('/health/detailed');
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT, // 1 minute cache
        retry: RETRY_CONFIG.DEFAULT,
        refetchInterval: 60000, // Auto-refresh every minute
        ...options,
    });
};

/**
 * API metrics (admin only)
 */
export const useApiMetrics = (options?: UseQueryOptions<any, ApiError>) => {
    return useQuery<any, ApiError>({
        queryKey: queryKeys.system.health.metrics(),
        queryFn: async () => {
            const response = await apiClient.get('/health/metrics');
            return response.data.data.metrics;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        refetchInterval: 30000, // Auto-refresh every 30 seconds
        ...options,
    });
};

/**
 * Database health check (admin only)
 */
export const useDatabaseHealth = (options?: UseQueryOptions<DatabaseHealth, ApiError>) => {
    return useQuery<DatabaseHealth, ApiError>({
        queryKey: queryKeys.system.health.database(),
        queryFn: async () => {
            const response = await apiClient.get('/health/database');
            return response.data.data.database;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        refetchInterval: 60000,
        ...options,
    });
};

/**
 * External services health check (admin only)
 */
export const useExternalServicesHealth = (
    options?: UseQueryOptions<
        {
            services: ExternalServiceHealth[];
            summary: {
                total: number;
                healthy: number;
                degraded: number;
                unhealthy: number;
            };
        },
        ApiError
    >
) => {
    return useQuery({
        queryKey: queryKeys.system.health.services(),
        queryFn: async () => {
            const response = await apiClient.get('/health/services');
            return response.data.data;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        refetchInterval: 60000,
        ...options,
    });
};

/**
 * System metrics (CPU, memory, etc.) - admin only
 */
export const useSystemMetrics = (options?: UseQueryOptions<SystemMetrics, ApiError>) => {
    return useQuery<SystemMetrics, ApiError>({
        queryKey: queryKeys.system.health.systemMetrics(),
        queryFn: async () => {
            const response = await apiClient.get('/health/system');
            return response.data.data.systemMetrics;
        },
        ...CACHE_TIMES.SHORT,
        retry: RETRY_CONFIG.DEFAULT,
        refetchInterval: 30000,
        ...options,
    });
};

/**
 * Reset API metrics counters (super admin only)
 */
export const useResetMetrics = (options?: UseMutationOptions<void, ApiError, void>) => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, void>({
        mutationFn: async () => {
            await apiClient.post('/health/reset-metrics');
        },
        onSuccess: () => {
            // Invalidate all health-related queries
            queryClient.invalidateQueries({ queryKey: queryKeys.system.health.all() });
            showSuccessToast('API metrics reset successfully');
        },
        onError: (error) => handleApiError(error),
        retry: RETRY_CONFIG.DEFAULT,
        ...options,
    });
};
