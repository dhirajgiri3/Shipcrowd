/**
 * Account Recovery API
 *
 * Handles account recovery options including security questions,
 * backup email, and recovery keys.
 */

import { apiClient } from './client';

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
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get list of available security questions
 */
export async function getSecurityQuestions(): Promise<SecurityQuestion[]> {
    const response = await apiClient.get<{ questions: SecurityQuestion[] }>('/auth/recovery/security-questions');
    return response.data.questions || [];
}

/**
 * Setup security questions for account recovery
 * @param data - Object containing 3 questions and their answers
 */
export async function setupSecurityQuestions(data: SetupSecurityQuestionsData): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/recovery/setup-questions', data, {
        headers: {
            'X-CSRF-Token': 'frontend-request',
        },
    });
    return response.data;
}

/**
 * Setup backup email for account recovery
 * @param email - The backup email address
 */
export async function setupBackupEmail(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/recovery/setup-backup-email', { email }, {
        headers: {
            'X-CSRF-Token': 'frontend-request',
        },
    });
    return response.data;
}

/**
 * Generate recovery keys
 * WARNING: These keys are shown only once and cannot be recovered
 */
export async function generateRecoveryKeys(): Promise<GenerateRecoveryKeysResponse> {
    const response = await apiClient.post<GenerateRecoveryKeysResponse>('/auth/recovery/generate-keys', {}, {
        headers: {
            'X-CSRF-Token': 'frontend-request',
        },
    });
    return response.data;
}

/**
 * Get current recovery options status
 */
export async function getRecoveryStatus(): Promise<RecoveryStatus> {
    const response = await apiClient.get<RecoveryStatus>('/auth/recovery/status');
    return response.data;
}

/**
 * Send recovery options via email
 * Useful if user loses access to their account
 * @param email - Email address to send recovery options to
 */
export async function sendRecoveryOptions(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/recovery/send-options', { email });
    return response.data;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT RECOVERY API OBJECT
// ═══════════════════════════════════════════════════════════════════════════

export const recoveryApi = {
    getSecurityQuestions,
    setupSecurityQuestions,
    setupBackupEmail,
    generateRecoveryKeys,
    getRecoveryStatus,
    sendRecoveryOptions,
};

export default recoveryApi;
