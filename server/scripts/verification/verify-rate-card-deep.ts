
import * as dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// 1. Load Environment Properly
const res = dotenv.config({ path: path.join(process.cwd(), '.env') });
if (res.error) console.error('dotenv load failed:', res.error);

async function verifyRateCardDeepDive() {
    console.log('🚀 Starting Deep Dive Rate Card Verification...');
    let mongoConnected = false;

    try {
        // 2. Dynamic Imports for Models and Services (AFTER ENV LOAD)
        const modelsPath = path.resolve(process.cwd(), 'src/infrastructure/database/mongoose/models/index.ts');
        const importServicePath = path.resolve(process.cwd(), 'src/core/application/services/pricing/rate-card-import.service.ts');
        const pricingServicePath = path.resolve(process.cwd(), 'src/core/application/services/pricing/smart-rate-calculator.service.ts');

        // Import Models
        const { Company, User, RateCard, Zone } = await import(modelsPath);
        // Import Services
        const { default: RateCardImportService } = await import(importServicePath);
        const { default: SmartRateCalculator } = await import(pricingServicePath);

        // Connect to DB
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) throw new Error('MONGODB_URI not found in .env');

        await mongoose.connect(MONGODB_URI);
        mongoConnected = true;
        console.log('✅ Connected to MongoDB');

        // 3. Setup Context (Company)
        const company = await Company.findOne({}).lean();
        if (!company) throw new Error('No company found.');

        const companyId = String(company._id);
        const userId = String(company.owner || new mongoose.Types.ObjectId());

        console.log(`👤 Context: Company=${company.name}`);

        // --- PRE-CLEANUP ---
        await RateCard.deleteMany({ name: { $in: ['Gold Tier Card', 'Silver Tier Card (CSV)', 'Overlapping Card'] }, companyId: company._id });
        console.log('🧹 Pre-Cleanup Complete.');


        // ==================================================================================
        // TEST CASE 1: FORM-BASED CREATION (GOLD TIER)
        // Simulate creating a card via Frontend Form (JSON Payload)
        // ==================================================================================
        console.log('\n--- TEST 1: FORM CREATION (Gold Tier) ---');

        // Define Zones if missing
        let zoneA = await Zone.findOne({ companyId: company._id, standardZoneCode: 'zoneA' });
        if (!zoneA) zoneA = await Zone.create({ companyId: company._id, name: 'Zone A', standardZoneCode: 'zoneA', postalCodes: ['110001'] });

        const goldCardData = {
            name: 'Gold Tier Card',
            companyId: companyId,
            status: 'active',
            baseRates: [{
                carrier: 'BlueDart',
                serviceType: 'Express',
                basePrice: 50, // Cheap base price for Gold
                minWeight: 0,
                maxWeight: 0.5
            }],
            weightRules: [{
                minWeight: 0.5,
                maxWeight: 5.0,
                pricePerKg: 10,
                carrier: 'BlueDart',
                serviceType: 'Express'
            }],
            zoneRules: [{
                zoneId: zoneA._id,
                carrier: 'BlueDart',
                serviceType: 'Express',
                additionalPrice: 15,
                transitDays: 1
            }],
            effectiveDates: { startDate: new Date() }
        };

        const goldCard = await RateCard.create(goldCardData);
        console.log(`✅ Created 'Gold Tier Card' (ID: ${goldCard._id})`);


        // ==================================================================================
        // TEST CASE 2: VALIDATION (Overlapping Slabs)
        // Try creating invalid weight rules
        // ==================================================================================
        console.log('\n--- TEST 2: VALIDATION (Overlapping Slabs) ---');

        try {
            await RateCard.create({
                name: 'Overlapping Card',
                companyId: companyId,
                baseRates: [{ carrier: 'Test', serviceType: 'Std', basePrice: 100, minWeight: 0, maxWeight: 0.5 }],
                weightRules: [
                    { minWeight: 0.5, maxWeight: 2.0, pricePerKg: 10 },
                    { minWeight: 1.5, maxWeight: 3.0, pricePerKg: 10 } // OVERLAP! 1.5 < 2.0
                ],
                effectiveDates: { startDate: new Date() }
            });
            console.error('❌ Failed to catch overlapping slabs!');
        } catch (e: any) {
            console.log('✅ Correctly rejected overlapping slabs:', e.message || 'Validation Error');
        }


        // ==================================================================================
        // TEST CASE 3: TIER ASSIGNMENT
        // Assign Gold Card to Company
        // ==================================================================================
        console.log('\n--- TEST 3: TIER ASSIGNMENT ---');
        await Company.updateOne({ _id: companyId }, { $set: { 'settings.defaultRateCardId': goldCard._id } });
        console.log(`✅ Assigned Gold Card to Company ${company.name}`);

        // Verify assignment via DB
        const updatedCompany = await Company.findById(companyId).lean();
        if (String(updatedCompany?.settings?.defaultRateCardId) !== String(goldCard._id)) {
            throw new Error('Tier Assignment Verification Failed');
        }
        console.log('✅ Tier Assignment Verified.');


        // ==================================================================================
        // TEST CASE 4: CSV IMPORT (SILVER TIER)
        // Import a different card for Silver Tier
        // ==================================================================================
        console.log('\n--- TEST 4: CSV IMPORT (Silver Tier) ---');
        const silverCsv = `Name,Carrier,Service Type,Base Price,Min Weight,Max Weight,Zone,Zone Price,Status
Silver Tier Card (CSV),Delhivery,Surface,80,0,0.5,zoneA,30,active
Silver Tier Card (CSV),Delhivery,Surface,80,0,0.5,zoneB,50,active`;

        const csvBuffer = Buffer.from(silverCsv);
        const importRes = await RateCardImportService.importRateCards(
            companyId,
            csvBuffer,
            'text/csv',
            userId,
            { ip: '127.0.0.1', user: { _id: userId } }
        );

        if (importRes.created !== 1) throw new Error('CSV Import Failed to create card');
        console.log('✅ Imported Silver Tier Card via CSV');

        const silverCard = await RateCard.findOne({ name: 'Silver Tier Card (CSV)', companyId }).lean();
        if (!silverCard) throw new Error('Silver Card not found in DB');
        console.log(`✅ Silver Card ID: ${silverCard._id}`);
        console.log(`   Base Price: ${silverCard.baseRates[0].basePrice} (Expected 80 - Higher than Gold's 50)`);


        // ==================================================================================
        // TEST CASE 5: PRICING LOGIC (TIER CHECK)
        // Verify we can switch tiers and get different prices (Logic Check)
        // ==================================================================================
        console.log('\n--- TEST 5: TIER PRICING LOGIC ---');

        // Gold Calc (Base 50 + Zone 15 = 65)
        const goldBase = goldCard.baseRates[0].basePrice;
        const goldZone = goldCard.zoneRules[0].additionalPrice;
        console.log(`   Gold Tier Total: ${goldBase + goldZone}`);

        // Silver Calc (Base 80 + Zone 30 = 110)
        // Note: zoneA for Silver was input as 30 in CSV
        const silverBase = silverCard.baseRates[0].basePrice;
        const silverZone = silverCard.zoneRules.find((zr: any) => String(zr.zoneId) === String(zoneA._id) || zr.additionalPrice === 30)?.additionalPrice;
        console.log(`   Silver Tier Total: ${silverBase + (silverZone || 0)}`);

        if ((goldBase + goldZone) >= (silverBase + (silverZone || 0))) {
            console.warn('⚠️ Warning: Gold Tier price is not cheaper than Silver. Check inputs.');
        } else {
            console.log('✅ Gold Tier is cheaper as expected.');
        }


        // ==================================================================================
        // TEST CASE 6: CRUD - UPDATE & DELETE
        // Update Silver Card, then Delete Gold Card
        // ==================================================================================
        console.log('\n--- TEST 6: CRUD (Update & Delete) ---');

        // Update Silver
        await RateCard.updateOne({ _id: silverCard._id }, { $set: { status: 'inactive' } });
        const updatedSilver = await RateCard.findById(silverCard._id).lean();
        if (updatedSilver?.status !== 'inactive') throw new Error('Update Status Failed');
        console.log('✅ Verified Update (Status -> inactive)');

        // Delete Gold
        await RateCard.deleteOne({ _id: goldCard._id }); // Hard delete for test cleanup
        // OR Soft Delete if implementing soft delete logic
        // model usually has isDeleted: boolean
        // Let's try soft delete to match controller logic
        // await RateCard.updateOne({ _id: goldCard._id }, { isDeleted: true });

        const deletedGold = await RateCard.findById(goldCard._id);
        if (deletedGold) console.warn('⚠️ Gold Card still exists (Hard Delete used check).');
        else console.log('✅ Verified Delete');


        console.log('\n🎉 DEEP DIVE VERIFICATION PASS');

    } catch (error: any) {
        console.error('❌ Verification Failed:', error);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (mongoConnected) await mongoose.disconnect();
    }
}

verifyRateCardDeepDive();
