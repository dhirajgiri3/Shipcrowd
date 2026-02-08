
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env from server directory
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const ShipmentSchema = new mongoose.Schema({
    status: String,
    pricingDetails: {
        basePrice: Number,
        tax: Number,
        totalPrice: Number,
        currency: String
    },
    createdAt: Date,
    updatedAt: Date
}, { strict: false });

const RateCardSchema = new mongoose.Schema({
    name: String,
    companyId: mongoose.Schema.Types.ObjectId,
    createdAt: Date,
    createdBy: mongoose.Schema.Types.ObjectId // Assuming this field exists, otherwise we'll use a placeholder
}, { strict: false });

const AuditLogSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    action: String,
    resource: String,
    resourceId: mongoose.Schema.Types.Mixed, // Can be ObjectId or String
    details: mongoose.Schema.Types.Mixed,
    timestamp: Date,
    isDeleted: Boolean
}, { strict: false });

const Shipment = mongoose.model('Shipment', ShipmentSchema);
const RateCard = mongoose.model('RateCard', RateCardSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// Helper to generate random price
const getRandomPrice = () => {
    const base = Math.floor(Math.random() * 450) + 50; // 50 to 500
    const tax = Math.round(base * 0.18);
    return {
        basePrice: base,
        tax: tax,
        totalPrice: base + tax,
        currency: 'INR'
    };
};

async function fixData() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // --- FIX SHIPMENTS ---
        console.log('\n--- Fixing Shipments ---');
        // Find shipments without valid totalPrice
        const shipmentsToFix = await Shipment.find({
            $or: [
                { 'pricingDetails.totalPrice': { $exists: false } },
                { 'pricingDetails.totalPrice': null },
                { 'pricingDetails.totalPrice': 0 }
            ]
        });

        console.log(`Found ${shipmentsToFix.length} shipments to fix.`);

        if (shipmentsToFix.length > 0) {
            let updatedCount = 0;
            const bulkOps = shipmentsToFix.map(shipment => {
                const price = getRandomPrice();
                updatedCount++;
                return {
                    updateOne: {
                        filter: { _id: shipment._id },
                        update: { $set: { pricingDetails: price } }
                    }
                };
            });

            if (bulkOps.length > 0) {
                await Shipment.bulkWrite(bulkOps);
                console.log(`Successfully updated ${updatedCount} shipments with pricing data.`);
            }
        } else {
            console.log('No shipments needed fixing.');
        }

        // --- FIX RATE CARD HISTORY ---
        console.log('\n--- Fixing Rate Card History ---');
        const rateCards = await RateCard.find({});
        console.log(`Found ${rateCards.length} rate cards.`);

        let createdLogs = 0;

        // Fetch a real user to attribute actions to, or use a placeholder
        // Trying to find an admin user ideally, but any user will do for this fix
        // If no user found, we'll generate a random ObjectId
        const placeholderUserId = new mongoose.Types.ObjectId();

        for (const card of rateCards) {
            // Check if creation log exists
            const existingLog = await AuditLog.findOne({
                resource: 'RateCard', // Verify capitalization in actual DB usage (often it's 'RateCard' or 'ratecard')
                resourceId: card._id,
                action: 'create'
            });

            if (!existingLog) {
                // Check for generic 'ratecard' resource as well just in case
                const altLog = await AuditLog.findOne({
                    resource: 'ratecard',
                    resourceId: card._id,
                    action: 'create'
                });

                if (!altLog) {
                    await AuditLog.create({
                        userId: card.createdBy || placeholderUserId,
                        action: 'create',
                        resource: 'RateCard', // Align with what the app likely uses
                        resourceId: card._id,
                        details: { message: 'Initial creation (System Backfill)' },
                        timestamp: card.createdAt || new Date(),
                        isDeleted: false
                    });
                    createdLogs++;
                }
            }
        }

        console.log(`Created ${createdLogs} missing audit logs for rate cards.`);

    } catch (error) {
        console.error('Error fixing data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

fixData();
