import mongoose from 'mongoose';
import Integration from '../../../database/mongoose/models/system/integrations/integration.model';
import { decryptData } from '../../../../shared/utils/encryption';

/**
 * Delhivery B2C Authentication
 * Uses static token (no refresh)
 */
export class DelhiveryAuth {
    private companyId?: mongoose.Types.ObjectId;

    constructor(companyId?: mongoose.Types.ObjectId) {
        this.companyId = companyId;
    }

    private decodeCredentialValue(value: unknown): string | undefined {
        if (typeof value !== 'string') {
            return undefined;
        }
        const normalized = value.trim();
        if (!normalized) {
            return undefined;
        }

        try {
            return decryptData(normalized);
        } catch {
            // Backward compatibility for legacy plaintext credentials.
            return normalized;
        }
    }

    private async getIntegrationToken(): Promise<string | undefined> {
        if (!this.companyId) return undefined;

        const integration = await Integration.collection.findOne({
            companyId: this.companyId,
            type: 'courier',
            provider: 'delhivery',
            'settings.isActive': true
        }, {
            projection: { credentials: 1 }
        });

        if (!integration) return undefined;

        const token = (integration as any).credentials?.apiKey;
        if (!token) return undefined;

        return this.decodeCredentialValue(token);
    }

    async getToken(): Promise<string> {
        const integrationToken = await this.getIntegrationToken();
        const envToken = process.env.DELHIVERY_API_TOKEN || process.env.DELHIVERY_API_KEY;

        const token = integrationToken || envToken;
        if (!token) {
            throw new Error('DELHIVERY_API_TOKEN environment variable or Integration credential is required');
        }

        return token;
    }

    async getHeaders(): Promise<Record<string, string>> {
        const token = await this.getToken();
        return {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }
}
