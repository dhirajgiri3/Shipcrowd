import SystemConfiguration from '../../../../infrastructure/database/mongoose/models/configuration/system-configuration.model';
import pincodeLookupService from '../logistics/pincode-lookup.service';

const METRO_CITIES_KEY = 'metro_cities';

const parseOrigins = (value?: string): string[] =>
    (value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const maskBool = (value?: string): boolean => Boolean(value && value.trim().length > 0);

export interface AdminPlatformSettings {
    serviceability: {
        metroCities: string[];
    };
    integrations: {
        email: {
            configured: boolean;
            provider: string;
        };
        sms: {
            configured: boolean;
            provider: string;
        };
        payment: {
            configured: boolean;
            provider: string;
        };
    };
    security: {
        corsAllowedOrigins: string[];
        csrfAllowedOrigins: string[];
    };
    updatedAt?: string;
    updatedBy?: string;
}

class AdminPlatformSettingsService {
    async getSettings(): Promise<AdminPlatformSettings> {
        const config = await SystemConfiguration.findOne({
            key: METRO_CITIES_KEY,
            isActive: true,
        }).lean();

        const metroCities = Array.isArray(config?.value) ? config!.value : [];
        const corsAllowedOrigins = Array.from(
            new Set(
                [
                    process.env.CLIENT_URL || '',
                    process.env.FRONTEND_URL || '',
                    ...parseOrigins(process.env.CORS_ALLOWED_ORIGINS),
                ].filter(Boolean)
            )
        );
        const csrfAllowedOrigins = Array.from(
            new Set(
                [
                    process.env.CLIENT_URL || '',
                    process.env.FRONTEND_URL || '',
                    ...parseOrigins(process.env.CSRF_ALLOWED_ORIGINS),
                ].filter(Boolean)
            )
        );

        return {
            serviceability: {
                metroCities,
            },
            integrations: {
                email: {
                    configured: maskBool(process.env.SMTP_USER) || maskBool(process.env.SENDGRID_API_KEY),
                    provider: (process.env.EMAIL_SERVICE || 'sendgrid').toUpperCase(),
                },
                sms: {
                    configured: maskBool(process.env.TWILIO_ACCOUNT_SID) && maskBool(process.env.TWILIO_AUTH_TOKEN),
                    provider: 'TWILIO',
                },
                payment: {
                    configured: maskBool(process.env.RAZORPAY_KEY_ID) && maskBool(process.env.RAZORPAY_KEY_SECRET),
                    provider: 'RAZORPAY',
                },
            },
            security: {
                corsAllowedOrigins,
                csrfAllowedOrigins,
            },
            updatedAt: config?.updatedAt?.toISOString(),
            updatedBy: config?.meta?.lastUpdatedBy,
        };
    }

    async updateMetroCities(metroCities: string[], updatedBy: string): Promise<AdminPlatformSettings> {
        const normalized = Array.from(
            new Set(
                metroCities
                    .map((city) => city.trim().toUpperCase())
                    .filter(Boolean)
            )
        );

        await SystemConfiguration.findOneAndUpdate(
            { key: METRO_CITIES_KEY },
            {
                $set: {
                    value: normalized,
                    description: 'List of Metro cities for Zone C calculation',
                    isActive: true,
                    meta: {
                        source: 'admin',
                        lastUpdatedBy: updatedBy,
                        updatedAt: new Date(),
                    },
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await pincodeLookupService.loadConfig();
        return this.getSettings();
    }
}

export default new AdminPlatformSettingsService();
