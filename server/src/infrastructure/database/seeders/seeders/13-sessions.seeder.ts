/**
 * Sessions Seeder
 * 
 * Generates user sessions (2-5 per user over time).
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Session from '../../mongoose/models/iam/users/session.model';
import User from '../../mongoose/models/iam/users/user.model';
import { SEED_CONFIG } from '../config';
import { randomInt, selectRandom, generateUUID } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { subDays, addDays, randomDateBetween, addHours } from '../utils/date.utils';

// User agents for variety
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (iPad; CPU OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
];

// Device types
const DEVICE_TYPES = ['desktop', 'mobile', 'tablet'];

// Browsers
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];

// Operating systems
const OPERATING_SYSTEMS = ['Windows 10', 'Windows 11', 'macOS', 'iOS', 'Android', 'Linux'];

// Indian cities for location
const LOCATIONS = [
    { city: 'Mumbai', region: 'Maharashtra', country: 'India' },
    { city: 'Delhi', region: 'Delhi', country: 'India' },
    { city: 'Bangalore', region: 'Karnataka', country: 'India' },
    { city: 'Hyderabad', region: 'Telangana', country: 'India' },
    { city: 'Chennai', region: 'Tamil Nadu', country: 'India' },
    { city: 'Kolkata', region: 'West Bengal', country: 'India' },
    { city: 'Pune', region: 'Maharashtra', country: 'India' },
    { city: 'Jaipur', region: 'Rajasthan', country: 'India' },
];

/**
 * Generate a random IP address
 */
function generateIP(): string {
    // Generate a realistic Indian IP (simplified)
    return `${selectRandom(['103', '106', '122', '157', '182', '223'])}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

/**
 * Generate device info
 */
function generateDeviceInfo(): any {
    const deviceType = selectRandom(DEVICE_TYPES);

    return {
        type: deviceType,
        browser: selectRandom(BROWSERS),
        os: selectRandom(OPERATING_SYSTEMS),
        deviceName: deviceType === 'mobile'
            ? selectRandom(['iPhone 15', 'Samsung S24', 'Pixel 8', 'OnePlus 12', 'Xiaomi 14'])
            : deviceType === 'tablet'
                ? selectRandom(['iPad Pro', 'Samsung Tab', 'iPad Air'])
                : selectRandom(['Windows PC', 'MacBook Pro', 'iMac', 'Dell XPS']),
    };
}

/**
 * Generate session data for a user
 */
async function generateSessionData(
    user: any,
    sessionIndex: number,
    hashedToken: string,
    sessionDate: Date
): Promise<any> {
    const isRevoked = Math.random() < 0.3; // 30% of sessions are revoked/expired
    const expiresAt = addDays(sessionDate, 7);

    return {
        userId: user._id,
        refreshToken: hashedToken,
        userAgent: selectRandom(USER_AGENTS),
        ip: generateIP(),
        deviceInfo: generateDeviceInfo(),
        location: selectRandom(LOCATIONS),
        lastActive: isRevoked
            ? randomDateBetween(sessionDate, addDays(sessionDate, 3))
            : addHours(new Date(), -randomInt(0, 48)),
        expiresAt,
        isRevoked,
        createdAt: sessionDate,
        updatedAt: isRevoked ? addDays(sessionDate, randomInt(1, 5)) : new Date(),
    };
}

/**
 * Main seeder function
 */
export async function seedSessions(): Promise<void> {
    const timer = createTimer();
    logger.step(13, 'Seeding Sessions');

    try {
        // Get all users
        const users = await User.find({ isActive: true, isDeleted: false }).lean();

        if (users.length === 0) {
            logger.warn('No active users found. Skipping sessions seeder.');
            return;
        }

        const sessions: any[] = [];
        const salt = await bcrypt.genSalt(12);

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const sessionCount = randomInt(
                SEED_CONFIG.volume.sessionsPerUser.min,
                SEED_CONFIG.volume.sessionsPerUser.max
            );

            for (let j = 0; j < sessionCount; j++) {
                // Generate refresh token and hash it
                const rawToken = generateUUID();
                const hashedToken = await bcrypt.hash(rawToken, salt);

                // Session date (spread over last 30 days)
                const sessionDate = randomDateBetween(
                    subDays(new Date(), 30),
                    new Date()
                );

                const sessionData = await generateSessionData(user, j, hashedToken, sessionDate);
                sessions.push(sessionData);
            }

            if ((i + 1) % 50 === 0 || i === users.length - 1) {
                logger.progress(i + 1, users.length, 'Users processed');
            }
        }

        // Insert in batches
        const batchSize = 500;
        for (let i = 0; i < sessions.length; i += batchSize) {
            const batch = sessions.slice(i, i + batchSize);
            await Session.insertMany(batch);
        }

        // Statistics
        const activeSessions = sessions.filter(s => !s.isRevoked).length;
        const revokedSessions = sessions.filter(s => s.isRevoked).length;
        const avgPerUser = (sessions.length / users.length).toFixed(1);

        logger.complete('sessions', sessions.length, timer.elapsed());
        logger.table({
            'Total Sessions': sessions.length,
            'Active Sessions': activeSessions,
            'Revoked Sessions': revokedSessions,
            'Users with Sessions': users.length,
            'Avg per User': avgPerUser,
        });

    } catch (error) {
        logger.error('Failed to seed sessions:', error);
        throw error;
    }
}
