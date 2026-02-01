/**
 * Session Management API
 * Handles user session operations: list, revoke, and revoke all
 */

import { apiClient } from '../http';

/**
 * User session information
 */
export interface Session {
    _id: string;
    userAgent: string;
    ip: string;
    deviceInfo: {
        type: 'desktop' | 'mobile' | 'tablet' | 'other';
        browser: string;
        os: string;
        deviceName?: string;
    };
    location?: {
        country?: string;
        city?: string;
        region?: string;
    };
    lastActive: Date;
    expiresAt: Date;
    isRevoked: boolean;
    createdAt: Date;
    isCurrent?: boolean; // Added by frontend to mark current session
}

/**
 * Session API endpoints
 */
export const sessionApi = {
    /**
     * Get all active sessions for the current user
     * @returns List of active sessions
     */
    getSessions: async (): Promise<Session[]> => {
        const response = await apiClient.get('/auth/sessions');
        return response.data.data.sessions;
    },

    /**
     * Revoke a specific session
     * @param sessionId - ID of the session to revoke
     */
    revokeSession: async (sessionId: string): Promise<void> => {
        await apiClient.delete(`/auth/sessions/${sessionId}`);
    },

    /**
     * Revoke all sessions except the current one
     * @returns Number of sessions revoked
     */
    revokeAllSessions: async (): Promise<{ revoked: number }> => {
        const response = await apiClient.delete('/auth/sessions');
        return response.data.data;
    },
};
