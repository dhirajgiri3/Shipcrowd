import { Company } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp';

export interface NotificationPreferences {
    channels: {
        email: boolean;
        sms: boolean;
        whatsapp: boolean;
    };
    quietHours: {
        enabled: boolean;
        start: string; // HH:mm
        end: string;   // HH:mm
        timezone: string;
    };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
    channels: {
        email: true,
        sms: true,
        whatsapp: true
    },
    quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'Asia/Kolkata'
    }
};

const parseTime = (value: string): number => {
    const [h, m] = value.split(':').map((n) => parseInt(n, 10));
    return h * 60 + (m || 0);
};

const getLocalMinutes = (date: Date, timeZone: string): number => {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(date);
        const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
        return hour * 60 + minute;
    } catch (error) {
        logger.warn('Invalid timezone for notification preferences, falling back to UTC', {
            timeZone,
            error: error instanceof Error ? error.message : String(error)
        });
        return date.getUTCHours() * 60 + date.getUTCMinutes();
    }
};

export class NotificationPreferenceService {
    static async getCompanyPreferences(companyId: string): Promise<NotificationPreferences> {
        try {
            const company = await Company.findById(companyId)
                .select('settings.notificationPreferences settings.timezone')
                .lean();

            if (!company) {
                return DEFAULT_PREFERENCES;
            }

            const prefs = company.settings?.notificationPreferences || {};
            const timezone = prefs.quietHours?.timezone || company.settings?.timezone || DEFAULT_PREFERENCES.quietHours.timezone;

            return {
                channels: {
                    email: prefs.channels?.email ?? DEFAULT_PREFERENCES.channels.email,
                    sms: prefs.channels?.sms ?? DEFAULT_PREFERENCES.channels.sms,
                    whatsapp: prefs.channels?.whatsapp ?? DEFAULT_PREFERENCES.channels.whatsapp
                },
                quietHours: {
                    enabled: prefs.quietHours?.enabled ?? DEFAULT_PREFERENCES.quietHours.enabled,
                    start: prefs.quietHours?.start ?? DEFAULT_PREFERENCES.quietHours.start,
                    end: prefs.quietHours?.end ?? DEFAULT_PREFERENCES.quietHours.end,
                    timezone
                }
            };
        } catch (error) {
            logger.error('Failed to load notification preferences', {
                companyId,
                error: error instanceof Error ? error.message : String(error)
            });
            return DEFAULT_PREFERENCES;
        }
    }

    static async shouldSend(
        companyId: string,
        channel: NotificationChannel,
        date: Date = new Date()
    ): Promise<boolean> {
        const prefs = await this.getCompanyPreferences(companyId);

        if (!prefs.channels[channel]) {
            return false;
        }

        if (!prefs.quietHours.enabled) {
            return true;
        }

        const start = parseTime(prefs.quietHours.start);
        const end = parseTime(prefs.quietHours.end);
        const now = getLocalMinutes(date, prefs.quietHours.timezone);

        if (start === end) {
            return true;
        }

        if (start < end) {
            // Same-day quiet hours window
            return !(now >= start && now < end);
        }

        // Overnight quiet hours (e.g., 22:00 - 08:00)
        return !(now >= start || now < end);
    }
}

export default NotificationPreferenceService;
