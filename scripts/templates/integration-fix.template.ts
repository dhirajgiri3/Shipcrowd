/**
 * TEMPLATE: Integration Replacement
 * 
 * Use this template to replace mock/placeholder integrations with real implementations.
 * 
 * WHEN TO USE:
 * - Code has "// TODO: Integrate with X"
 * - Code has "// For now, mock this"
 * - Method returns hardcoded values instead of API calls
 * - External service integration is stubbed
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/errors/AppError';

// ============================================
// STEP 1: Define Request/Response Interfaces
// ============================================

export interface ExternalServiceRequest {
    // Define request structure based on API docs
    field1: string;
    field2: number;
}

export interface ExternalServiceResponse {
    // Define response structure based on API docs
    id: string;
    status: string;
    data: any;
}

// ============================================
// STEP 2: Create Client Service
// ============================================

export class ExternalServiceClient {
    private client: AxiosInstance;
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        // Load from environment
        this.apiKey = process.env.EXTERNAL_SERVICE_API_KEY!;
        this.baseUrl = process.env.EXTERNAL_SERVICE_URL!;

        if (!this.apiKey || !this.baseUrl) {
            throw new Error('External service credentials not configured');
        }

        // Create axios instance
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 seconds
        });

        // Add retry logic
        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const config = error.config;

                // Retry on 5xx errors (max 3 attempts)
                if (error.response?.status >= 500 && !config.__retryCount) {
                    config.__retryCount = 1;
                } else if (config.__retryCount < 3) {
                    config.__retryCount++;
                } else {
                    throw error;
                }

                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, config.__retryCount) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));

                return this.client(config);
            }
        );
    }

    /**
     * Call external service
     */
    async performAction(data: ExternalServiceRequest): Promise<ExternalServiceResponse> {
        try {
            logger.info('Calling external service', { data });

            const response = await this.client.post('/endpoint', {
                // Map our data to API format
                api_field_1: data.field1,
                api_field_2: data.field2,
            });

            logger.info('External service call successful', {
                responseId: response.data.id,
            });

            // Map API response to our format
            return {
                id: response.data.id,
                status: response.data.status,
                data: response.data,
            };

        } catch (error: any) {
            logger.error('External service call failed', {
                error: error.message,
                status: error.response?.status,
            });

            // Map API errors to our errors
            if (error.response?.status === 400) {
                throw new AppError(
                    error.response.data.message || 'Invalid request',
                    'INVALID_REQUEST',
                    400
                );
            }

            if (error.response?.status === 404) {
                throw new AppError(
                    'Resource not found',
                    'NOT_FOUND',
                    404
                );
            }

            throw new AppError(
                'External service call failed',
                'EXTERNAL_SERVICE_ERROR',
                500,
                error
            );
        }
    }
}

// Export singleton instance
export const externalServiceClient = new ExternalServiceClient();

// ============================================
// STEP 3: Replace Mock in Service
// ============================================

/**
 * BEFORE (❌ Mock):
 * 
 * async someMethod() {
 *     // TODO: Integrate with external service
 *     return { id: 'MOCK-123' }; // Hardcoded!
 * }
 * 
 * 
 * AFTER (✅ Real integration):
 * 
 * import { externalServiceClient } from '@/infrastructure/external/service-client';
 * 
 * async someMethod(data: DataType) {
 *     const result = await externalServiceClient.performAction({
 *         field1: data.value1,
 *         field2: data.value2,
 *     });
 * 
 *     return result;
 * }
 */

/**
 * CHECKLIST AFTER APPLYING:
 * 
 * [ ] Environment variables configured (.env)
 * [ ] Request/response interfaces match API docs
 * [ ] Error handling maps API errors correctly
 * [ ] Retry logic implemented for transient failures
 * [ ] Logging includes request/response data
 * [ ] Removed all "TODO" and "for now" comments
 * [ ] Created mock client for testing
 * [ ] Added integration tests with real API (or sandbox)
 * [ ] Updated documentation with API details
 */
