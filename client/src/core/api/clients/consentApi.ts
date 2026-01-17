/**
 * Consent API Client
 * 
 * Handles GDPR consent management API calls
 */

import { apiClient } from '../config/client';

export type ConsentType = 'terms' | 'privacy' | 'marketing' | 'cookies' | 'data_processing';

export interface ConsentStatus {
    accepted: boolean;
    version: string;
    acceptedAt?: string;
    withdrawnAt?: string;
}

export interface ConsentMap {
    terms?: ConsentStatus;
    privacy?: ConsentStatus;
    marketing?: ConsentStatus;
    cookies?: ConsentStatus;
    data_processing?: ConsentStatus;
}

export interface ConsentHistoryItem {
    action: 'accepted' | 'withdrawn' | 'updated';
    type: ConsentType;
    version: string;
    createdAt: string;
}

export interface UserDataExport {
    exportDate: string;
    exportVersion: string;
    user: Record<string, any>;
    consents: any[];
    consentHistory: any[];
}

class ConsentApiService {
    /**
     * Get user's current consents
     * GET /consent
     */
    async getConsents(): Promise<ConsentMap> {
        const response = await apiClient.get('/consent');
        return response.data.data.consents;
    }

    /**
     * Accept a consent
     * POST /consent
     */
    async acceptConsent(type: ConsentType, version: string = '1.0'): Promise<void> {
        await apiClient.post('/consent', { type, version });
    }

    /**
     * Accept multiple consents at once
     */
    async acceptMultipleConsents(consents: { type: ConsentType; version?: string }[]): Promise<void> {
        await Promise.all(
            consents.map(c => this.acceptConsent(c.type, c.version))
        );
    }

    /**
     * Withdraw consent (marketing, cookies, data_processing only)
     * DELETE /consent/:type
     */
    async withdrawConsent(type: ConsentType): Promise<void> {
        await apiClient.delete(`/consent/${type}`);
    }

    /**
     * Get consent history
     * GET /consent/history
     */
    async getConsentHistory(): Promise<ConsentHistoryItem[]> {
        const response = await apiClient.get('/consent/history');
        return response.data.data.history;
    }

    /**
     * Export user data (GDPR right to data portability)
     * GET /consent/export
     */
    async exportUserData(): Promise<Blob> {
        const response = await apiClient.get('/consent/export', {
            responseType: 'blob',
        });
        return response.data;
    }

    /**
     * Download user data as JSON file
     */
    async downloadUserData(): Promise<void> {
        const blob = await this.exportUserData();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

export const consentApi = new ConsentApiService();
