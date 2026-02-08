
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
const envPath = path.join(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const checkShipments = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // Access collections directly to avoid Model/Schema/Plugin issues
        const shipmentsCollection = mongoose.connection.collection('shipments');
        const usersCollection = mongoose.connection.collection('users');

        // 1. Count all shipments
        const totalShipments = await shipmentsCollection.countDocuments({});
        console.log(`\nTotal Shipments in DB: ${totalShipments}`);

        // 2. Count active shipments
        const activeShipments = await shipmentsCollection.countDocuments({ isDeleted: false });
        console.log(`Active (isDeleted: false) Shipments: ${activeShipments}`);

        // 3. Group by Company
        const byCompany = await shipmentsCollection.aggregate([
            { $group: { _id: '$companyId', count: { $sum: 1 } } }
        ]).toArray();
        console.log('\nShipments by Company:', byCompany);

        // 4. Status Breakdown
        const byStatus = await shipmentsCollection.aggregate([
            { $group: { _id: '$currentStatus', count: { $sum: 1 } } }
        ]).toArray();
        console.log('\nShipments by Status:', byStatus);

        // 5. Check Admin Users
        const admins = await usersCollection.find({ role: { $in: ['admin', 'super_admin'] } }).toArray();
        console.log(`\nFound ${admins.length} admins:`);
        admins.forEach((admin: any) => {
            console.log(`- ${admin.email} (Role: ${admin.role}, CompanyId: ${admin.companyId}, ID: ${admin._id})`);
        });

    } catch (error) {
        console.error('Error executing script:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected');
        process.exit(0);
    }
};

checkShipments();
