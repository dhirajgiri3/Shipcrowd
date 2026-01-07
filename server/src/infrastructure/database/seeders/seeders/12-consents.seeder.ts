/**
 * Consents Seeder
 * 
 * Generates GDPR consent records for all users.
 * - Terms & Privacy: Required, 100% acceptance
 * - Marketing: Optional, ~40% acceptance
 * - Cookies: Required, 100% acceptance
 */

import { Consent, ConsentHistory } from '../../mongoose/models/iam/consent.model';
import User from '../../mongoose/models/iam/users/user.model';
import { randomInt, selectRandom } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { addDays, addHours } from '../utils/date.utils';

// Consent version (update when terms change)
const CONSENT_VERSION = '1.0';

// IP addresses for simulation
const SAMPLE_IPS = [
    '103.21.58.10', '103.21.58.11', '103.21.58.12', '103.21.58.13',
    '49.207.45.20', '49.207.45.21', '49.207.45.22', '49.207.45.23',
    '117.239.195.30', '117.239.195.31', '117.239.195.32',
];

// User agents for simulation
const SAMPLE_USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

/**
 * Generate consent record for a user
 */
function generateConsent(
    userId: any,
    type: 'terms' | 'privacy' | 'marketing' | 'cookies' | 'data_processing',
    accepted: boolean,
    userCreatedAt: Date
): any {
    const ip = selectRandom(SAMPLE_IPS);
    const userAgent = selectRandom(SAMPLE_USER_AGENTS);

    // Consent given shortly after user registration (within 1 hour)
    const acceptedAt = accepted ? addHours(userCreatedAt, randomInt(0, 60) / 60) : undefined;

    return {
        userId,
        type,
        version: CONSENT_VERSION,
        accepted,
        acceptedAt,
        ip,
        userAgent,
        source: 'registration',
        createdAt: acceptedAt || userCreatedAt,
        updatedAt: acceptedAt || userCreatedAt,
    };
}

/**
 * Main seeder function
 */
export async function seedConsents(): Promise<void> {
    const timer = createTimer();
    logger.step(12, 'Seeding Consents');

    try {
        // Get all users
        const users = await User.find({ isDeleted: false }).lean();

        if (users.length === 0) {
            logger.warn('No users found. Skipping consents seeder.');
            return;
        }

        const consents: any[] = [];
        let termsCount = 0;
        let privacyCount = 0;
        let marketingCount = 0;
        let cookiesCount = 0;

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const userCreatedAt = user.createdAt || new Date();

            // Required consents (100% acceptance for active users)
            const isActiveUser = !!(user.isActive && user.isEmailVerified);

            // 1. Terms of Service (required)
            consents.push(generateConsent(user._id, 'terms', isActiveUser, userCreatedAt));
            if (isActiveUser) termsCount++;

            // 2. Privacy Policy (required)
            consents.push(generateConsent(user._id, 'privacy', isActiveUser, userCreatedAt));
            if (isActiveUser) privacyCount++;

            // 3. Cookies (required)
            consents.push(generateConsent(user._id, 'cookies', isActiveUser, userCreatedAt));
            if (isActiveUser) cookiesCount++;

            // 4. Marketing (optional, ~40% acceptance)
            const acceptsMarketing = isActiveUser && Math.random() < 0.4;
            consents.push(generateConsent(user._id, 'marketing', acceptsMarketing, userCreatedAt));
            if (acceptsMarketing) marketingCount++;

            if ((i + 1) % 100 === 0 || i === users.length - 1) {
                logger.progress(i + 1, users.length, 'Consents');
            }
        }

        // Insert all consents
        await Consent.insertMany(consents);

        logger.complete('consents', consents.length, timer.elapsed());
        logger.table({
            'Total Consents': consents.length,
            'Terms Accepted': `${termsCount} (${((termsCount / users.length) * 100).toFixed(1)}%)`,
            'Privacy Accepted': `${privacyCount} (${((privacyCount / users.length) * 100).toFixed(1)}%)`,
            'Cookies Accepted': `${cookiesCount} (${((cookiesCount / users.length) * 100).toFixed(1)}%)`,
            'Marketing Accepted': `${marketingCount} (${((marketingCount / users.length) * 100).toFixed(1)}%)`,
        });

    } catch (error) {
        logger.error('Failed to seed consents:', error);
        throw error;
    }
}
