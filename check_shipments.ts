
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shipment from './server/src/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model';

dotenv.config({ path: './server/.env' });

async function checkShipments() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const count = await Shipment.countDocuments({});
        console.log(`Total Shipments: ${count}`);

        if (count > 0) {
            const sample = await Shipment.findOne({}).lean();
            console.log('Sample Shipment:', JSON.stringify(sample, null, 2));

            const pricedCount = await Shipment.countDocuments({ 'pricingDetails.totalPrice': { $exists: true } });
            console.log(`Shipments with price: ${pricedCount}`);

            const recentCount = await Shipment.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            });
            console.log(`Shipments in last 30 days: ${recentCount}`);
        } else {
            console.log("No shipments found. This explains why Revenue is 0.");
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

checkShipments();
