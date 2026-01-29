
import * as dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// 1. Load Environment Properly (Standard Pattern)
const res = dotenv.config({ path: path.join(process.cwd(), '.env') });
if (res.error) console.error('dotenv load failed:', res.error);

async function verifyRateCardImportDirectly() {
    console.log('🚀 Starting Rate Card Import Verification...');

    try {
        // 2. Dynamic Imports AFTER env load (Prevents model loading before encryption keys are set)
        const modelsPath = path.resolve(process.cwd(), 'src/infrastructure/database/mongoose/models/index.ts');
        const servicePath = path.resolve(process.cwd(), 'src/core/application/services/pricing/rate-card-import.service.ts');

        // Import Models to register schemas
        const { Company, User } = await import(modelsPath);
        // Import Service (using default export)
        const { default: RateCardImportService } = await import(servicePath);

        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) throw new Error('MONGODB_URI not found in .env');

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 3. Get Context (Real Data)
        const company = await Company.findOne({}).lean();
        if (!company) {
            console.warn('⚠️ No company found. Skipping test.');
            return;
        }

        const user = await User.findOne({ companyId: company._id }).lean();
        if (!user) {
            console.warn('⚠️ No user found. Skipping test.');
            return;
        }

        console.log(`👤 Using Company: ${company.name}`);

        // 4. Create Test Data
        const csvContent = `Name,Carrier,Service Type,Base Price,Min Weight,Max Weight,Zone,Zone Price,Status
Test Card Import,velocity,surface,55,0,0.5,A,12,active
Test Card Import,velocity,surface,55,0,0.5,B,22,active
Test Card 2 (Air),velocity,air,120,0,0.5,A,15,active`;

        const csvBuffer = Buffer.from(csvContent);

        // 5. Invoke Service
        console.log('🔄 Importing Rate Cards...');
        const result = await RateCardImportService.importRateCards(
            String(company._id),
            csvBuffer,
            'text/csv',
            String(user._id),
            { ip: '127.0.0.1', user } // Mocking request object for audit logs
        );

        // 6. Report Results
        console.log('📊 Result:', {
            created: result.created,
            updated: result.updated,
            errors: result.errors.length
        });

        if (result.errors.length > 0) {
            console.error('❌ Errors encountered:', result.errors);
        } else {
            console.log('✅ Rate Cards Imported Successfully without errors.');
        }

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.message);
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyRateCardImportDirectly();
