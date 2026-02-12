import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

const envPath = process.cwd().endsWith('server')
    ? path.join(process.cwd(), '.env')
    : path.join(process.cwd(), 'server', '.env');

dotenv.config({ path: envPath });

const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Shipcrowd';

async function setupSellerCouriers() {
    try {
        await mongoose.connect(DB_URL);

        const CourierService = mongoose.connection.collection('courier_services');
        const ServiceRateCard = mongoose.connection.collection('service_rate_cards');
        const User = mongoose.connection.collection('users');

        // 1. Get Admin Company ID
        const adminUser = await User.findOne({ email: 'admin1@shipcrowd.com' });
        if (!adminUser || !adminUser.companyId) throw new Error('Admin company not found');
        const adminCompanyId = adminUser.companyId;

        // 2. Get Seller Company ID
        // Hardcoded or fetched. We know it's 69896c05e5063b94d9f3e342
        const sellerCompanyId = new mongoose.Types.ObjectId('69896c05e5063b94d9f3e342');

        console.log(`Cloning Velocity config from Admin (${adminCompanyId}) to Seller (${sellerCompanyId})`);

        // 3. Find Velocity Services for Admin
        const adminServices = await CourierService.find({
            companyId: adminCompanyId,
            provider: 'velocity',
            status: 'active'
        }).toArray();

        console.log(`Found ${adminServices.length} Velocity services for Admin`);

        for (const service of adminServices) {
            const oldId = service._id;

            // Clone Service
            const newService = {
                ...service,
                _id: new mongoose.Types.ObjectId(),
                companyId: sellerCompanyId,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await CourierService.insertOne(newService);
            console.log(`Cloned Service: ${service.serviceCode} -> ${newService._id}`);

            // 4. Find Rate Cards for this Service (Admin)
            const adminCards = await ServiceRateCard.find({
                companyId: adminCompanyId,
                serviceId: oldId,
                status: 'active'
            }).toArray();

            for (const card of adminCards) {
                const newCard = {
                    ...card,
                    _id: new mongoose.Types.ObjectId(),
                    companyId: sellerCompanyId,
                    serviceId: newService._id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await ServiceRateCard.insertOne(newCard);
                console.log(`  Cloned Rate Card (${card.cardType}) -> ${newCard._id}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

setupSellerCouriers();
