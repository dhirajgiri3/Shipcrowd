
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shipcrowd';

async function checkShipments() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // Simple Schema for aggregation
        const shipmentSchema = new mongoose.Schema({}, { strict: false });
        const Shipment = mongoose.model('Shipment', shipmentSchema);
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));

        const total = await Shipment.countDocuments({});
        console.log(`Total Shipments in DB: ${total}`);

        if (total === 0) {
            console.log('No shipments found. Seed data might be missing.');
        } else {
            console.log('\n--- Shipments by Company ---');
            const byCompany = await Shipment.aggregate([
                { $group: { _id: '$companyId', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);
            console.log(byCompany);

            console.log('\n--- Shipments by Status (Global) ---');
            const byStatus = await Shipment.aggregate([
                { $group: { _id: '$currentStatus', count: { $sum: 1 } } }
            ]);
            console.log(byStatus);
        }

        console.log('\n--- Admin/Test Users ---');
        // Try to find typical test users
        const users = await User.find({ email: { $regex: 'admin|test|user', $options: 'i' } }, '_id name email companyId role').limit(5);
        console.log(users);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

checkShipments();
