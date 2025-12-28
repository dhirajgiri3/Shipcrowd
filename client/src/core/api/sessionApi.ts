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

// ═══════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all active sessions for the current user
 */
export async function getSessions(): Promise<GetSessionsResponse> {
    const response = await apiClient.get<GetSessionsResponse>('/auth/sessions');
    return response.data;
}

/**
 * Revoke a specific session by ID
 * @param sessionId - The ID of the session to revoke
 */
export async function revokeSession(sessionId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/auth/sessions/${sessionId}`);
    return response.data;
}

/**
 * Revoke all sessions except the current one
 * Effectively logs out from all other devices
 */
export async function revokeAllSessions(): Promise<{ message: string; revokedCount: number }> {
    const response = await apiClient.delete<{ message: string; revokedCount: number }>('/auth/sessions');
    return response.data;
}

/**
 * Check if a session is still active
 * @param sessionId - The ID of the session to check
 */
export async function checkSessionStatus(sessionId: string): Promise<{ isActive: boolean; lastActive: string }> {
    const response = await apiClient.get<{ isActive: boolean; lastActive: string }>(`/auth/sessions/${sessionId}/status`);
    return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SESSION API OBJECT
// ═══════════════════════════════════════════════════════════════════════════

export const sessionApi = {
    getSessions,
    revokeSession,
    revokeAllSessions,
    checkSessionStatus,
};

export default sessionApi;
