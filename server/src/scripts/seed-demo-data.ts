/**
 * Enhanced Seed Data Script for Shipcrowd
 * 
 * This script seeds realistic demo data 100% aligned with actual database models.
 * It is idempotent - can be run multiple times safely.
 * 
 * Usage:
 *   npm run seed
 *   OR
 *   npx ts-node src/scripts/seed-demo-data.ts
 */

import mongoose from 'mongoose';
import { faker } from '@faker-js/faker/locale/en_IN'; // Indian locale
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import models
import Company from '../infrastructure/database/mongoose/models/Company';
import User from '../infrastructure/database/mongoose/models/User';
import Warehouse from '../infrastructure/database/mongoose/models/Warehouse';
import Order from '../infrastructure/database/mongoose/models/Order';
import Shipment from '../infrastructure/database/mongoose/models/Shipment';
import Zone from '../infrastructure/database/mongoose/models/Zone';
import RateCard from '../infrastructure/database/mongoose/models/RateCard';
import KYC from '../infrastructure/database/mongoose/models/KYC';

// Import carrier selection algorithm
import { selectBestCarrier } from '../lib/carrier-selection';

// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Clean database before seeding
const cleanDatabase = async () => {
    console.log('\n🗑️  Cleaning existing data...');

    try {
        await Promise.all([
            Company.deleteMany({}),
            User.deleteMany({}),
            Warehouse.deleteMany({}),
            Order.deleteMany({}),
            Shipment.deleteMany({}),
            Zone.deleteMany({}),
            RateCard.deleteMany({}),
            KYC.deleteMany({})
        ]);

        console.log('✅ Database cleaned successfully');
    } catch (error) {
        console.error('❌ Error cleaning database:', error);
        throw error;
    }
};

// ============================================================================
// SECTION 1: CORE ENTITIES (Companies, Users, Warehouses, KYC)
// ============================================================================

interface CompanyData {
    _id: mongoose.Types.ObjectId;
    name: string;
    city: string;
    state: string;
    postalCode: string;
    gstin: string;
    pan: string;
}

const DEMO_COMPANIES: CompanyData[] = [
    {
        _id: new mongoose.Types.ObjectId('674a1111111111111111111a'),
        name: 'StyleHub Fashion Pvt Ltd',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560095',
        gstin: '29ABCDE1234F1Z5',
        pan: 'ABCDE1234F'
    },
    {
        _id: new mongoose.Types.ObjectId('674a1111111111111111111b'),
        name: 'TrendWear Co',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        gstin: '27FGHIJ5678K2W6',
        pan: 'FGHIJ5678K'
    },
    {
        _id: new mongoose.Types.ObjectId('674a1111111111111111111c'),
        name: 'ChicCraft Apparel',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        gstin: '07LMNOP9012M3X7',
        pan: 'LMNOP9012M'
    },
    {
        _id: new mongoose.Types.ObjectId('674a1111111111111111111d'),
        name: 'FashionHub Express',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        gstin: '27QRSTU3456N4Y8',
        pan: 'QRSTU3456N'
    },
    {
        _id: new mongoose.Types.ObjectId('674a1111111111111111111e'),
        name: 'StyleCraft India',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
        gstin: '36VWXYZ7890P5Z9',
        pan: 'VWXYZ7890P'
    }
];

