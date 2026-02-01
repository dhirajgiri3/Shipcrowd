
import dotenv from 'dotenv';
import path from 'path';

// Load env variables immediately
dotenv.config({ path: path.join(__dirname, '../.env') });

// Setup Environment Fallbacks
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000';
// Use dynamic imports to ensure env vars are loaded first
import mongoose from 'mongoose';

async function verifyFrontendAlignment() {
    try {
        // Dynamic Imports
        const { default: connectDB } = await import('../src/config/database');
        const { default: logger } = await import('../src/shared/logger/winston.logger');
        const { RateCard } = await import('../src/infrastructure/database/mongoose/models');
        const { default: RateCardImportService } = await import('../src/core/application/services/pricing/rate-card-import.service');
        const { default: PricingOrchestratorService } = await import('../src/core/application/services/pricing/pricing-orchestrator.service');
        const { default: PincodeLookupService } = await import('../src/core/application/services/logistics/pincode-lookup.service');

        const TEST_COMPANY_ID = new mongoose.Types.ObjectId('65b90f42587747e9b0d23824'); // Reuse existing or mock
        const TEST_USER_ID = new mongoose.Types.ObjectId();

        await connectDB();
        logger.info('Connected to DB');

        // Initialize Pincodes for GST Calculation
        await PincodeLookupService.loadPincodesFromCSV();
        logger.info('Pincode Cache Loaded');

        // 1. Prepare Dummy CSV
        // Header: Name,Carrier,Service Type,Base Price,Min Weight,Max Weight,Zone,Zone Price
        const csvContent = `Name,Carrier,Service Type,Base Price,Min Weight,Max Weight,Zone,Zone Price,Status
"Frontend Verify Card",TejasExpress,Surface,50,0,50,A,10,active`;

        const buffer = Buffer.from(csvContent);

        // 2. Simulate Import with Overrides (The functionality Frontend uses)
        logger.info('Step 1: Importing Rate Card with V2 Overrides (Fuel=15%, Version=v2.5, Locked=true)');

        await RateCard.deleteMany({ name: 'Frontend Verify Card' });

        const overrides = {
            fuelSurcharge: 15,
            fuelSurchargeBase: 'freight',
            minimumCall: 100, // Min call charge
            version: 'v2.5',
            isLocked: true
        };

        const result = await RateCardImportService.importRateCards(
            String(TEST_COMPANY_ID),
            buffer,
            'text/csv',
            String(TEST_USER_ID),
            { user: { _id: TEST_USER_ID, companyId: TEST_COMPANY_ID } }, // Mock Req
            { overrides }
        );

        console.log('Import Result:', result);

        // 3. Verify Document
        const rateCard = await RateCard.findOne({ name: 'Frontend Verify Card' });
        if (!rateCard) throw new Error('Rate Card not found after import');

        // FORCE LINK TO COMPANY (Required for PricingOrchestrator)
        const { default: Company } = await import('../src/infrastructure/database/mongoose/models/organization/core/company.model');
        const updateResult = await Company.updateOne(
            { _id: TEST_COMPANY_ID },
            {
                $set: {
                    name: `Test Company ${TEST_COMPANY_ID}`, // Unique name to avoid collision
                    status: 'active',
                    'settings.defaultRateCardId': rateCard._id
                }
            },
            { upsert: true }
        );
        logger.info(`Linked Rate Card to Company: Valid=${updateResult.acknowledged}, Modified=${updateResult.modifiedCount}, Matched=${updateResult.matchedCount}, Upserted=${updateResult.upsertedId}`);

        const companyCheck = await Company.findById(TEST_COMPANY_ID).lean();
        console.log('Company Settings:', companyCheck?.settings);

        console.log('Rate Card State:', {
            version: rateCard.version,
            fuel: rateCard.fuelSurcharge,
            minCall: rateCard.minimumCall,
            locked: rateCard.isLocked
        });

        if (rateCard.version !== 'v2.5') throw new Error('Version mismatch');
        if (rateCard.fuelSurcharge !== 15) throw new Error('Fuel Surcharge mismatch');
        if (rateCard.minimumCall !== 100) throw new Error('Min Call mismatch');
        if (rateCard.isLocked !== true) throw new Error('Lock status mismatch');

        logger.info('✅ Rate Card stored correctly with V2 fields');

        // 4. Verify Pricing Impact (Price Preview Logic)
        logger.info('Step 2: Running Price Preview (Calculation)');

        const price = await PricingOrchestratorService.calculateShipmentPricing({
            companyId: String(TEST_COMPANY_ID),
            fromPincode: '110001',
            toPincode: '400001',
            weight: 1,
            dimensions: { length: 10, width: 10, height: 10 },
            paymentMode: 'prepaid',
            orderValue: 500,
            carrier: 'TejasExpress',
            serviceType: 'Surface'
        });

        console.log('Price Breakdown:', {
            base: price.baseRate,
            zone: price.zoneCharge,
            totalPreTax: price.baseRate + price.zoneCharge, // 50 + 10 = 60
            fuelWait: (50 + 10) * 0.15, // 9
            actualTotal: price.totalPrice
        });

        // Current Logic: 
        // Base (50) + Zone (10) = 60
        // Fuel = 15% of 60 = 9
        // Subtotal = 69
        // MinCall Check: 100
        // So Subtotal should be adjusted to 100? Or is minCall processed on Base?
        // Let's see what the Breakdown returns.

        // Expected: Subtotal >= 100.
        // Actually MinCall usually applies to Freight+Fuel. 
        // If 69 < 100, then Final Freight should be 100.

        // Wait, let's check the Service response structure for Metadata/Warnings?
        // Or if the final subtotal reflects it.

        // Actually, PricingOrchestrator might not enforce MinCall inside `calculateShipmentPricing` 
        // unless logic was added there (it was added in `DynamicPricingService`).

        // Let's verify the numbers.

        logger.info('✅ Verification Script Complete');

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verifyFrontendAlignment();
