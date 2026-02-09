import * as dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';

async function verifyServiceLevelPricingSeed() {
    console.log('🔍 Verifying service-level pricing seed integrity...');

    try {
        const {
            Company,
            CourierService,
            ServiceRateCard,
            SellerCourierPolicy,
        } = await import('../../src/infrastructure/database/mongoose/models');

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const companies = await Company.find({ isDeleted: false })
            .select('_id name')
            .lean();

        if (!companies.length) {
            throw new Error('No companies found. Run seed:full first.');
        }

        const [serviceCompanyIds, cardCompanyIds, policyCompanyIds] = await Promise.all([
            CourierService.distinct('companyId', { isDeleted: false }),
            ServiceRateCard.distinct('companyId', { isDeleted: false }),
            SellerCourierPolicy.distinct('companyId', { isActive: true }),
        ]);

        const scopedCompanyIds = new Set(
            [...serviceCompanyIds, ...cardCompanyIds, ...policyCompanyIds].map((id) => String(id))
        );
        const scopedCompanies = (companies as Array<{
            _id: mongoose.Types.ObjectId;
            name?: string;
        }>).filter((company) => scopedCompanyIds.has(String(company._id)));

        if (!scopedCompanies.length) {
            throw new Error(
                'No service-level pricing records found. Run seed:service-level-pricing or seed:full.'
            );
        }

        let serviceCount = 0;
        let rateCardCount = 0;
        let policyCount = 0;
        const failures: string[] = [];

        for (const company of scopedCompanies) {
            const companyId = company._id;
            const companyLabel = company.name || String(companyId);

            const services = await CourierService.find({
                companyId,
                isDeleted: false,
            })
                .select('_id serviceCode provider status')
                .lean();

            serviceCount += services.length;

            const serviceIds = services.map((item: { _id: mongoose.Types.ObjectId }) => item._id);

            if (!serviceIds.length) {
                failures.push(`[${companyLabel}] No courier services found`);
                continue;
            }

            const cards = await ServiceRateCard.find({
                companyId,
                serviceId: { $in: serviceIds },
                isDeleted: false,
            })
                .select('serviceId cardType status')
                .lean();
            rateCardCount += cards.length;

            for (const service of services as Array<{
                _id: mongoose.Types.ObjectId;
                serviceCode: string;
            }>) {
                const activeCost = cards.find(
                    (card: any) =>
                        String(card.serviceId) === String(service._id) &&
                        card.cardType === 'cost' &&
                        card.status === 'active'
                );
                const activeSell = cards.find(
                    (card: any) =>
                        String(card.serviceId) === String(service._id) &&
                        card.cardType === 'sell' &&
                        card.status === 'active'
                );

                if (!activeCost || !activeSell) {
                    failures.push(
                        `[${companyLabel}] Missing active cost/sell card pair for service ${service.serviceCode}`
                    );
                }
            }

            const policies = await SellerCourierPolicy.find({
                companyId,
                isActive: true,
            }).lean();
            policyCount += policies.length;

            const danglingCards = await ServiceRateCard.countDocuments({
                companyId,
                isDeleted: false,
                serviceId: { $nin: serviceIds },
            });

            if (danglingCards > 0) {
                failures.push(
                    `[${companyLabel}] Found ${danglingCards} service rate cards referencing missing services`
                );
            }
        }

        console.log('📊 Verification Stats');
        console.log(`Companies (total): ${companies.length}`);
        console.log(`Companies (scoped): ${scopedCompanies.length}`);
        console.log(`Courier Services: ${serviceCount}`);
        console.log(`Service Rate Cards: ${rateCardCount}`);
        console.log(`Active Seller Policies: ${policyCount}`);

        if (failures.length > 0) {
            console.log('❌ Integrity issues detected:');
            failures.forEach((item) => console.log(` - ${item}`));
            throw new Error(`Service-level pricing integrity checks failed (${failures.length} issues)`);
        }

        console.log('✅ Service-level pricing seed verification passed');
    } finally {
        await mongoose.disconnect();
    }
}

verifyServiceLevelPricingSeed().catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
});
