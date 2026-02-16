import mongoose from 'mongoose';
import { decryptData } from '../../../../shared/utils/encryption';
import Integration from '../../../database/mongoose/models/system/integrations/integration.model';

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

        let decoded = normalized;
        for (let i = 0; i < 2; i += 1) {
            try {
                decoded = decryptData(decoded).trim();
            } catch {
                break;
            }
        }

        // Backward compatibility for legacy plaintext credentials.
        return decoded || normalized;
    }

    private async getIntegrationToken(): Promise<string | undefined> {
        const companyClauses = this.companyId
            ? [{ companyId: this.companyId }, { companyId: null }]
            : [{ companyId: null }];

        const integrations = await Integration.collection.find({
            type: 'courier',
            provider: 'delhivery',
            'settings.isActive': true,
            $or: companyClauses,
        }, {
            projection: { companyId: 1, credentials: 1 }
        }).toArray();

        if (!integrations.length) return undefined;

        const companySpecific = this.companyId
            ? integrations.find((item: any) => item.companyId && String(item.companyId) === String(this.companyId))
            : undefined;
        const platformScoped = integrations.find((item: any) => !item.companyId);
        const selected = companySpecific || platformScoped;

        if (!selected) return undefined;

        const token = (selected as any).credentials?.apiKey;
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
