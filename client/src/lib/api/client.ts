import { ApiError } from '@/src/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';

export class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Generate a simple CSRF token for request validation.
     * In production, this should be managed server-side.
     */
    private getCsrfToken(): string {
        // For development, use a simple token based on origin
        // The server validates the Origin and Referer headers
        return `shipcrowd_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        // Get CSRF token from cookie or generate one
        const csrfToken = this.getCsrfToken();

        const config: RequestInit = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
                ...options.headers,
            },
            credentials: 'include', // Include cookies for authentication
        };

        try {
            const response = await fetch(url, config);

            // Handle non-2xx responses
            if (!response.ok) {
                const error: ApiError = await response.json().catch(() => ({
                    message: response.statusText,
                    status: response.status,
                }));
                throw error;
            }

            return response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw {
                    message: error.message,
                    status: 500,
                } as ApiError;
            }
            throw error;
        }
    }

    async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