async function seedCompanies() {
    console.log('\n📦 Seeding Companies...');

    for (const companyData of DEMO_COMPANIES) {
        const existing = await Company.findById(companyData._id);
        if (existing) {
            console.log(`  ⏭️  Company "${companyData.name}" already exists, skipping`);
            continue;
        }

        await Company.create({
            _id: companyData._id,
            name: companyData.name,
            address: {
                line1: faker.location.streetAddress(),
                line2: faker.location.secondaryAddress(),
                city: companyData.city,
                state: companyData.state,
                country: 'India',
                postalCode: companyData.postalCode
            },
            billingInfo: {
                gstin: companyData.gstin,
                pan: companyData.pan,
                bankName: faker.helpers.arrayElement(['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra Bank']),
                accountNumber: faker.finance.accountNumber(14),
                ifscCode: faker.helpers.arrayElement(['HDFC0001234', 'ICIC0002345', 'SBIN0003456', 'UTIB0004567', 'KKBK0005678']),
                upiId: `${companyData.name.toLowerCase().replace(/\s+/g, '')}@upi`
            },
            branding: {
                primaryColor: faker.color.rgb({ format: 'hex' }),
                secondaryColor: faker.color.rgb({ format: 'hex' }),
                logo: `https://placehold.co/200x200/${faker.color.rgb({ format: 'hex' }).slice(1)}/ffffff?text=${companyData.name.charAt(0)}`
            },
            settings: {
                notificationEmail: `orders@${companyData.name.toLowerCase().replace(/\s+/g, '')}.com`,
                notificationPhone: `+91${faker.string.numeric(10)}`,
                autoGenerateInvoice: true
            },
            isActive: true,
            isDeleted: false
        });

        console.log(`  ✅ Created company: ${companyData.name}`);
    }
}

async function seedUsers() {
    console.log('\n👥 Seeding Users...');

    const users = [
        {
            _id: new mongoose.Types.ObjectId('674a2222222222222222222a'),
            email: 'admin@shipcrowd.com',
            password: 'Admin@2024',
            name: 'Admin User',
            role: 'admin' as const,
            companyId: undefined
        },
        {
            _id: new mongoose.Types.ObjectId('674a2222222222222222222b'),
            email: 'demo@shipcrowd.com',
            password: 'Demo@2024',
            name: 'Rajesh Kumar',
            role: 'seller' as const,
            companyId: DEMO_COMPANIES[0]._id,
            teamRole: 'owner' as const
        },
        {
            _id: new mongoose.Types.ObjectId('674a2222222222222222222c'),
            email: 'trendseller@shipcrowd.com',
            password: 'Trend@2024',
            name: 'Priya Sharma',
            role: 'seller' as const,
            companyId: DEMO_COMPANIES[1]._id,
            teamRole: 'owner' as const
        },
        {
            _id: new mongoose.Types.ObjectId('674a2222222222222222222d'),
            email: 'chicseller@shipcrowd.com',
            password: 'Chic@2024',
            name: 'Amit Patel',
            role: 'seller' as const,
            companyId: DEMO_COMPANIES[2]._id,
            teamRole: 'owner' as const
        },
        {
            _id: new mongoose.Types.ObjectId('674a2222222222222222222e'),
            email: 'fashionseller@shipcrowd.com',
            password: 'Fashion@2024',
            name: 'Sneha Reddy',
            role: 'seller' as const,
            companyId: DEMO_COMPANIES[3]._id,
            teamRole: 'owner' as const
        },
        {
            _id: new mongoose.Types.ObjectId('674a2222222222222222222f'),
            email: 'styleseller@shipcrowd.com',
            password: 'Style@2024',
            name: 'Vikram Singh',
            role: 'seller' as const,
            companyId: DEMO_COMPANIES[4]._id,
            teamRole: 'owner' as const
        }
    ];

    for (const userData of users) {
        const existing = await User.findOne({ email: userData.email });
        if (existing) {
            console.log(`  ⏭️  User "${userData.email}" already exists, skipping`);
            continue;
        }

        await User.create({
            _id: userData._id,
            email: userData.email,
            password: userData.password, // Will be hashed by pre-save hook
            name: userData.name,
            role: userData.role,
            companyId: userData.companyId,
            teamRole: userData.teamRole,
            teamStatus: 'active',
            oauthProvider: 'email',
            isEmailVerified: true,
            isActive: true,
            profile: {
                phone: `+91${faker.string.numeric(10)}`,
                city: userData.companyId ? DEMO_COMPANIES.find(c => c._id.equals(userData.companyId))?.city : 'Mumbai',
                state: userData.companyId ? DEMO_COMPANIES.find(c => c._id.equals(userData.companyId))?.state : 'Maharashtra',
                country: 'India'
            },
            profileCompletion: {
                status: 100,
                requiredFieldsCompleted: true,
                lastUpdated: new Date()
            },
            security: {
                tokenVersion: 0,
                failedLoginAttempts: 0,
                recoveryOptions: {
                    recoveryKeys: []
                }
            },
            kycStatus: {
                isComplete: userData.role === 'seller',
                lastUpdated: new Date()
            },
            isDeleted: false,
            anonymized: false
        });

        console.log(`  ✅ Created user: ${userData.email}`);
    }
}

