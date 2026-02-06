/**
 * Verify User Debug Script
 * 
 * Checks if a specific user exists in the database and verifies their password.
 * 
 * Usage:
 *   npx tsx src/scripts/verify-user-debug.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TARGET_EMAIL = 'superadmin@shipcrowd.com';
const TARGET_PASSWORD = 'SuperAdmin@123456';

async function verifyUser() {
    // Dynamic imports
    const mongoose = (await import('mongoose')).default;
    const bcrypt = (await import('bcrypt')).default;
    const { User } = await import('../infrastructure/database/mongoose/models');

    console.log('\n🔍 VERIFYING USER:', TARGET_EMAIL);
    console.log('----------------------------------------');

    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';
        console.log(`🔌 Connecting to MongoDB (${mongoUri.replace(/:[^:@]+@/, ':****@')})...`);
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // 1. Check if user exists
        const user = await User.findOne({ email: TARGET_EMAIL });

        if (!user) {
            console.error('❌ ERROR: User NOT found in database.');

            // List all users to see what's there
            const allUsers = await User.find({}, 'email role name');
            console.log('\n📋 Existing Users:');
            if (allUsers.length === 0) {
                console.log('   (No users found in database)');
            } else {
                allUsers.forEach(u => console.log(`   - ${u.email} (${u.role})`));
            }

            console.log('\n💡 SUGGESTION: Run seed script: npx tsx src/scripts/seed-admin-users.ts');
            return;
        }

        console.log('✅ User found:');
        console.log(`   ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.isActive ? 'Active' : 'Inactive'}`);

        // 2. Verify Password
        if (!user.password) {
            console.error('❌ ERROR: User has NO password set.');
            return;
        }

        const isMatch = await bcrypt.compare(TARGET_PASSWORD, user.password);

        if (isMatch) {
            console.log('\n✅ PASSWORD VERIFIED: The credentials are correct.');
        } else {
            console.error('\n❌ PASSWORD MISMATCH: The password in DB does not match the provided password.');
            console.log('   Stored Hash:', user.password.substring(0, 20) + '...');
        }

    } catch (error: any) {
        console.error('\n❌ Script failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected');
    }
}

verifyUser().catch(console.error);
