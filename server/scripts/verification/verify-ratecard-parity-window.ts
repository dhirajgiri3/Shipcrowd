import * as dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';

const TERMINAL_STATUSES = ['delivered', 'rto', 'rto_delivered', 'cancelled', 'lost'] as const;
const IN_FLIGHT_STATUSES = [
    'created',
    'ready_to_ship',
    'pending_pickup',
    'picked_up',
    'shipped',
    'awaiting_carrier_sync',
    'in_transit',
    'out_for_delivery',
    'ndr',
    'rto_initiated',
    'rto_in_transit',
] as const;

async function verifyRatecardParityWindow() {
    console.log('🔍 Verifying legacy ratecard parity window...');

    const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
        const {
            Company,
            User,
            Shipment,
            SellerCourierPolicy,
        } = await import('../../src/infrastructure/database/mongoose/models');

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const companiesWithLegacyDefault = await Company.find({
            isDeleted: false,
            'settings.defaultRateCardId': { $exists: true, $ne: null },
        })
            .select('_id name')
            .lean();

        let missingPolicySellers = 0;
        for (const company of companiesWithLegacyDefault as Array<{
            _id: mongoose.Types.ObjectId;
            name: string;
        }>) {
            const sellers = await User.find({
                companyId: company._id,
                role: 'seller',
                isActive: true,
                isDeleted: false,
            })
                .select('_id')
                .lean();

            if (!sellers.length) {
                continue;
            }

            const sellerIds = sellers.map((seller) => seller._id);
            const policies = await SellerCourierPolicy.find({
                companyId: company._id,
                sellerId: { $in: sellerIds },
                isActive: true,
            })
                .select('sellerId')
                .lean();

            const policySellerIds = new Set(
                policies.map((policy) => String((policy as any).sellerId))
            );
            const missing = sellers.filter(
                (seller) => !policySellerIds.has(String(seller._id))
            );

            if (missing.length > 0) {
                missingPolicySellers += missing.length;
                console.log(
                    `❌ [${company.name}] Missing seller policies: ${missing.length}`
                );
            }
        }

        const inFlightShipmentsMissingSelectedQuote = await Shipment.countDocuments({
            isDeleted: false,
            createdAt: { $gte: THIRTY_DAYS_AGO },
            currentStatus: { $in: IN_FLIGHT_STATUSES as any },
            $or: [
                { pricingDetails: { $exists: false } },
                { 'pricingDetails.selectedQuote': { $exists: false } },
                { 'pricingDetails.selectedQuote.optionId': { $exists: false } },
            ],
        });

        const terminalShipmentsMissingSelectedQuote = await Shipment.countDocuments({
            isDeleted: false,
            createdAt: { $gte: THIRTY_DAYS_AGO },
            currentStatus: { $in: TERMINAL_STATUSES as any },
            $or: [
                { pricingDetails: { $exists: false } },
                { 'pricingDetails.selectedQuote': { $exists: false } },
                { 'pricingDetails.selectedQuote.optionId': { $exists: false } },
            ],
        });

        const recentShipmentsWithoutLegacyMarker = await Shipment.countDocuments({
            isDeleted: false,
            createdAt: { $gte: THIRTY_DAYS_AGO },
            'pricingDetails.selectedQuote': { $exists: true },
            $or: [
                { 'pricingDetails.calculationMethod': { $ne: 'override' } },
                {
                    'pricingDetails.rateCardName': {
                        $nin: ['service-level-pricing', 'Quote Session'],
                    },
                },
            ],
        });

        console.log('📊 Parity Window Stats');
        console.log(
            `Companies with legacy defaultRateCardId: ${companiesWithLegacyDefault.length}`
        );
        console.log(`Missing seller policies: ${missingPolicySellers}`);
        console.log(
            `Recent IN-FLIGHT shipments missing selectedQuote: ${inFlightShipmentsMissingSelectedQuote}`
        );
        console.log(
            `Recent TERMINAL shipments missing selectedQuote (informational): ${terminalShipmentsMissingSelectedQuote}`
        );
        console.log(
            `Recent shipments missing parity markers: ${recentShipmentsWithoutLegacyMarker}`
        );

        const issues = [];
        if (missingPolicySellers > 0) {
            issues.push(`Missing seller policies detected: ${missingPolicySellers}`);
        }
        if (inFlightShipmentsMissingSelectedQuote > 0) {
            issues.push(
                `Recent IN-FLIGHT shipments missing selectedQuote: ${inFlightShipmentsMissingSelectedQuote}`
            );
        }
        if (recentShipmentsWithoutLegacyMarker > 0) {
            issues.push(
                `Recent shipments missing parity markers: ${recentShipmentsWithoutLegacyMarker}`
            );
        }

        if (issues.length > 0) {
            console.log('❌ Parity verification failed:');
            issues.forEach((issue) => console.log(` - ${issue}`));
            process.exit(1);
        }

        console.log('✅ Ratecard parity window verification passed');
    } finally {
        await mongoose.disconnect();
    }
}

verifyRatecardParityWindow().catch((error) => {
    console.error('❌ Parity verification failed:', error);
    process.exit(1);
});
