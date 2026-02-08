
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

// Define minimal schemas for checking
const ShipmentSchema = new mongoose.Schema({
    pricingDetails: { totalPrice: Number },
    createdAt: Date,
    companyId: mongoose.Schema.Types.ObjectId,
    isDeleted: Boolean
}, { strict: false });

const RateCardSchema = new mongoose.Schema({
    name: String,
    companyId: mongoose.Schema.Types.ObjectId
}, { strict: false });

const AuditLogSchema = new mongoose.Schema({
    resource: String,
    resourceId: String,
    action: String
}, { strict: false });

const Shipment = mongoose.model('Shipment', ShipmentSchema);
const RateCard = mongoose.model('RateCard', RateCardSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

async function checkData() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check Shipments
        const shipmentCount = await Shipment.countDocuments({});
        const pricedShipments = await Shipment.countDocuments({ 'pricingDetails.totalPrice': { $exists: true, $gt: 0 } });
        const recentShipments = await Shipment.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });

        console.log('--- SHIPMENTS ---');
        console.log(`Total: ${shipmentCount}`);
        console.log(`With Price > 0: ${pricedShipments}`);
        console.log(`Last 30 Days: ${recentShipments}`);

        if (shipmentCount > 0) {
            const sample = await Shipment.findOne().lean();
            console.log('Sample Shipment Pricing:', sample.pricingDetails);
        }

        // Check Rate Cards
        const rateCardCount = await RateCard.countDocuments({});
        console.log('\n--- RATE CARDS ---');
        console.log(`Total: ${rateCardCount}`);

        const sampleCard = await RateCard.findOne().lean();
        if (sampleCard) {
            console.log(`Sample Card ID: ${sampleCard._id}`);

            // Check Audit Logs for this card
            const logs = await AuditLog.find({ resource: 'ratecard', resourceId: sampleCard._id }).countDocuments();
            console.log(`Audit Logs for Sample Card: ${logs}`);
        }

        // Check Total Audit Logs
        const totalLogs = await AuditLog.countDocuments({ resource: 'ratecard' });
        console.log(`Total RateCard Audit Logs: ${totalLogs}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

checkData();
