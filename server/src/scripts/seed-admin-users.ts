/**
 * Seed Admin Test Users
 * 
 * Creates 2 complete admin users for testing:
 * 1. Super Admin - Full platform access
 * 2. Admin - Regular admin access
 * 
 * Usage:
 *   npx tsx src/scripts/seed-admin-users.ts
 * 
 * Credentials:
 *   Super Admin: superadmin@shipcrowd.com / SuperAdmin@123456
 *   Admin: admin@shipcrowd.com / Admin@123456
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load environment variables FIRST with explicit path
// src/scripts -> src -> server
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Setup Environment Fallback for Encryption Key (Required by User Model)
// Generate a valid 64-character hex key (32 bytes = 64 hex characters)
const DEFAULT_ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || DEFAULT_ENCRYPTION_KEY;
process.env.FIELD_ENCRYPTION_SECRET = process.env.FIELD_ENCRYPTION_SECRET || process.env.ENCRYPTION_KEY;

// Admin user credentials
const ADMIN_USERS = [
    {
        email: 'superadmin@shipcrowd.com',
        password: 'SuperAdmin@123456',
        name: 'Shipcrowd Super Admin',
        role: 'super_admin' as const,
        bio: 'Platform Super Administrator with full system access',
        phone: '+91-9876543210',
    },
    {
        email: 'admin@shipcrowd.com',
        password: 'Admin@123456',
        name: 'Shipcrowd Admin',
        role: 'admin' as const,
        bio: 'Platform Administrator',
        phone: '+91-9876543211',
    },
];

/**
 * Create admin users
 */
async function createAdminUsers(): Promise<void> {
    // Dynamic imports to ensure env vars are loaded first
    const mongoose = (await import('mongoose')).default;
    const bcrypt = (await import('bcrypt')).default;
    const { User, Role } = await import('../infrastructure/database/mongoose/models');

    console.log('\n' + '🌱 '.repeat(30));
    console.log('   SHIPCROWD ADMIN USER SEEDER');
    console.log('🌱 '.repeat(30) + '\n');

    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';
        console.log(`🔌 Connecting to MongoDB...`);
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        console.log('👤 Creating Admin Users...\n');

        // Check Roles
        const superAdminRole = await Role.findOne({ name: 'super_admin', scope: 'global' }) as (typeof Role.prototype & { _id: mongoose.Types.ObjectId }) | null;
        const adminRole = await Role.findOne({ name: 'admin', scope: 'global' }) as (typeof Role.prototype & { _id: mongoose.Types.ObjectId }) | null;

        if (!superAdminRole || !adminRole) {
            console.log('DEBUG: Role fetch failed.');
            console.log('DEBUG: Mongoose Connection State:', mongoose.connection.readyState);
            console.log('DEBUG: Role Model Connection State:', Role.db.readyState);
            console.log('DEBUG: Role Model DB Name:', Role.db.name);
            console.log('DEBUG: Role Model Collection Name:', Role.collection.name);

            const allRoles = await Role.find({});
            console.log('DEBUG: All Roles found:', JSON.stringify(allRoles, null, 2));

            throw new Error('❌ Global roles not found. Please run role migration first.');
        }

        const salt = await bcrypt.genSalt(12);

        for (const adminData of ADMIN_USERS) {
            try {
                // Check if user already exists
                let user = await User.findOne({ email: adminData.email });

                if (user) {
                    console.log(`🔄 User ${adminData.email} exists. Updating password/role...`);
                    // Update fields
                    user.password = adminData.password; // Model pre-save hook will hash this
                    user.name = adminData.name;
                    user.role = adminData.role;
                    // Determine platform role (needed for updates too)
                    const platformRole = adminData.role === 'super_admin' ? superAdminRole._id : adminRole._id;
                    user.platformRole = platformRole;

                    await user.save();
                    console.log(`✅ Updated ${adminData.email}\n`);
                    continue;
                }

                // Determine platform role
                const platformRole = adminData.role === 'super_admin' ? superAdminRole._id : adminRole._id;

                // Create user
                // Model pre-save hook will hash the password
                user = await User.create({
                    email: adminData.email,
                    password: adminData.password, // Pass PLAIN password
                    name: adminData.name,
                    role: adminData.role,
                    platformRole,
                    isEmailVerified: true,
                    oauthProvider: 'email',
                    profile: {
                        phone: adminData.phone,
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        country: 'India',
                        postalCode: '400001',
                        gender: 'other',
                        timezone: 'Asia/Kolkata',
                        preferredCurrency: 'INR',
                        bio: adminData.bio,
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
                    security: {
                        tokenVersion: 0,
                        trustedDevices: [],
                        twoFactorAuth: {
                            enabled: false,
                        },
                        recoveryOptions: {
                            recoveryEmail: null,
                            recoveryPhone: null,
                        },
                    },
                    isActive: true,
                    isDeleted: false,
                    anonymized: false,
                });

                console.log(`✅ Created ${adminData.role}: ${adminData.email}`);
                console.log(`   Name: ${adminData.name}`);
                console.log(`   Password: ${adminData.password}`);
                console.log(`   Role: ${adminData.role}`);
                console.log(`   ID: ${user._id}\n`);

            } catch (error: any) {
                console.error(`❌ Failed to create ${adminData.email}:`, error.message);
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📋 ADMIN USER CREDENTIALS');
        console.log('='.repeat(60));

        ADMIN_USERS.forEach((admin, index) => {
            console.log(`\n${index + 1}. ${admin.role.toUpperCase().replace('_', ' ')}`);
            console.log(`   Email:    ${admin.email}`);
            console.log(`   Password: ${admin.password}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('💡 TIP: Save these credentials for testing admin features');
        console.log('='.repeat(60) + '\n');

        console.log('✅ Admin user seeding completed successfully!\n');

    } catch (error: any) {
        console.error('\n❌ Seeding failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB\n');
    }
}

// Run the script
createAdminUsers().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
