import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../src/app';
import { User } from '../../../src/infrastructure/database/mongoose/models';
import { Company } from '../../../src/infrastructure/database/mongoose/models';
import { KYC } from '../../../src/infrastructure/database/mongoose/models';
import { generateAccessToken as generateToken } from '../../../src/shared/helpers/jwt';
import { AccessTier } from '../../../src/core/domain/types/access-tier';
import { KYCState } from '../../../src/core/domain/types/kyc-state';

describe('Tiered Access Control', () => {
    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/Shipcrowd-test');
        }
    });

    beforeEach(async () => {
        // Clear relevant collections
        await User.deleteMany({});
        await Company.deleteMany({});
        await KYC.deleteMany({});
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Company.deleteMany({});
        await KYC.deleteMany({});
        await mongoose.connection.close();
    });

    describe('Explorer Tier (No Auth)', () => {
        it('should return 404 for removed legacy rates endpoint', async () => {
            const response = await request(app)
                .post('/api/v1/rates/calculate')
                .send({
                    weight: 1,
                    destination: '110001',
                    origin: '400001'
                });

            expect(response.status).toBe(404);
        });

        it('should require auth for courier recommendations', async () => {
            const response = await request(app)
                .post('/api/v1/courier/recommendations')
                .send({
                    pickupPincode: '560001',
                    deliveryPincode: '110001',
                    weight: 1,
                    paymentMode: 'prepaid'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('Authenticated Tier (Email Verified)', () => {
        let user: any;
        let company: any;
        let token: string;

        beforeEach(async () => {
            // Create user with verified email but no KYC
            user = await User.create({
                email: 'authenticated@test.com',
                password: 'SecurePass123!',
                name: 'Authenticated User',
                role: 'seller',
                isEmailVerified: true,
                kycStatus: {
                    isComplete: false,
                    lastUpdated: new Date()
                }
            });

            company = await Company.create({
                name: 'Authenticated Company',
                owner: user._id,
                legalName: 'Authenticated Company Legal',
                businessType: 'private_limited',
                status: 'profile_complete',
                profileStatus: 'complete'
            });

            user.companyId = company._id;
            await user.save();

            token = generateToken(user._id.toString(), 'seller', company._id.toString());
        });

        it('should allow access to user profile', async () => {
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('authenticated@test.com');
        });

        it('should block production features without KYC', async () => {
            const response = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    pickupWarehouseId: new mongoose.Types.ObjectId(),
                    deliveryAddress: {
                        name: 'Test Customer',
                        phone: '9876543210',
                        addressLine1: '123 Test St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India'
                    },
                    items: [{
                        name: 'Test Product',
                        quantity: 1,
                        price: 100,
                        weight: 0.5
                    }],
                    paymentMode: 'prepaid'
                })
                .expect(403);

            expect(response.body.code).toBe('INSUFFICIENT_ACCESS_TIER');
            if (response.body.currentTier) {
                expect(response.body.currentTier).toBe(AccessTier.SANDBOX);
            }
            if (response.body.requiredTier) {
                expect(response.body.requiredTier).toBe(AccessTier.PRODUCTION);
            }
        });
    });

    describe('Sandbox Tier (Email Verified + Company)', () => {
        let user: any;
        let company: any;
        let token: string;

        beforeEach(async () => {
            user = await User.create({
                email: 'sandbox@test.com',
                password: 'SecurePass123!',
                name: 'Sandbox User',
                role: 'seller',
                isEmailVerified: true,
                kycStatus: {
                    isComplete: false,
                    lastUpdated: new Date()
                }
            });

            company = await Company.create({
                name: 'Sandbox Company',
                owner: user._id,
                legalName: 'Sandbox Company Legal',
                businessType: 'private_limited',
                status: 'profile_complete',
                profileStatus: 'complete'
            });

            user.companyId = company._id;
            await user.save();

            token = generateToken(user._id.toString(), 'seller', company._id.toString());
        });

        it('should allow viewing shipments in sandbox mode', async () => {
            const response = await request(app)
                .get('/api/v1/shipments')
                .set('Authorization', `Bearer ${token}`);

            // Should succeed (200) or return empty list, but NOT 403
            expect([200, 404]).toContain(response.status);
            if (response.status === 403) {
                throw new Error('Sandbox users should be able to view shipments');
            }
        });

        it('should allow viewing warehouses in sandbox mode', async () => {
            const response = await request(app)
                .get('/api/v1/warehouses')
                .set('Authorization', `Bearer ${token}`);

            // Should succeed (200) or return empty list, but NOT 403
            expect([200, 404]).toContain(response.status);
            if (response.status === 403) {
                throw new Error('Sandbox users should be able to view warehouses');
            }
        });

        it('should block production order creation without KYC', async () => {
            const response = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    pickupWarehouseId: new mongoose.Types.ObjectId(),
                    deliveryAddress: {
                        name: 'Test Customer',
                        phone: '9876543210',
                        addressLine1: '123 Test St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India'
                    },
                    items: [{
                        name: 'Test Product',
                        quantity: 1,
                        price: 100,
                        weight: 0.5
                    }],
                    paymentMode: 'prepaid'
                })
                .expect(403);

            expect(response.body.code).toBe('INSUFFICIENT_ACCESS_TIER');
            if (response.body.requiredTier) {
                expect(response.body.requiredTier).toBe(AccessTier.PRODUCTION);
            }
        });

        it('should block warehouse creation without KYC', async () => {
            const response = await request(app)
                .post('/api/v1/warehouses')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Test Warehouse',
                    address: {
                        addressLine1: '123 Warehouse St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India'
                    }
                })
                .expect(403);

            expect(response.body.code).toBe('INSUFFICIENT_ACCESS_TIER');
        });
    });

    describe('Production Tier (KYC Complete)', () => {
        let user: any;
        let company: any;
        let kyc: any;
        let token: string;

        beforeEach(async () => {
            user = await User.create({
                email: 'production@test.com',
                password: 'SecurePass123!',
                name: 'Production User',
                role: 'seller',
                isEmailVerified: true,
                kycStatus: {
                    isComplete: true,
                    lastUpdated: new Date()
                }
            });

            company = await Company.create({
                name: 'Production Company',
                owner: user._id,
                legalName: 'Production Company Legal',
                businessType: 'private_limited',
                gstin: 'GSTIN123456789',
                pan: 'PANCARD123',
                status: 'profile_complete',
                profileStatus: 'complete'
            });

            user.companyId = company._id;
            await user.save();

            kyc = await KYC.create({
                userId: user._id,
                companyId: company._id,
                state: KYCState.VERIFIED,
                status: 'verified',
                documents: {
                    pan: {
                        number: 'PANCARD123',
                        verified: true,
                        verifiedAt: new Date()
                    },
                    aadhaar: {
                        number: '123456789012',
                        verified: true,
                        verifiedAt: new Date()
                    },
                    gstin: {
                        number: 'GSTIN123456789',
                        verified: true,
                        verifiedAt: new Date()
                    }
                },
                agreement: {
                    accepted: true,
                    acceptedAt: new Date()
                }
            });

            token = generateToken(user._id.toString(), 'seller', company._id.toString());
        });

        it('should allow real order creation', async () => {
            const response = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    pickupWarehouseId: new mongoose.Types.ObjectId(),
                    deliveryAddress: {
                        name: 'Test Customer',
                        phone: '9876543210',
                        addressLine1: '123 Test St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India'
                    },
                    items: [{
                        name: 'Test Product',
                        quantity: 1,
                        price: 100,
                        weight: 0.5
                    }],
                    paymentMode: 'prepaid'
                });

            // Should succeed (201) or fail with validation (400), but NOT 403
            expect([200, 201, 400]).toContain(response.status);
            if (response.status === 403) {
                throw new Error(`Production user should be able to create orders, got: ${JSON.stringify(response.body)}`);
            }
        });

        it('should allow warehouse creation', async () => {
            const response = await request(app)
                .post('/api/v1/warehouses')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Production Warehouse',
                    address: {
                        addressLine1: '123 Warehouse St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India'
                    },
                    contactPerson: {
                        name: 'Warehouse Manager',
                        phone: '9876543210',
                        email: 'manager@warehouse.com'
                    }
                });

            // Should succeed (201) or fail with validation (400), but NOT 403
            expect([200, 201, 400]).toContain(response.status);
            if (response.status === 403) {
                throw new Error(`Production user should be able to create warehouses, got: ${JSON.stringify(response.body)}`);
            }
        });

        it('should allow shipment creation', async () => {
            const response = await request(app)
                .post('/api/v1/shipments')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    orderId: new mongoose.Types.ObjectId(),
                    courierId: new mongoose.Types.ObjectId()
                });

            // Should succeed (201) or fail with validation (400), but NOT 403
            expect([200, 201, 400, 404]).toContain(response.status);
            if (response.status === 403) {
                throw new Error(`Production user should be able to create shipments, got: ${JSON.stringify(response.body)}`);
            }
        });

        it('should have full access to all features', async () => {
            // Test multiple endpoints
            const endpoints = [
                { method: 'get', path: '/api/v1/orders' },
                { method: 'get', path: '/api/v1/shipments' },
                { method: 'get', path: '/api/v1/warehouses' },
                { method: 'get', path: '/api/v1/kyc' }
            ];

            for (const endpoint of endpoints) {
                const response = await (request(app) as any)[endpoint.method](endpoint.path)
                    .set('Authorization', `Bearer ${token}`);

                expect([200, 404]).toContain(response.status);
                if (response.status === 403) {
                    throw new Error(`Production user should have access to ${endpoint.path}`);
                }
            }
        });
    });

    describe('Tier Upgrade Flow', () => {
        it('should upgrade from Authenticated to Production after KYC', async () => {
            // Create user without KYC
            const user = await User.create({
                email: 'upgrade@test.com',
                password: 'SecurePass123!',
                name: 'Upgrade User',
                role: 'seller',
                isEmailVerified: true,
                kycStatus: {
                    isComplete: false,
                    lastUpdated: new Date()
                }
            });

            const company = await Company.create({
                name: 'Upgrade Company',
                owner: user._id,
                legalName: 'Upgrade Company Legal',
                businessType: 'private_limited',
                status: 'profile_complete',
                profileStatus: 'complete'
            });

            user.companyId = company._id;
            await user.save();

            let token = generateToken((user as any)._id.toString(), 'seller', (company as any)._id.toString());

            // Should be blocked from production features
            let response = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    pickupWarehouseId: new mongoose.Types.ObjectId(),
                    deliveryAddress: {
                        name: 'Test Customer',
                        phone: '9876543210',
                        addressLine1: '123 Test St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India'
                    },
                    items: [{
                        name: 'Test Product',
                        quantity: 1,
                        price: 100,
                        weight: 0.5
                    }],
                    paymentMode: 'prepaid'
                })
                .expect(403);

            expect(response.body.code).toBe('INSUFFICIENT_ACCESS_TIER');

            // Complete KYC
            await KYC.create({
                userId: user._id,
                companyId: company._id,
                state: KYCState.VERIFIED,
                status: 'verified',
                documents: {
                    pan: {
                        number: 'PANCARD123',
                        verified: true,
                        verifiedAt: new Date()
                    }
                },
                agreement: {
                    accepted: true,
                    acceptedAt: new Date()
                }
            });

            user.kycStatus.isComplete = true;
            await user.save();

            // Generate new token
            token = generateToken((user as any)._id.toString(), 'seller', (company as any)._id.toString());

            // Should now have access to production features
            response = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    pickupWarehouseId: new mongoose.Types.ObjectId(),
                    deliveryAddress: {
                        name: 'Test Customer',
                        phone: '9876543210',
                        addressLine1: '123 Test St',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        pincode: '400001',
                        country: 'India'
                    },
                    items: [{
                        name: 'Test Product',
                        quantity: 1,
                        price: 100,
                        weight: 0.5
                    }],
                    paymentMode: 'prepaid'
                });

            // Should succeed or fail with validation, but NOT 403
            expect([200, 201, 400]).toContain(response.status);
        });
    });
});
