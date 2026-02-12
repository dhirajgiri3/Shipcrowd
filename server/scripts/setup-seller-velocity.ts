import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

const envPath = process.cwd().endsWith('server')
    ? path.join(process.cwd(), '.env')
    : path.join(process.cwd(), 'server', '.env');

dotenv.config({ path: envPath });

const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Shipcrowd';

async function setupSellerVelocity() {
    try {
        await mongoose.connect(DB_URL);
        
        const CourierService = mongoose.connection.collection('courier_services');
        const ServiceRateCard = mongoose.connection.collection('service_rate_cards');
        
        const sellerCompanyId = new mongoose.Types.ObjectId('69896c05e5063b94d9f3e342');
        
        console.log('Creating Velocity services for Seller...');
        
        // Create VELOCITY-EXPRESS service
        const expressService = {
            _id: new mongoose.Types.ObjectId(),
            companyId: sellerCompanyId,
            provider: 'velocity',
            serviceCode: 'VELOCITY-EXPRESS',
            serviceType: 'express',
            displayName: 'Velocity Express',
            status: 'active',
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await CourierService.insertOne(expressService);
        console.log(`Created Service: ${expressService.serviceCode} (${expressService._id})`);
        
        // Create Cost Rate Card
        const costCard = {
            _id: new mongoose.Types.ObjectId(),
            companyId: sellerCompanyId,
            serviceId: expressService._id,
            cardType: 'cost',
            sourceMode: 'HYBRID',
            currency: 'INR',
            status: 'active',
            effectiveDates: {
                startDate: new Date()
            },
            calculation: {
                weightBasis: 'max',
                roundingUnitKg: 0.5,
                roundingMode: 'ceil',
                dimDivisor: 5000
            },
            zoneRules: [{
                zoneKey: 'ALL',
                slabs: [
                    { minKg: 0, maxKg: 0.5, charge: 45 },
                    { minKg: 0.5, maxKg: 1, charge: 65 },
                    { minKg: 1, maxKg: 2, charge: 95 }
                ],
                additionalPerKg: 30
            }],
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await ServiceRateCard.insertOne(costCard);
        console.log(`Created Cost Card: ${costCard._id}`);
        
        // Create Sell Rate Card
        const sellCard = {
            _id: new mongoose.Types.ObjectId(),
            companyId: sellerCompanyId,
            serviceId: expressService._id,
            cardType: 'sell',
            sourceMode: 'TABLE',
            currency: 'INR',
            status: 'active',
            effectiveDates: {
                startDate: new Date()
            },
            calculation: {
                weightBasis: 'max',
                roundingUnitKg: 0.5,
                roundingMode: 'ceil',
                dimDivisor: 5000
            },
            zoneRules: [{
                zoneKey: 'ALL',
                slabs: [
                    { minKg: 0, maxKg: 0.5, charge: 75 },
                    { minKg: 0.5, maxKg: 1, charge: 105 },
                    { minKg: 1, maxKg: 2, charge: 155 }
                ],
                additionalPerKg: 40
            }],
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await ServiceRateCard.insertOne(sellCard);
        console.log(`Created Sell Card: ${sellCard._id}`);
        
        console.log('\n✅ Seller Velocity setup complete!');
        
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

setupSellerVelocity();
