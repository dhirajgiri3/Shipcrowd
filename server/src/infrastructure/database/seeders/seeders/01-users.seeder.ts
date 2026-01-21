/**
 * Users Seeder
 * 
 * Generates admin (5), seller (100-120), and staff (45-75) users.
 */

import bcrypt from 'bcrypt';
import User from '../../mongoose/models/iam/users/user.model';
import { SEED_CONFIG } from '../config';
import { randomInt, selectRandom, selectWeightedFromObject } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { generateIndianName, generateIndianPhone, generateEmail, generateGender } from '../data/customer-names';
import { INDIAN_CITIES, selectWeightedCity, getCityByName, CityData } from '../data/indian-cities';

// Default passwords (hashed)
const DEFAULT_PASSWORDS = {
    admin: 'Admin@123456',
    seller: 'Seller@123456',
    staff: 'Staff@123456',
};

// Business domains for sellers
const BUSINESS_DOMAINS = [
    'fashionhub.com', 'stylestore.in', 'techgalaxy.com', 'electromart.in',
    'wholesale-traders.com', 'b2bsupply.in', 'onlineshop.com', 'ecommerce.in',
    'retailzone.com', 'shopmart.in', 'megastore.com', 'supermarket.in',
    'modernwear.com', 'trendyfashion.in', 'gadgetworld.com', 'electronicsplus.in',
];

// Team roles for staff
const TEAM_ROLES = ['admin', 'manager', 'member', 'viewer'];

/**
 * Generate a Google OAuth ID (simulated)
 */
function generateGoogleId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Generate admin user data
 */
async function generateAdminUser(index: number, hashedPassword: string) {
    const gender = generateGender();
    const name = generateIndianName(gender);
    const city = selectRandom(INDIAN_CITIES.metro);

    return {
        email: `admin${index + 1}@Helix.com`,
        password: hashedPassword,
        name,
        role: 'admin',
        isEmailVerified: true,
        oauthProvider: 'email',
        profile: {
            phone: generateIndianPhone(),
            city: city.name,
            state: city.state,
            country: 'India',
            postalCode: selectRandom(city.pincodes),
            gender,
            timezone: 'Asia/Kolkata',
            preferredCurrency: 'INR',
            bio: 'Helix Admin',
        },
        profileCompletion: {
            status: 100,
            requiredFieldsCompleted: true,
            lastUpdated: new Date(),
        },
        kycStatus: {
            isComplete: true,
            lastUpdated: new Date(),
        },
        isActive: true,
        isDeleted: false,
        anonymized: false,
    };
}

/**
 * Generate seller user data
 */
async function generateSellerUser(index: number, hashedPassword: string) {
    const gender = generateGender();
    const name = generateIndianName(gender);
    const city = selectWeightedCity();
    const isOAuth = Math.random() < (SEED_CONFIG.oauthDistribution.google / 100);
    const domain = selectRandom(BUSINESS_DOMAINS);

    return {
        email: `seller${index + 1}@${domain}`,
        password: hashedPassword,
        name,
        role: 'seller',
        teamRole: 'owner',
        teamStatus: 'active',
        isEmailVerified: true,
        oauthProvider: isOAuth ? 'google' : 'email',
        googleId: isOAuth ? generateGoogleId() : undefined,
        oauth: isOAuth ? {
            google: {
                id: generateGoogleId(),
                email: `seller${index + 1}@gmail.com`,
                name,
            },
        } : undefined,
        profile: {
            phone: generateIndianPhone(),
            city: city.name,
            state: city.state,
            country: 'India',
            postalCode: selectRandom(city.pincodes),
            gender,
            timezone: 'Asia/Kolkata',
            preferredCurrency: 'INR',
            website: `https://www.${domain}`,
            bio: `E-commerce seller based in ${city.name}`,
        },
        profileCompletion: {
            status: randomInt(SEED_CONFIG.profileCompletion.seller.min, SEED_CONFIG.profileCompletion.seller.max),
            requiredFieldsCompleted: true,
            lastUpdated: new Date(),
        },
        kycStatus: {
            isComplete: true,
            lastUpdated: new Date(Date.now() - randomInt(30, 365) * 24 * 60 * 60 * 1000),
        },
        isActive: true,
        isDeleted: false,
        anonymized: false,
    };
}

