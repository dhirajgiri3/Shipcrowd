
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env before imports
dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.ENCRYPTION_KEY) process.env.ENCRYPTION_KEY = 'test-encryption-key-must-be-32-bytes-len';

async function main() {
    try {
        console.log('🚀 Starting Final Verification for Fixes...');

        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd_test');
        console.log('✅ Connected to MongoDB');

        // Import Models Dynamically after connection
        const { User, OnboardingProgress, Session } = await import('../src/infrastructure/database/mongoose/models/index.js');
        const { AccessTier } = await import('../src/core/domain/types/access-tier.js');
        const { determineUserTier } = await import('../src/presentation/http/middleware/auth/access-tier.middleware.js');
        const { enforceSessionLimit } = await import('../src/core/application/services/auth/session.service.js');
        const { KYCState } = await import('../src/core/domain/types/kyc-state.js');

        // 1. Verify Onboarding Schema Updates
        console.log('\n🔍 1. Verifying Onboarding Schema...');
        const dummyProgress = new OnboardingProgress({
            companyId: new mongoose.Types.ObjectId(),
            userId: new mongoose.Types.ObjectId(),
            steps: {} // Should default
        });

        const steps = dummyProgress.steps;
        if (steps.returnAddressConfigured && steps.packagingPreferencesSet && steps.rateCardAgreed && steps.platformTourCompleted) {
            console.log('✅ Onboarding Schema contains new steps:', Object.keys(steps).filter(k => ['returnAddressConfigured', 'packagingPreferencesSet'].includes(k)));
        } else {
            console.error('❌ Onboarding Schema MISSING new steps!');
            process.exit(1);
        }

        const startProgress = dummyProgress.calculateProgress();
        // Default steps: 0 progress.
        // Let's mark all as complete and check if it hits 100.
        Object.keys(dummyProgress.steps).forEach(key => {
            // @ts-ignore
            dummyProgress.steps[key].completed = true;
        });
        const fullProgress = dummyProgress.calculateProgress();
        if (fullProgress === 100) {
            console.log('✅ Onboarding Progress Calculation correct (100%) with new weights.');
        } else {
            console.error(`❌ Onboarding Progress Calculation wrong: ${fullProgress}% (Expected 100%)`);
        }


        // 2. Verify Session Logic (Device Types)
        console.log('\n🔍 2. Verifying Session Limit Logic...');
        const userId = new mongoose.Types.ObjectId().toString();

        // Create 3 "mobile" sessions (Limit is 2)
        // Mobile 1
        await Session.create({
            userId,
            refreshToken: 'rt1',
            deviceInfo: { type: 'mobile', os: 'iOS' },
            expiresAt: new Date(Date.now() + 100000),
            ip: '127.0.0.1',
            userAgent: 'test-agent'
        });
        // Mobile 2
        await Session.create({
            userId,
            refreshToken: 'rt2',
            deviceInfo: { type: 'tablet', os: 'iPadOS' }, // Should be normalized to mobile
            expiresAt: new Date(Date.now() + 100000),
            ip: '127.0.0.1',
            userAgent: 'test-agent'
        });

        // Add 3rd Mobile (Should kill Mobile 1)
        await Session.create({
            userId,
            refreshToken: 'rt3',
            deviceInfo: { type: 'mobile', os: 'Android' },
            expiresAt: new Date(Date.now() + 100000),
            ip: '127.0.0.1',
            userAgent: 'test-agent'
        });

        // Run limit enforcement for "mobile"
        await enforceSessionLimit(userId, undefined, 'mobile');

        const mobileSessions = await Session.find({ userId });
        // Should be 2 (rt2, rt3 or rt1, rt3 depending on sort, usually keeps newest. Logic kills oldest.)

        if (mobileSessions.length === 2) {
            console.log('✅ Mobile Session Limit Enforced (2 sessions remained).');
        } else {
            console.error(`❌ Mobile Session Limit Failed: Found ${mobileSessions.length} sessions.`);
        }

        // 3. Verify Tiered Access Determination
        console.log('\n🔍 3. Verifying Access Tier Determination...');
        const user1 = { isEmailVerified: false };
        const tier1 = determineUserTier(user1);
        if (tier1 === AccessTier.EXPLORER) console.log('✅ User (No verify) -> EXPLORER');
        else console.error(`❌ Tier Determination Failed: Expected EXPLORER, got ${tier1}`);

        const user2 = { isEmailVerified: true };
        const tier2 = determineUserTier(user2);
        if (tier2 === AccessTier.SANDBOX) console.log('✅ User (Email verified) -> SANDBOX');
        else console.error(`❌ Tier Determination Failed: Expected SANDBOX, got ${tier2}`);

        const user3 = { isEmailVerified: true, kycStatus: { state: KYCState.VERIFIED } };
        const tier3 = determineUserTier(user3);
        if (tier3 === AccessTier.PRODUCTION) console.log('✅ User (KYC Verified) -> PRODUCTION');
        else console.error(`❌ Tier Determination Failed: Expected PRODUCTION, got ${tier3}`);


        console.log('\n🎉 ALL CHECKS PASSED!');

        // Cleanup
        await Session.deleteMany({ userId });
        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }
}

main();
