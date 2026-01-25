import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../src/app';
import { User } from '../../../src/infrastructure/database/mongoose/models';
import { Company } from '../../../src/infrastructure/database/mongoose/models';
import { KYC } from '../../../src/infrastructure/database/mongoose/models';
import { generateAccessToken as generateToken } from '../../../src/shared/helpers/jwt';
import { KYCState } from '../../../src/core/domain/types/kyc-state';

describe('Cross-Company KYC Security', () => {
    let userA: any;
    let companyA: any;
    let companyB: any;
    let kycA: any;
    let tokenA: string;
    let tokenB: string;

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

        // Create User A
        userA = await User.create({
            email: 'userA@test.com',
            password: 'SecurePass123!',
            name: 'User A',
            role: 'seller',
            isEmailVerified: true,
            kycStatus: {
                isComplete: false,
                lastUpdated: new Date()
            }
        });

        // Create Company A (owned by User A)
        companyA = await Company.create({
            name: 'Company A',
            owner: userA._id,
            legalName: 'Company A Legal',
            businessType: 'private_limited',
            gstin: 'GSTIN123456789',
            pan: 'PANCARD123',
            status: 'active'
        });

        // Link User A to Company A
        userA.companyId = companyA._id;
        await userA.save();

        // Create KYC for User A in Company A and verify it
        kycA = await KYC.create({
            userId: userA._id,
            companyId: companyA._id,
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

        // Update user KYC status
        userA.kycStatus.isComplete = true;
        await userA.save();

        // Create Company B (different owner)
        const ownerB = await User.create({
            email: 'ownerB@test.com',
            password: 'SecurePass123!',
            name: 'Owner B',
            role: 'seller',
            isEmailVerified: true
        });

        companyB = await Company.create({
            name: 'Company B',
            owner: ownerB._id,
            legalName: 'Company B Legal',
            businessType: 'private_limited',
            gstin: 'GSTIN987654321',
            pan: 'PANCARD987',
            status: 'active'
        });

        // Generate tokens
        tokenA = generateToken(userA._id.toString(), 'seller', companyA._id.toString());
        tokenB = generateToken(userA._id.toString(), 'seller', companyB._id.toString());
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Company.deleteMany({});
        await KYC.deleteMany({});
        await mongoose.connection.close();
    });

    describe('🔴 CRITICAL: Cross-Company KYC Bypass Prevention', () => {
        it('should block KYC-protected routes when user switches to company without KYC', async () => {
            // User A has verified KYC for Company A
            // Now try to create order in Company B (no KYC for Company B)
            const response = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${tokenB}`)
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

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('KYC_REQUIRED_FOR_COMPANY');
            expect(response.body.message).toContain('Complete KYC verification for this company');
        });

        it('should allow access when KYC exists for current company', async () => {
            // Token for Company A (has verified KYC)
            const response = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${tokenA}`)
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

            // Should succeed (201) or fail with validation error (400), but NOT 403
            expect([200, 201, 400]).toContain(response.status);
            if (response.status === 403) {
                throw new Error(`Expected order creation to succeed or fail validation, but got 403: ${JSON.stringify(response.body)}`);
            }
        });

        it('should not leak KYC data across companies', async () => {
            // Try to access KYC details with Company B token
            const response = await request(app)
                .get('/api/v1/kyc')
                .set('Authorization', `Bearer ${tokenB}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('KYC_NOT_FOUND');
        });

        it('should return correct KYC for current company', async () => {
            // Access KYC with Company A token
            const response = await request(app)
                .get('/api/v1/kyc')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.companyId.toString()).toBe(companyA._id.toString());
            expect(response.body.data.state).toBe(KYCState.VERIFIED);
        });

        it('should block shipment creation in company without KYC', async () => {
            const response = await request(app)
                .post('/api/v1/shipments')
                .set('Authorization', `Bearer ${tokenB}`)
                .send({
                    orderId: new mongoose.Types.ObjectId(),
                    courierId: new mongoose.Types.ObjectId()
                })
                .expect(403);

            expect(response.body.code).toBe('KYC_REQUIRED_FOR_COMPANY');
        });

        it('should block warehouse creation in company without KYC', async () => {
            const response = await request(app)
                .post('/api/v1/warehouses')
                .set('Authorization', `Bearer ${tokenB}`)
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

    describe('Multi-Company User Scenarios', () => {
        it('should handle user with KYC in multiple companies correctly', async () => {
            // Create KYC for User A in Company B
            const kycB = await KYC.create({
                userId: userA._id,
                companyId: companyB._id,
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

            // Now User A should be able to create orders in both companies
            const responseA = await request(app)
                .get('/api/v1/kyc')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);

            const responseB = await request(app)
                .get('/api/v1/kyc')
                .set('Authorization', `Bearer ${tokenB}`)
                .expect(200);

            expect(responseA.body.data.companyId.toString()).toBe(companyA._id.toString());
            expect(responseB.body.data.companyId.toString()).toBe(companyB._id.toString());
        });
    });
});
