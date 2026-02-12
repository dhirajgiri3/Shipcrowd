import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

const envPath = process.cwd().endsWith('server')
    ? path.join(process.cwd(), '.env')
    : path.join(process.cwd(), 'server', '.env');

dotenv.config({ path: envPath });

const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Shipcrowd';

async function createWarehouse() {
    try {
        await mongoose.connect(DB_URL);
        const Warehouse = mongoose.connection.collection('warehouses');
        
        const companyId = new mongoose.Types.ObjectId('69896c05e5063b94d9f3e342'); // Seller company
        
        const warehouse = {
            companyId: companyId,
            name: "Seller DB Warehouse",
            address: {
                line1: "Direct DB Insert Lane",
                city: "Mumbai",
                state: "Maharashtra",
                postalCode: "400070",
                country: "India"
            },
            contactInfo: {
                name: "DB Warehouse Mgr",
                phone: "9876543210",
                email: "db.wh@fashionhub.com"
            },
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const res = await Warehouse.insertOne(warehouse);
        console.log('Warehouse Created:', res.insertedId);
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createWarehouse();
