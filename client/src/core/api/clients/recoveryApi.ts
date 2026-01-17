/**
 * Account Recovery API
 *
 * Handles account recovery options including security questions,
 * backup email, and recovery keys.
 */

import { apiClient } from '../config/client';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SecurityQuestion {
    id: string;
    question: string;
}

export interface SetupSecurityQuestionsData {
    question1: string;
    answer1: string;
    question2: string;
    answer2: string;
    question3: string;
    answer3: string;
}

export interface RecoveryStatus {
    hasSecurityQuestions: boolean;
    hasBackupEmail: boolean;
    backupEmail?: string;
    recoveryKeysCount: number;
    setupCompletedAt?: string;
}

export interface GenerateRecoveryKeysResponse {
    keys: string[];
    message: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// RECOVERY API SERVICE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recovery API Service
 * Handles account recovery operations including security questions,
 * backup email setup, and recovery key management.
 * Class-based pattern for consistency and maintainability.
 */
class RecoveryApiService {
    /**
     * Get list of available security questions
     */
    async getSecurityQuestions(): Promise<SecurityQuestion[]> {
        const response = await apiClient.get<{ questions: SecurityQuestion[] }>('/auth/recovery/security-questions');
        return response.data.questions || [];
    }

    /**
     * Setup security questions for account recovery
     * @param data - Object containing 3 questions and their answers
     */
    async setupSecurityQuestions(data: SetupSecurityQuestionsData): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>('/auth/recovery/setup-questions', data);
        return response.data;
    }

    /**
     * Setup backup email for account recovery
     * @param email - The backup email address
     */
    async setupBackupEmail(email: string): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>('/auth/recovery/setup-backup-email', { email });
        return response.data;
    }

    /**
     * Generate recovery keys
     * WARNING: These keys are shown only once and cannot be recovered
     */
    async generateRecoveryKeys(): Promise<GenerateRecoveryKeysResponse> {
        const response = await apiClient.post<GenerateRecoveryKeysResponse>('/auth/recovery/generate-keys', {});
        return response.data;
    }

    /**
     * Get current recovery options status
     */
    async getRecoveryStatus(): Promise<RecoveryStatus> {
        const response = await apiClient.get<RecoveryStatus>('/auth/recovery/status');
        return response.data;
    }

    /**
     * Send recovery options via email
     * Useful if user loses access to their account
     * @param email - Email address to send recovery options to
     */
    async sendRecoveryOptions(email: string): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>('/auth/recovery/send-options', { email });
        return response.data;
    }
}

/**
 * Singleton instance
 */
export const recoveryApi = new RecoveryApiService();

export default recoveryApi;
