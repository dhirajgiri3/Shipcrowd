import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Setup Environment Fallback for Encryption Key (Required by Company Model)
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000';
process.env.FIELD_ENCRYPTION_SECRET = process.env.FIELD_ENCRYPTION_SECRET || process.env.ENCRYPTION_KEY;

import { Request, Response } from 'express';

// Mock Express
const mockRequest = (user: any, params: any = {}, body: any = {}) => ({
    user,
    params,
    body
} as unknown as Request);

const mockResponse = () => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.body = data;
        return res;
    };
    return res as Response;
};

const next = (err?: any) => {
    if (err) {
        console.error('❌ Controller Error:', err.message);
        throw err;
    }
};

async function verifyRateCardV2() {
    // Dynamic imports to ensure env vars are loaded first
    const mongoose = (await import('mongoose')).default;
    const { RateCard, Company } = await import('../src/infrastructure/database/mongoose/models');

    // Controller might be default export or named
    const controllerModule = await import('../src/presentation/http/controllers/shipping/ratecard.controller');
    const ratecardController = controllerModule.default || controllerModule;

    try {
        console.log('🔄 Connecting to Database...');
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('✅ Connected.');

        // 1. Setup Data
        const companyId = new mongoose.Types.ObjectId();
        const timestamp = Date.now();
        const originalName = `Original Card ${timestamp}`;

        // Mock User
        const user = { _id: new mongoose.Types.ObjectId(), companyId };

        console.log('\n--- 🧪 Test 1: Create Initial Rate Card ---');
        const rateCard = new RateCard({
            name: originalName,
            companyId,
            baseRates: [],
            status: 'active',
            effectiveDates: { startDate: new Date() }
        });
        await rateCard.save();
        console.log(`Created Rate Card: ${(rateCard as any)._id}`);

        // 2. Test Clone
        console.log('\n--- 🧪 Test 2: Clone Rate Card ---');
        const cloneReq = mockRequest(user, { id: (rateCard as any)._id.toString() });
        const cloneRes = mockResponse();

        if (typeof (ratecardController as any).cloneRateCard !== 'function') {
            throw new Error('cloneRateCard method not found on controller');
        }

        await (ratecardController as any).cloneRateCard(cloneReq, cloneRes, next);

        const clonedCard = (cloneRes as any).body?.data?.rateCard;
        const expectedName = `${originalName} (Copy)`;

        if (clonedCard && clonedCard.name === expectedName && clonedCard.status === 'draft') {
            console.log('✅ Clone Successful!');
            console.log(`   New ID: ${clonedCard._id}`);
            console.log(`   New Name: ${clonedCard.name}`);
            console.log(`   Status: ${clonedCard.status}`);
        } else {
            console.error('❌ Clone Failed:', clonedCard);
            process.exit(1);
        }

        // 3. Test Delete Protection
        console.log('\n--- 🧪 Test 3: Delete Protection (Safety Check) ---');

        // Assign original card to company
        const company = new Company({
            _id: companyId,
            name: `Test Company ${timestamp}`,
            settings: { defaultRateCardId: (rateCard as any)._id }
        });
        await company.save({ validateBeforeSave: false }); // Skip other validation
        console.log('Assigned Rate Card to Company as Default.');

        const deleteReq = mockRequest(user, { id: (rateCard as any)._id.toString() });
        const deleteRes = mockResponse();

        try {
            await (ratecardController as any).deleteRateCard(deleteReq, deleteRes, next);
            console.error('❌ Delete should have failed but succeeded!');
            process.exit(1);
        } catch (error: any) {
            if (error.message.includes('currently assigned')) {
                console.log('✅ Delete Protection Working! Error caught expectedly:');
                console.log(`   "${error.message}"`);
            } else {
                console.error('❌ Unexpected Error during delete:', error);
                throw error;
            }
        }

        // 4. Test Successful Delete
        console.log('\n--- 🧪 Test 4: Successful Delete (After Unassigning) ---');

        // Unassign from company
        await Company.findByIdAndUpdate(companyId, {
            $unset: { 'settings.defaultRateCardId': 1 }
        });
        console.log('Unassigned Rate Card.');

        await (ratecardController as any).deleteRateCard(deleteReq, deleteRes, next);

        const deletedCard = await RateCard.findById((rateCard as any)._id);
        if (deletedCard?.isDeleted) {
            console.log('✅ Delete Successful (Soft Delete Verified).');
        } else {
            console.error('❌ Rate card not marked as deleted!');
            process.exit(1);
        }

        // Cleanup
        await RateCard.deleteMany({ companyId });
        await Company.findByIdAndDelete(companyId);

        console.log('\n🎉 All V2 Verifications Passed!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Verification Failed:', error);
        process.exit(1);
    }
}

// Run verification
verifyRateCardV2();
