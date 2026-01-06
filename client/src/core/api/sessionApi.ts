/**
 * Session Management API
 *
 * Handles user session management including viewing active sessions,
 * revoking individual sessions, and logging out from all devices.
 */

import { apiClient } from './client';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Session {
    _id: string;
    userId: string;
    userAgent: string;
    ip: string;
    deviceInfo: {
        type: 'desktop' | 'mobile' | 'tablet' | 'other';
        browser?: string;
        os?: string;
        deviceName?: string;
    };
    location?: {
        country?: string;
        city?: string;
        region?: string;
    };
    lastActive: string;
    createdAt: string;
    expiresAt: string;
    isRevoked: boolean;
}

export interface GetSessionsResponse {
    sessions: Session[];
    currentSessionId?: string;
}

/**
 * Session Management API Service
 * Handles user session management including viewing active sessions,
 * revoking individual sessions, and logging out from all devices.
 * Class-based pattern for consistency and maintainability
 */
class SessionApiService {
    async getSessions(): Promise<GetSessionsResponse> {
        const response = await apiClient.get<GetSessionsResponse>('/auth/sessions');
        return response.data;
    }

    async revokeSession(sessionId: string): Promise<{ message: string }> {
        const response = await apiClient.delete<{ message: string }>(`/auth/sessions/${sessionId}`);
        return response.data;
    }

    async revokeAllSessions(): Promise<{ message: string; revokedCount: number }> {
        const response = await apiClient.delete<{ message: string; revokedCount: number }>('/auth/sessions');
        return response.data;
    }

    async checkSessionStatus(sessionId: string): Promise<{ isActive: boolean; lastActive: string }> {
        const response = await apiClient.get<{ isActive: boolean; lastActive: string }>(`/auth/sessions/${sessionId}/status`);
        return response.data;
    }
}

/**
 * Singleton instance
 */
export const sessionApi = new SessionApiService();

export default sessionApi;
