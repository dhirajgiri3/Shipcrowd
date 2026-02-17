import axios from 'axios';
import { ValidationError } from '../../../../shared/errors/app.error';
import { decryptData } from '../../../../shared/utils/encryption';
import { CanonicalCourierProvider } from './courier-provider-registry';

const DELHIVERY_TOKEN_ERROR_PATTERNS = [
    'login or api key required',
    'authentication credentials were not provided',
    'unauthorized client/user',
    'invalid token',
    'there has been an error but we were asked to not let you see that',
];

type IntegrationLike = {
    credentials?: Record<string, unknown>;
    settings?: { baseUrl?: string | null } | null;
} | null | undefined;

type CredentialOverrides = {
    apiKey?: string;
    username?: string;
    password?: string;
    clientId?: string;
    baseUrl?: string;
};

function decodeCredential(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim();
    if (!normalized) {
        return undefined;
    }

    let decoded = normalized;
    for (let i = 0; i < 2; i += 1) {
        try {
            decoded = decryptData(decoded).trim();
        } catch {
            break;
        }
    }

    return decoded || normalized;
}

function normalizeBaseUrl(value?: string | null): string {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw new ValidationError('Base API URL is required');
    }
    let parsed: URL;
    try {
        parsed = new URL(normalized);
    } catch {
        throw new ValidationError('Base API URL must be a valid absolute URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new ValidationError('Base API URL must start with http:// or https://');
    }

    return normalized.replace(/\/+$/, '');
}

function hasDelhiveryAuthError(payload: unknown): boolean {
    const text = typeof payload === 'string'
        ? payload.toLowerCase()
        : JSON.stringify(payload || {}).toLowerCase();
    return DELHIVERY_TOKEN_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
}

async function validateDelhiveryApiKeyOrThrow(params: {
    apiKey: string;
    baseUrl?: string | null;
}): Promise<void> {
    const apiKey = String(params.apiKey || '').trim();
    if (!apiKey) {
        throw new ValidationError('Delhivery API token is required');
    }

    const baseUrl = normalizeBaseUrl(params.baseUrl);
    try {
        const response = await axios.get(`${baseUrl}/c/api/pin-codes/json/`, {
            headers: {
                Authorization: `Token ${apiKey}`,
                Accept: 'application/json',
            },
            params: { filter_codes: '110001' },
            timeout: 10000,
        });

        if (hasDelhiveryAuthError(response.data)) {
            throw new ValidationError(
                'Invalid Delhivery API token or environment mismatch. Check token and base URL.'
            );
        }
    } catch (error: any) {
        if (error instanceof ValidationError) {
            throw error;
        }

        const status = Number(error?.response?.status || 0);
        const body = error?.response?.data;
        if (status === 401 || status === 403 || hasDelhiveryAuthError(body)) {
            throw new ValidationError(
                'Invalid Delhivery API token or environment mismatch. Check token and base URL.'
            );
        }

        throw new ValidationError(
            'Unable to verify Delhivery API token. Please check connectivity and URL.'
        );
    }
}

async function validateVelocityCredentialsOrThrow(params: {
    username: string;
    password: string;
    baseUrl?: string | null;
}): Promise<void> {
    const username = String(params.username || '').trim();
    const password = String(params.password || '').trim();
    if (!username || !password) {
        throw new ValidationError('Velocity username and password are required');
    }

    const baseUrl = normalizeBaseUrl(params.baseUrl);

    try {
        const response = await axios.post(
            `${baseUrl}/custom/api/v1/auth-token`,
            { username, password },
            {
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                timeout: 10000,
            }
        );

        if (!response?.data?.token) {
            throw new ValidationError('Unable to verify Velocity credentials.');
        }
    } catch (error: any) {
        if (error instanceof ValidationError) {
            throw error;
        }

        const status = Number(error?.response?.status || 0);
        if (status === 400 || status === 401 || status === 403) {
            throw new ValidationError('Invalid Velocity credentials');
        }

        throw new ValidationError(
            'Unable to verify Velocity credentials. Please check connectivity and URL.'
        );
    }
}

async function validateEkartCredentialsOrThrow(params: {
    clientId: string;
    username: string;
    password: string;
    baseUrl?: string | null;
}): Promise<void> {
    const clientId = String(params.clientId || '').trim();
    const username = String(params.username || '').trim();
    const password = String(params.password || '').trim();
    if (!clientId || !username || !password) {
        throw new ValidationError('Ekart clientId, username, and password are required');
    }

    const baseUrl = normalizeBaseUrl(params.baseUrl);

    try {
        const response = await axios.post(
            `${baseUrl}/integrations/v2/auth/token/${encodeURIComponent(clientId)}`,
            { username, password },
            {
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                timeout: 10000,
            }
        );

        if (!response?.data?.access_token) {
            throw new ValidationError('Unable to verify Ekart credentials.');
        }
    } catch (error: any) {
        if (error instanceof ValidationError) {
            throw error;
        }

        const status = Number(error?.response?.status || 0);
        if (status === 400 || status === 401 || status === 403) {
            throw new ValidationError('Invalid Ekart credentials');
        }

        throw new ValidationError(
            'Unable to verify Ekart credentials. Please check connectivity and URL.'
        );
    }
}

export async function validateCourierCredentialsOrThrow(params: {
    provider: CanonicalCourierProvider;
    integration?: IntegrationLike;
    overrides?: CredentialOverrides;
}): Promise<void> {
    const integration = params.integration;
    const overrides = params.overrides || {};
    const baseUrl = String(overrides.baseUrl || integration?.settings?.baseUrl || '').trim() || undefined;

    if (params.provider === 'delhivery') {
        const apiKey = String(overrides.apiKey || decodeCredential(integration?.credentials?.apiKey) || '').trim();
        await validateDelhiveryApiKeyOrThrow({ apiKey, baseUrl });
        return;
    }

    if (params.provider === 'velocity') {
        const username = String(overrides.username || decodeCredential(integration?.credentials?.username) || '').trim();
        const password = String(overrides.password || decodeCredential(integration?.credentials?.password) || '').trim();
        await validateVelocityCredentialsOrThrow({ username, password, baseUrl });
        return;
    }

    if (params.provider === 'ekart') {
        const clientId = String(overrides.clientId || integration?.credentials?.clientId || '').trim();
        const username = String(overrides.username || decodeCredential(integration?.credentials?.username) || '').trim();
        const password = String(overrides.password || decodeCredential(integration?.credentials?.password) || '').trim();
        await validateEkartCredentialsOrThrow({ clientId, username, password, baseUrl });
    }
}