/**
 * Generate staff user data
 */
async function generateStaffUser(index: number, hashedPassword: string) {
    const gender = generateGender();
    const name = generateIndianName(gender);
    const city = selectWeightedCity();
    const isActive = Math.random() < (SEED_CONFIG.teamStatus.active / 100);
    const domain = selectRandom(BUSINESS_DOMAINS);

    return {
        email: `staff${index + 1}@${domain}`,
        password: hashedPassword,
        name,
        role: 'staff',
        teamRole: selectRandom(TEAM_ROLES),
        teamStatus: isActive ? 'active' : 'invited',
        isEmailVerified: isActive,
        oauthProvider: 'email',
        profile: {
            phone: generateIndianPhone(),
            city: city.name,
            state: city.state,
            country: 'India',
            postalCode: selectRandom(city.pincodes),
            gender,
            timezone: 'Asia/Kolkata',
            preferredCurrency: 'INR',
        },
        profileCompletion: {
            status: randomInt(SEED_CONFIG.profileCompletion.staff.min, SEED_CONFIG.profileCompletion.staff.max),
            requiredFieldsCompleted: isActive,
            lastUpdated: new Date(),
        },
        kycStatus: {
            isComplete: false,
        },
        isActive,
        isDeleted: false,
        anonymized: false,
    };
}

/**
 * Main seeder function
 */
export async function seedUsers(): Promise<void> {
    const timer = createTimer();
    logger.step(1, 'Seeding Users');

    try {
        // Hash passwords once
        const salt = await bcrypt.genSalt(12);
        const hashedPasswords = {
            admin: await bcrypt.hash(DEFAULT_PASSWORDS.admin, salt),
            seller: await bcrypt.hash(DEFAULT_PASSWORDS.seller, salt),
            staff: await bcrypt.hash(DEFAULT_PASSWORDS.staff, salt),
        };

        const users: any[] = [];

        // Generate admin users
        const adminCount = SEED_CONFIG.volume.users.admin;
        for (let i = 0; i < adminCount; i++) {
            users.push(await generateAdminUser(i, hashedPasswords.admin));
            logger.progress(i + 1, adminCount, 'Admin Users');
        }

        // Generate seller users
        const sellerCount = randomInt(
            SEED_CONFIG.volume.users.sellers.min,
            SEED_CONFIG.volume.users.sellers.max
        );
        for (let i = 0; i < sellerCount; i++) {
            users.push(await generateSellerUser(i, hashedPasswords.seller));
            if ((i + 1) % 20 === 0 || i === sellerCount - 1) {
                logger.progress(i + 1, sellerCount, 'Seller Users');
            }
        }

        // Generate staff users
        const staffCount = randomInt(
            SEED_CONFIG.volume.users.staff.min,
            SEED_CONFIG.volume.users.staff.max
        );
        for (let i = 0; i < staffCount; i++) {
            users.push(await generateStaffUser(i, hashedPasswords.staff));
            if ((i + 1) % 20 === 0 || i === staffCount - 1) {
                logger.progress(i + 1, staffCount, 'Staff Users');
            }
        }

        // Insert all users
        await User.insertMany(users);

        logger.complete('users', users.length, timer.elapsed());
        logger.table({
            'Admin Users': adminCount,
            'Seller Users': sellerCount,
            'Staff Users': staffCount,
            'Total Users': users.length,
        });

    } catch (error) {
        logger.error('Failed to seed users:', error);
        throw error;
    }
}

/**
 * Get seeded seller users (for linking with companies)
 */
export async function getSellerUsers() {
    return User.find({ role: 'seller', teamRole: 'owner' }).lean();
}

/**
 * Get seeded users by role
 */
export async function getUsersByRole(role: 'admin' | 'seller' | 'staff') {
    return User.find({ role }).lean();
}