async function seedWarehouses() {
    console.log('\n🏭 Seeding Warehouses...');

    let warehouseCounter = 0;

    for (const company of DEMO_COMPANIES) {
        for (let i = 0; i < 2; i++) {
            const warehouseId = new mongoose.Types.ObjectId(`674a333333333333333333${(warehouseCounter++).toString(16).padStart(2, '0')}`);
            const isDefault = i === 0;
            const suffix = i === 0 ? 'Primary' : 'Secondary';

            const existing = await Warehouse.findOne({ name: `${company.name} ${company.city} ${suffix}` });
            if (existing) {
                console.log(`  ⏭️  Warehouse "${company.name} ${company.city} ${suffix}" already exists, skipping`);
                continue;
            }

            await Warehouse.create({
                _id: warehouseId,
                name: `${company.name} ${company.city} ${suffix}`,
                companyId: company._id,
                address: {
                    line1: faker.location.streetAddress(),
                    line2: i === 0 ? undefined : faker.location.secondaryAddress(),
                    city: company.city,
                    state: company.state,
                    country: 'India',
                    postalCode: company.postalCode
                },
                contactInfo: {
                    name: faker.person.fullName(),
                    phone: `+91${faker.string.numeric(10)}`,
                    email: `warehouse${i + 1}@${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
                    alternatePhone: i === 0 ? `+91${faker.string.numeric(10)}` : undefined
                },
                operatingHours: {
                    monday: { open: '09:00', close: '18:00' },
                    tuesday: { open: '09:00', close: '18:00' },
                    wednesday: { open: '09:00', close: '18:00' },
                    thursday: { open: '09:00', close: '18:00' },
                    friday: { open: '09:00', close: '18:00' },
                    saturday: { open: '10:00', close: '14:00' },
                    sunday: { open: null, close: null }
                },
                isActive: true,
                isDefault: isDefault,
                isDeleted: false
            });

            console.log(`  ✅ Created warehouse: ${company.name} ${company.city} ${suffix}`);
        }

        // Update company's defaultWarehouseId
        const defaultWarehouse = await Warehouse.findOne({ companyId: company._id, isDefault: true });
        if (defaultWarehouse) {
            await Company.findByIdAndUpdate(company._id, {
                'settings.defaultWarehouseId': defaultWarehouse._id
            });
        }
    }
}

async function seedKYC() {
    console.log('\n📋 Seeding KYC Records...');

    const sellerUsers = await User.find({ role: 'seller' });

    for (const user of sellerUsers) {
        if (!user.companyId) continue;

        const existing = await KYC.findOne({ userId: user._id, companyId: user.companyId });
        if (existing) {
            console.log(`  ⏭️  KYC for user "${user.email}" already exists, skipping`);
            continue;
        }

        const company = DEMO_COMPANIES.find(c => c._id.equals(user.companyId!));
        if (!company) continue;

        await KYC.create({
            userId: user._id,
            companyId: user.companyId,
            status: 'verified',
            documents: {
                pan: {
                    number: company.pan,
                    verified: true,
                    verifiedAt: new Date(),
                    name: user.name
                },
                gstin: {
                    number: company.gstin,
                    verified: true,
                    verifiedAt: new Date(),
                    businessName: company.name,
                    legalName: `${company.name} Private Limited`,
                    status: 'Active',
                    registrationType: 'Regular',
                    businessType: ['Retail'],
                    addresses: [{
                        type: 'Principal',
                        address: `${company.city}, ${company.state}`,
                        businessNature: 'Fashion Retail'
                    }],
                    registrationDate: '2020-01-15',
                    lastUpdated: new Date().toISOString()
                },
                bankAccount: {
                    accountNumber: faker.finance.accountNumber(14),
                    ifscCode: faker.helpers.arrayElement(['HDFC0001234', 'ICIC0002345', 'SBIN0003456']),
                    accountHolderName: company.name,
                    bankName: faker.helpers.arrayElement(['HDFC Bank', 'ICICI Bank', 'SBI']),
                    verified: true,
                    verifiedAt: new Date()
                }
            },
            completionStatus: {
                personalKycComplete: true,
                companyInfoComplete: true,
                bankDetailsComplete: true,
                agreementComplete: true
            }
        });

        console.log(`  ✅ Created KYC for: ${user.email}`);
    }
}

// ============================================================================
// SECTION 2: ORDERS & PRODUCTS
// ============================================================================

const FASHION_PRODUCTS = [
    { category: 'T-Shirt', namePrefix: 'Cotton', priceMin: 299, priceMax: 799, weightMin: 0.3, weightMax: 0.5, dims: { l: 30, w: 25, h: 5 } },
    { category: 'Jeans', namePrefix: 'Denim', priceMin: 999, priceMax: 2499, weightMin: 0.6, weightMax: 0.8, dims: { l: 35, w: 30, h: 8 } },
    { category: 'Kurta', namePrefix: 'Designer', priceMin: 799, priceMax: 2999, weightMin: 0.4, weightMax: 0.7, dims: { l: 40, w: 30, h: 6 } },
    { category: 'Sneakers', namePrefix: 'Sports', priceMin: 1499, priceMax: 4999, weightMin: 0.8, weightMax: 1.2, dims: { l: 35, w: 25, h: 15 } },
    { category: 'Saree', namePrefix: 'Silk', priceMin: 1999, priceMax: 9999, weightMin: 0.5, weightMax: 0.9, dims: { l: 30, w: 25, h: 8 } },
    { category: 'Dress', namePrefix: 'Evening', priceMin: 1299, priceMax: 5999, weightMin: 0.4, weightMax: 0.8, dims: { l: 40, w: 30, h: 7 } },
    { category: 'Jacket', namePrefix: 'Winter', priceMin: 1999, priceMax: 7999, weightMin: 0.7, weightMax: 1.1, dims: { l: 40, w: 35, h: 10 } }
];

const INDIAN_CITIES = [
    { city: 'Delhi', state: 'Delhi', pincode: '110001' },
    { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    { city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
    { city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    { city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
    { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' }
];

const STATUS_DISTRIBUTION = {
    pending: 50,
    processing: 30,
    shipped: 60,
    delivered: 50,
    cancelled: 7,
    rto: 3
};

async function seedOrders() {
    console.log('\n📦 Seeding Orders (200 total)...');

    const companies = await Company.find({ isDeleted: false });
    const warehouses = await Warehouse.find({ isDeleted: false });

    const now = new Date();
    const orders: any[] = [];

    let orderCounter = 0;

    // Generate orders for each status
    for (const [status, count] of Object.entries(STATUS_DISTRIBUTION)) {
        for (let i = 0; i < count; i++) {
            const company = faker.helpers.arrayElement(companies);
            const companyWarehouses = warehouses.filter(w => w.companyId.equals(company._id));
            const warehouse = faker.helpers.arrayElement(companyWarehouses);

            // Date distribution: more recent orders
            const daysAgo = faker.helpers.weightedArrayElement([
                { weight: 0.4, value: faker.number.int({ min: 0, max: 7 }) }, // 40% last 7 days
                { weight: 0.4, value: faker.number.int({ min: 8, max: 21 }) }, // 40% 8-21 days
                { weight: 0.2, value: faker.number.int({ min: 22, max: 30 }) } // 20% 22-30 days
            ]);
            const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

            // Generate products (1-3 items)
            const productCount = faker.helpers.weightedArrayElement([
                { weight: 0.6, value: 1 },
                { weight: 0.3, value: 2 },
                { weight: 0.1, value: 3 }
            ]);

            const products = [];
            let subtotal = 0;

            for (let p = 0; p < productCount; p++) {
                const product = faker.helpers.arrayElement(FASHION_PRODUCTS);
                const price = faker.number.int({ min: product.priceMin, max: product.priceMax });
                const quantity = faker.number.int({ min: 1, max: 2 });
                const weight = faker.number.float({ min: product.weightMin, max: product.weightMax, fractionDigits: 2 });

                products.push({
                    name: `${product.namePrefix} ${product.category}`,
                    sku: `SKU-${faker.string.alphanumeric(8).toUpperCase()}`,
                    quantity,
                    price,
                    weight,
                    dimensions: {
                        length: product.dims.l,
                        width: product.dims.w,
                        height: product.dims.h
                    }
                });

                subtotal += price * quantity;
            }

            // Customer address
            const customerCity = faker.helpers.arrayElement(INDIAN_CITIES);
            const paymentMethod = faker.helpers.weightedArrayElement([
                { weight: 0.6, value: 'cod' as const },
                { weight: 0.4, value: 'prepaid' as const }
            ]);

            const tax = Math.round(subtotal * 0.18); // 18% GST
            const total = subtotal + tax; // Shipping will be added when shipment created

            const order = {
                orderNumber: `ORD-${orderDate.getTime()}-${(++orderCounter).toString().padStart(4, '0')}`,
                companyId: company._id,
                customerInfo: {
                    name: faker.person.fullName(),
                    email: faker.internet.email(),
                    phone: `+91${faker.string.numeric(10)}`,
                    address: {
                        line1: faker.location.streetAddress(),
                        line2: faker.helpers.maybe(() => faker.location.secondaryAddress()),
                        city: customerCity.city,
                        state: customerCity.state,
                        country: 'India',
                        postalCode: customerCity.pincode
                    }
                },
                products,
                shippingDetails: {
                    shippingCost: 0
                },
                paymentStatus: paymentMethod === 'prepaid' ? 'paid' : 'pending',
                paymentMethod,
                source: 'manual',
                warehouseId: warehouse._id,
                statusHistory: [
                    {
                        status,
                        timestamp: orderDate,
                        comment: 'Order created'
                    }
                ],
                currentStatus: status,
                totals: {
                    subtotal,
                    tax,
                    shipping: 0,
                    discount: 0,
                    total
                },
                isDeleted: false,
                createdAt: orderDate,
                updatedAt: orderDate
            };

            orders.push(order);
        }
    }

    // Batch insert orders
    const existingCount = await Order.countDocuments();
    if (existingCount > 0) {
        console.log(`  ⏭️  Orders already exist (${existingCount}), skipping bulk insert`);
        console.log('  💡 To re-seed orders, drop the orders collection first');
    } else {
        await Order.insertMany(orders);
        console.log(`  ✅ Created ${orders.length} orders`);

        // Log status distribution
        console.log('  📊 Status distribution:');
        for (const [status, count] of Object.entries(STATUS_DISTRIBUTION)) {
            console.log(`     ${status}: ${count}`);
        }
    }
}

// ============================================================================
// SECTION 3: SHIPMENTS & CARRIER ASSIGNMENT
// ============================================================================

async function seedShipments() {
    console.log('\n🚚 Seeding Shipments...');

    // Only create shipments for shipped and delivered orders
    const ordersNeedingShipments = await Order.find({
        currentStatus: { $in: ['shipped', 'delivered'] },
        isDeleted: false
    });

    console.log(`  📊 Found ${ordersNeedingShipments.length} orders needing shipments`);

    const warehouses = await Warehouse.find({ isDeleted: false });
    const shipments: any[] = [];

    let ndrCount = 0;
    const MAX_NDR = 8;

    for (const order of ordersNeedingShipments) {
        // Check if shipment already exists
        const existing = await Shipment.findOne({ orderId: order._id });
        if (existing) continue;

        // Calculate total weight from products
        const totalWeight = order.products.reduce((sum: number, p: any) => sum + (p.weight * p.quantity), 0);

        // Get warehouse
        const warehouse = warehouses.find(w => (w._id as mongoose.Types.ObjectId).toString() === (order.warehouseId as mongoose.Types.ObjectId)?.toString());
        if (!warehouse) continue;

        const originPincode = warehouse.address.postalCode;
        const destPincode = order.customerInfo.address.postalCode;

        // Use carrier selection algorithm
        const { selectedCarrier, selectedRate, selectedDeliveryTime, selectedServiceType }
            = selectBestCarrier(totalWeight, originPincode, destPincode, 'standard');

        // Calculate dimensions
        const maxLength = Math.max(...order.products.map((p: any) => p.dimensions?.length || 30));
        const maxWidth = Math.max(...order.products.map((p: any) => p.dimensions?.width || 25));
        const totalHeight = order.products.reduce((sum: number, p: any) => sum + (p.dimensions?.height || 5), 0);

        // Timing
        const orderDate = new Date(order.createdAt);
        const pickupDate = new Date(orderDate.getTime() + faker.number.int({ min: 3, max: 6 }) * 60 * 60 * 1000);
        const inTransitDate = new Date(pickupDate.getTime() + faker.number.int({ min: 12, max: 24 }) * 60 * 60 * 1000);
        const estimatedDelivery = new Date(pickupDate.getTime() + selectedDeliveryTime * 24 * 60 * 60 * 1000);

        // Build status history
        const statusHistory: any[] = [
            {
                status: 'created',
                timestamp: orderDate,
                location: warehouse.address.city,
                description: 'Shipment created'
            },
            {
                status: 'picked',
                timestamp: pickupDate,
                location: warehouse.address.city,
                description: 'Package picked up'
            },
            {
                status: 'in_transit',
                timestamp: inTransitDate,
                location: faker.helpers.arrayElement(['Mumbai Hub', 'Delhi Hub', 'Bangalore Hub']),
                description: 'In transit'
            }
        ];

        let currentStatus = 'in_transit';
        let actualDelivery = undefined;
        let ndrDetails = undefined;

        if (order.currentStatus === 'delivered') {
            const outForDeliveryDate = new Date(inTransitDate.getTime() + faker.number.int({ min: 24, max: 48 }) * 60 * 60 * 1000);
            actualDelivery = new Date(outForDeliveryDate.getTime() + faker.number.int({ min: 2, max: 8 }) * 60 * 60 * 1000);

            statusHistory.push(
                {
                    status: 'out_for_delivery',
                    timestamp: outForDeliveryDate,
                    location: order.customerInfo.address.city,
                    description: 'Out for delivery'
                },
                {
                    status: 'delivered',
                    timestamp: actualDelivery,
                    location: order.customerInfo.address.city,
                    description: 'Delivered successfully'
                }
            );
            currentStatus = 'delivered';
        } else if (ndrCount < MAX_NDR && faker.helpers.maybe(() => true, { probability: 0.1 })) {
            ndrCount++;
            const ndrDate = estimatedDelivery;
            const ndrReason = faker.helpers.arrayElement([
                'Customer unavailable',
                'Incorrect address',
                'Customer refused delivery',
                'Premises locked'
            ]);

            statusHistory.push({
                status: 'ndr',
                timestamp: ndrDate,
                location: order.customerInfo.address.city,
                description: ndrReason
            });

            currentStatus = 'ndr';
            ndrDetails = {
                ndrReason,
                ndrDate,
                ndrStatus: 'pending' as const,
                ndrAttempts: 1,
                ndrComments: 'First delivery attempt failed'
            };
        }

        shipments.push({
            trackingNumber: `SHP-${Date.now()}-${faker.string.alphanumeric(4).toUpperCase()}`,
            orderId: order._id,
            companyId: order.companyId,
            carrier: selectedCarrier,
            serviceType: selectedServiceType,
            packageDetails: {
                weight: totalWeight,
                dimensions: { length: maxLength, width: maxWidth, height: totalHeight },
                packageCount: 1,
                packageType: 'box',
                declaredValue: order.totals.subtotal
            },
            pickupDetails: {
                warehouseId: order.warehouseId,
                pickupDate,
                contactPerson: warehouse.contactInfo.name,
                contactPhone: warehouse.contactInfo.phone
            },
            deliveryDetails: {
                recipientName: order.customerInfo.name,
                recipientPhone: order.customerInfo.phone,
                recipientEmail: order.customerInfo.email,
                address: order.customerInfo.address
            },
            paymentDetails: {
                type: order.paymentMethod,
                codAmount: order.paymentMethod === 'cod' ? order.totals.total : undefined,
                shippingCost: selectedRate,
                currency: 'INR'
            },
            statusHistory,
            currentStatus,
            estimatedDelivery,
            actualDelivery,
            carrierDetails: {
                carrierTrackingNumber: `${selectedCarrier.substring(0, 3).toUpperCase()}${Date.now()}`,
                carrierServiceType: selectedServiceType
            },
            ndrDetails,
            isDeleted: false,
            createdAt: orderDate,
            updatedAt: new Date()
        });

        // Update order with shipping
        order.totals.shipping = selectedRate;
        order.totals.total = order.totals.subtotal + order.totals.tax + selectedRate;
        order.shippingDetails.provider = selectedCarrier;
        order.shippingDetails.trackingNumber = shipments[shipments.length - 1].trackingNumber;
        order.shippingDetails.shippingCost = selectedRate;
        await order.save();
    }

    if (shipments.length > 0) {
        await Shipment.insertMany(shipments);
        console.log(`  ✅ Created ${shipments.length} shipments`);

        const carrierCounts = shipments.reduce((acc: any, s: any) => {
            acc[s.carrier] = (acc[s.carrier] || 0) + 1;
            return acc;
        }, {});

        console.log('  🚚 Carrier distribution:');
        Object.entries(carrierCounts).forEach(([carrier, count]) => {
            console.log(`     ${carrier}: ${count} (${((count as number) / shipments.length * 100).toFixed(1)}%)`);
        });
        console.log(`  ⚠️  NDR cases: ${ndrCount}`);
    }
}

// ============================================================================
// SECTION 4: ZONES & RATE CARDS
// ============================================================================

async function seedZonesAndRateCards() {
    console.log('\n🗺️  Seeding Zones and Rate Cards...');

    const companies = await Company.find({ isDeleted: false });

    for (const company of companies) {
        const companyData = DEMO_COMPANIES.find(c => c._id.toString() === company._id.toString());
        if (!companyData) continue;

        // Create zones
        const companyZones: any[] = [];
        const zoneTemplates = [
            { name: 'Local', pincodes: [companyData.postalCode, `${companyData.postalCode.slice(0, 3)}002`] },
            { name: 'Zonal', pincodes: ['110001', '122001', '201001'] },
            { name: 'Metro', pincodes: ['110001', '400001', '560001', '600001'] },
            { name: 'ROI', pincodes: ['121001', '302001', '380001', '462001'] }
        ];

        for (const template of zoneTemplates) {
            const zoneName = `${company.name} - ${template.name}`;
            const existing = await Zone.findOne({ name: zoneName });

            if (!existing) {
                const zone = await Zone.create({
                    name: zoneName,
                    companyId: company._id,
                    postalCodes: template.pincodes,
                    serviceability: {
                        carriers: ['Delhivery', 'DTDC', 'Xpressbees'],
                        serviceTypes: ['express', 'standard']
                    },
                    transitTimes: [
                        { carrier: 'Delhivery', serviceType: 'standard', minDays: 2, maxDays: 3 },
                        { carrier: 'DTDC', serviceType: 'standard', minDays: 3, maxDays: 4 },
                        { carrier: 'Xpressbees', serviceType: 'standard', minDays: 4, maxDays: 5 }
                    ],
                    isDeleted: false
                });
                companyZones.push(zone);
            } else {
                companyZones.push(existing);
            }
        }

        // Create rate cards
        const rateCardTemplates = [
            { name: 'Standard', multiplier: 1.0 },
            { name: 'Express', multiplier: 1.2 },
            { name: 'Economy', multiplier: 0.85 }
        ];

        for (const template of rateCardTemplates) {
            const rateCardName = `${company.name} - ${template.name}`;
            const existing = await RateCard.findOne({ name: rateCardName });

            if (!existing) {
                const rateCard = await RateCard.create({
                    name: rateCardName,
                    companyId: company._id,
                    baseRates: [
                        { carrier: 'Delhivery', serviceType: 'standard', basePrice: Math.round(40 * template.multiplier), minWeight: 0, maxWeight: 0.5 },
                        { carrier: 'Delhivery', serviceType: 'standard', basePrice: Math.round(50 * template.multiplier), minWeight: 0.5, maxWeight: 1.0 },
                        { carrier: 'DTDC', serviceType: 'standard', basePrice: Math.round(45 * template.multiplier), minWeight: 0, maxWeight: 0.5 },
                        { carrier: 'Xpressbees', serviceType: 'standard', basePrice: Math.round(35 * template.multiplier), minWeight: 0, maxWeight: 0.5 }
                    ],
                    weightRules: [
                        { minWeight: 0, maxWeight: 0.5, pricePerKg: Math.round(20 * template.multiplier) },
                        { minWeight: 0.5, maxWeight: 1.0, pricePerKg: Math.round(18 * template.multiplier) }
                    ],
                    zoneRules: companyZones.map((zone, idx) => ({
                        zoneId: zone._id,
                        carrier: 'Delhivery',
                        serviceType: 'standard',
                        additionalPrice: idx * 10,
                        transitDays: 2 + idx
                    })),
                    effectiveDates: {
                        startDate: new Date('2024-01-01')
                    },
                    status: 'active',
                    version: 1,
                    isDeleted: false
                });

                if (template.name === 'Standard') {
                    await Company.findByIdAndUpdate(company._id, {
                        'settings.defaultRateCardId': rateCard._id
                    });
                }
            }
        }
    }

    console.log('  ✅ Zones and rate cards created for all companies');
}

// ============================================================================
// Main execution
// ============================================================================

async function runSeed() {
    console.log('🌱 Starting Shipcrowd Seed Data Script');
    console.log('='.repeat(60));

    await connectDB();

    try {
        // Clean database first
        await cleanDatabase();

        // Section 1: Core entities
        await seedCompanies();
        await seedUsers();
        await seedWarehouses();
        await seedKYC();

        // Section 2: Orders
        await seedOrders();

        // Section 3: Shipments
        await seedShipments();

        // Section 4: Zones & Rate Cards
        await seedZonesAndRateCards();

        console.log('\n' + '='.repeat(60));
        console.log('✅ Seed script completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('  1. Run verification: npm run verify-seed');
        console.log('  2. Test login: demo@shipcrowd.com / Demo@2024');
        console.log('\n');

    } catch (error) {
        console.error('\n❌ Seed script failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB\n');
    }
}

// Run if called directly
if (require.main === module) {
    runSeed();
}

export default runSeed;
