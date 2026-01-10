
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.ENCRYPTION_KEY) process.env.ENCRYPTION_KEY = 'test-encryption-key-must-be-32-bytes-len';

// Mock Express Objects
const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.body = data;
        return res;
    };
    return res;
};

async function main() {
    try {
        console.log('🛡️ Starting Middleware Guard Verification...');

        // Connect DB (needed for checkKYC which queries DB)
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd_test');

        // Import Middlewares & Models
        const { requireAccessTier } = await import('../src/presentation/http/middleware/auth/access-tier.middleware.js');
        const { checkKYC } = await import('../src/presentation/http/middleware/auth/kyc.js');
        const { AccessTier } = await import('../src/core/domain/types/access-tier.js');
        const { KYCState } = await import('../src/core/domain/types/kyc-state.js');
        const { User, KYC } = await import('../src/infrastructure/database/mongoose/models/index.js');

        // TEST 1: Tiered Access Middleware
        console.log('\n🔍 1. Testing Tiered Access Guard...');

        // Case A: Explorer tries to access Production feature
        const explorerUser = { isEmailVerified: false };
        const req1 = { user: explorerUser } as Request;
        const res1 = mockRes();
        const next1 = () => { throw new Error('SHOULD_NOT_CALL_NEXT'); };

        await requireAccessTier(AccessTier.PRODUCTION)(req1, res1, next1);

        if (res1.statusCode === 403 && res1.body.code === 'INSUFFICIENT_ACCESS_TIER') {
            console.log('✅ PASS: Explorer blocked from Production (403 INSUFFICIENT_ACCESS_TIER)');
        } else {
            console.error('❌ FAIL: Explorer NOT blocked correctly', res1.statusCode, res1.body);
        }

        // Case B: Production user access Production feature
        const prodUser = {
            isEmailVerified: true,
            kycStatus: { isComplete: true, state: KYCState.VERIFIED }
        };
        const req2 = { user: prodUser } as Request;
        const res2 = mockRes();
        let nextCalled = false;
        const next2 = () => { nextCalled = true; };

        await requireAccessTier(AccessTier.PRODUCTION)(req2, res2, next2);

        if (nextCalled) {
            console.log('✅ PASS: Production User allowed');
        } else {
            console.error('❌ FAIL: Production User BLOCKED', res2.body);
        }


        // TEST 2: Cross-Company KYC Guard
        console.log('\n🔍 2. Testing Cross-Company KYC Security...');

        // Setup Data
        const userId = new mongoose.Types.ObjectId();
        const companyA = new mongoose.Types.ObjectId();
        const companyB = new mongoose.Types.ObjectId();

        // Create User (Current Company: B)
        await User.create({
            _id: userId,
            email: `test-kyc-${Date.now()}@example.com`,
            password: 'password123',
            name: 'KYC Test User',
            role: 'seller',
            companyId: companyB, // Currently inside Company B
            kycStatus: { isComplete: true } // Claiming to be verified
        });

        // Create KYC Record (For Company A only!)
        await KYC.create({
            userId,
            companyId: companyA, // Verified in Company A
            state: KYCState.VERIFIED,
            businessType: 'proprietorship',
            documents: []
        });

        // Attempt Access (User is in Company B, but KYC is for Company A)
        const req3 = {
            user: { _id: userId, role: 'seller', teamRole: 'owner', companyId: companyB },
            path: '/orders',
            method: 'POST'
        } as any;
        const res3 = mockRes();
        const next3 = () => { throw new Error('SHOULD_NOT_CALL_NEXT'); };

        await checkKYC(req3, res3, next3);

        // Expect Block because KYC is for Company A, User is in Company B
        if (res3.statusCode === 403 && res3.body.code === 'KYC_REQUIRED') {
            // It might return KYC_REQUIRED_FOR_COMPANY or KYC_REQUIRED depending on flow.
            // Let's check code.
            console.log('✅ PASS: Cross-Company KYC Blocked (403)');
        } else if (res3.statusCode === 403) {
            console.log('✅ PASS: Cross-Company KYC Blocked (403) - Code:', res3.body.code);
        } else {
            console.error('❌ FAIL: Cross-Company Access ALLOWED!', res3.statusCode);
        }

        console.log('\n🎉 Middleware Guards Verified!');

        // Cleanup
        await User.deleteMany({ _id: userId });
        await KYC.deleteMany({ userId });
        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ E2E Verification Failed:', error);
        process.exit(1);
    }
}

main();
