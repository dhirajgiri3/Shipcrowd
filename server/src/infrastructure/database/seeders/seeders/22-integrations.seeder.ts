/**
 * Integrations Seeder
 * 
 * Seeds system integration data:
 * - Integration configurations for ecommerce, payment, and other providers (company-scoped)
 * - Courier integrations are seeded at platform-scope in 30-service-level-pricing.seeder.ts
 * - 20-30 integrations across companies
 */

import Company from '../../mongoose/models/organization/core/company.model';
import Integration from '../../mongoose/models/system/integrations/integration.model';
import { subDays } from '../utils/date.utils';
import { createTimer, logger } from '../utils/logger.utils';
import { generateAlphanumeric, generateHexString, randomInt, selectRandom } from '../utils/random.utils';

// Integration types and providers
const INTEGRATION_CONFIGS = {
    ecommerce: {
        providers: ['shopify', 'woocommerce', 'amazon', 'flipkart', 'magento'],
        weight: 55,
    },
    payment: {
        providers: ['razorpay', 'paytm', 'cashfree', 'payu'],
        weight: 30,
    },
    other: {
        providers: ['twilio', 'exotel', 'sendgrid', 'msg91'],
        weight: 15,
    },
};

/**
 * Generate credentials based on provider
 */
function generateCredentials(provider: string): any {
    const baseCredentials: any = {
        apiKey: generateHexString(32),
        apiSecret: generateHexString(64),
    };

    // Provider-specific credentials
    switch (provider) {
        case 'razorpay':
            return {
                apiKey: `rzp_test_${generateAlphanumeric(14)}`,
                apiSecret: generateHexString(24),
                webhookSecret: generateHexString(32),
            };
        case 'paytm':
            return {
                merchantId: `Shipcrowd${randomInt(10000, 99999)}`,
                merchantKey: generateHexString(16),
                websiteName: 'WEBSTAGING',
            };
        case 'delhivery':
            return {
                apiKey: generateHexString(32),
                clientName: `Shipcrowd${randomInt(1000, 9999)}`,
                warehouseCode: `WH${randomInt(100, 999)}`,
            };
        case 'bluedart':
            return {
                licenseKey: generateHexString(24),
                loginId: `SC${randomInt(10000, 99999)}`,
                profileId: String(randomInt(10000, 99999)),
            };
        case 'velocity':
            return {
                apiKey: generateHexString(32),
                accountId: `VEL${generateAlphanumeric(8).toUpperCase()}`,
                clientId: generateAlphanumeric(16),
                clientSecret: generateHexString(32),
            };
        case 'twilio':
            return {
                accountSid: `AC${generateHexString(32)}`,
                authToken: generateHexString(32),
                fromNumber: `+1${randomInt(2000000000, 9999999999)}`,
            };
        case 'exotel':
            return {
                accountSid: `EXOTEL${randomInt(10000, 99999)}`,
                apiKey: generateHexString(20),
                apiToken: generateHexString(20),
                callerId: `0${randomInt(8000000000, 9999999999)}`,
            };
        case 'sendgrid':
            return {
                apiKey: `SG.${generateAlphanumeric(22)}.${generateAlphanumeric(43)}`,
                fromEmail: 'notifications@Shipcrowd.com',
            };
        default:
            return baseCredentials;
    }
}

/**
 * Generate integration settings
 */
function generateSettings(_type: string, provider: string): any {
    const isActive = Math.random() > 0.1;
    const isPrimary = Math.random() > 0.7;

    return {
        isActive,
        isPrimary,
        webhookUrl: `https://api.Shipcrowd.com/webhooks/${provider}/${generateHexString(16)}`,
        callbackUrl: `https://api.Shipcrowd.com/callbacks/${provider}/${generateHexString(16)}`,
    };
}

/**
 * Generate integration metadata
 */
function generateMetadata(isActive: boolean): any {
    const hasError = !isActive && Math.random() > 0.5;
    const lastSyncAt = subDays(new Date(), randomInt(0, 7));

    return {
        lastSyncAt,
        lastErrorAt: hasError ? subDays(new Date(), randomInt(0, 3)) : undefined,
        lastError: hasError ? selectRandom([
            'Connection timeout',
            'Invalid credentials',
            'Rate limit exceeded',
            'Service unavailable',
        ]) : undefined,
    };
}

/**
 * Generate an integration
 */
function generateIntegration(companyId: any): any {
    // Select type based on weights
    const rand = Math.random() * 100;
    let type: string;
    let cumWeight = 0;

    for (const [t, config] of Object.entries(INTEGRATION_CONFIGS)) {
        cumWeight += config.weight;
        if (rand < cumWeight) {
            type = t;
            break;
        }
    }
    type = type! || 'ecommerce';

    const config = INTEGRATION_CONFIGS[type as keyof typeof INTEGRATION_CONFIGS];
    const provider = selectRandom(config.providers);
    const settings = generateSettings(type, provider);
    const createdAt = subDays(new Date(), randomInt(30, 365));

    return {
        companyId,
        type,
        provider,
        credentials: generateCredentials(provider),
        settings,
        metadata: generateMetadata(settings.isActive),
        isDeleted: false,
        createdAt,
        updatedAt: subDays(new Date(), randomInt(0, 30)),
    };
}

/**
 * Main seeder function
 */
export async function seedIntegrations(): Promise<void> {
    const timer = createTimer();
    logger.step(22, 'Seeding Integrations (Ecommerce, Payment, Other)');

    try {
        const companies = await Company.find({ status: 'approved', isDeleted: false }).limit(20).lean();

        if (companies.length === 0) {
            logger.warn('No companies found. Skipping integrations seeder.');
            return;
        }

        const integrations: any[] = [];

        // Generate 2-4 integrations per company
        for (const company of companies) {
            const companyAny = company as any;
            const integrationCount = randomInt(2, 4);

            for (let i = 0; i < integrationCount; i++) {
                integrations.push(generateIntegration(companyAny._id));
            }
        }

        // Insert integrations
        await Integration.insertMany(integrations, { ordered: false }).catch((err) => {
            if (err.code !== 11000) throw err;
            logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate integrations`);
        });

        // Count by type
        const byType: Record<string, number> = {};
        for (const integration of integrations) {
            byType[integration.type] = (byType[integration.type] || 0) + 1;
        }

        logger.complete('integrations', integrations.length, timer.elapsed());
        logger.table({
            'Ecommerce Integrations': byType['ecommerce'] || 0,
            'Payment Integrations': byType['payment'] || 0,
            'Other Integrations': byType['other'] || 0,
            'Total Integrations': integrations.length,
        });

    } catch (error) {
        logger.error('Failed to seed integrations:', error);
        throw error;
    }
}
