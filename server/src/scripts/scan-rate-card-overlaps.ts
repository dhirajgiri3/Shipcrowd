import dotenv from 'dotenv';
import mongoose from 'mongoose';

// 1. Initialize Environment
dotenv.config();

// Ensure ENCRYPTION_KEY is present
if (!process.env.ENCRYPTION_KEY) {
    if (!process.env.FIELD_ENCRYPTION_SECRET) {
        console.warn('⚠️  ENCRYPTION_KEY not found. Using default dev key for script execution.');
        process.env.ENCRYPTION_KEY = '02207fcc1b5ce31788490e5cebf0deafb7000b20223942900fffd2c1bbb780';
    } else {
        process.env.ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_SECRET;
    }
}

const scanRateCards = async () => {
    try {
        console.log('🔍 Scanning Rate Cards for overlaps...');

        // 2. Connect DB manually
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');

        // 3. Dynamic Imports
        const RateCardModule = await import('../infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model.js');
        const RateCard = RateCardModule.default as any;

        const CarrierNormalizationServiceModule = await import('../core/application/services/shipping/carrier-normalization.service.js');
        const CarrierNormalizationService = CarrierNormalizationServiceModule.default as any;

        if (!RateCard || !CarrierNormalizationService) {
            throw new Error('Failed to import Models or Services. Check imports.');
        }

        const rateCards = await RateCard.find({ isDeleted: false }).lean();
        console.log(`Found ${rateCards.length} active rate cards.`);

        const issues: any[] = [];

        for (const card of rateCards) {
            // console.log(`Checking ${card.name} (${card._id})...`);
            // Check Base Rates
            const baseRateErrors = checkOverlaps(card.baseRates || [], 'BaseRates', CarrierNormalizationService);

            // Check Weight Rules
            const weightRuleErrors = checkOverlaps(card.weightRules || [], 'WeightRules', CarrierNormalizationService);

            if (baseRateErrors.length > 0 || weightRuleErrors.length > 0) {
                issues.push({
                    id: card._id,
                    name: card.name,
                    companyId: card.companyId,
                    errors: [...baseRateErrors, ...weightRuleErrors]
                });
            }
        }

        if (issues.length > 0) {
            console.error('\n❌ Found Conflicts in the following Rate Cards:');
            issues.forEach((issue: any) => {
                console.error(`\n[${issue.name}] (ID: ${issue.id})`);
                issue.errors.forEach((err: string) => console.error(`  - ${err}`));
            });
            console.log('\n⚠️  Please fix these overlaps before enabling strict validation.');
        } else {
            console.log('\n✅ No overlaps found! System is ready for strict validation.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
};

const checkOverlaps = (rules: any[], type: string, CarrierNormalizationService: any): string[] => {
    if (!rules || rules.length <= 1) return [];

    const errors: string[] = [];
    const groups = new Map<string, any[]>();

    // Group slabs by carrier + serviceType
    for (const rule of rules) {
        // Use service method for normalization
        const carrier = CarrierNormalizationService.normalizeCarrier(rule.carrier) || 'any';
        const service = CarrierNormalizationService.normalizeServiceType(rule.serviceType) || 'any';

        const key = `${carrier}:${service}`;

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(rule);
    }

    // Validate each group independently
    for (const [key, groupRules] of groups) {
        // Sort by minWeight
        const sorted = [...groupRules].sort((a: any, b: any) => a.minWeight - b.minWeight);

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].minWeight < sorted[i - 1].maxWeight) {
                // Formatting for readability
                errors.push(`${type} Overlap in [${key}]: ${sorted[i - 1].minWeight}-${sorted[i - 1].maxWeight} overlaps with ${sorted[i].minWeight}-${sorted[i].maxWeight}`);
            }
        }
    }
    return errors;
};

scanRateCards();
