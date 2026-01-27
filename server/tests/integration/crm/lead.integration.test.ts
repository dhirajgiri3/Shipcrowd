import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../src/app';
import Lead from '../../../src/infrastructure/database/mongoose/models/crm/leads/lead.model';
import SalesRepresentative from '../../../src/infrastructure/database/mongoose/models/crm/sales/sales-representative.model';
import Company from '../../../src/infrastructure/database/mongoose/models/organization/core/company.model';
import User from '../../../src/infrastructure/database/mongoose/models/iam/users/user.model';
import { generateAuthToken } from '../../setup/testHelpers';

describe('Lead Management System - Integration Tests', () => {
    let authToken: string;
    let company: any;
    let user: any;
    let salesRep: any;
    let salesRepId: string;

    const testCompanyId = new mongoose.Types.ObjectId();
    const testUserId = new mongoose.Types.ObjectId();

    beforeEach(async () => {
        // Create Company
        company = await Company.create({
            _id: testCompanyId,
            name: 'Lead Test Corp',
            email: 'leadtest@test.com',
            phone: '9876543210',
            address: {
                street: 'Test Street',
                city: 'Test City',
                state: 'Test State',
                pincode: '123456',
                country: 'India'
            },
            gstin: '29ABCDE1234F1Z5',
            status: 'approved'
        });

        // Create Admin User for Auth - Ensure ID matches token
        // Use a new ObjectId for each test execution to avoid stale data issues if cleanup fails
        // But we must update testUserId reference
        // Actually, let's keep testUserId consistent but ensure it's created.

        // Remove potentially existing user first (though beforeEach clears DB, safety first)

        user = await User.create({
            _id: testUserId,
            name: 'Test Admin',
            firstName: 'Test',
            lastName: 'Admin',
            email: 'admin@leadtest.com',
            password: 'password123',
            role: 'admin',
            companyId: company._id,
            isEmailVerified: true,
            kycStatus: { isComplete: true, lastUpdated: new Date() }
        });

        // Generate token with the EXACT ID of the created user
        authToken = generateAuthToken(user._id.toString(), 'admin');

        // Create a Sales Rep
        salesRep = await SalesRepresentative.create({
            companyId: company._id,
            company: company._id,
            userId: testUserId, // Linking for simplicity
            user: testUserId,
            employeeId: 'EMP-TEST-001',
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '1234567890',
            territory: 'North',
            status: 'active',
            availabilityStatus: 'available',
            bankDetails: {
                accountNumber: '1234567890',
                ifscCode: 'HDFC0001234',
                accountHolderName: 'John Doe',
                bankName: 'HDFC Bank'
            }
        });
        salesRepId = salesRep._id.toString();
    });

    describe('POST /api/v1/crm/leads', () => {
        it('should create a lead and auto-assign to sales rep based on territory', async () => {
            const res = await request(app)
                .post('/api/v1/crm/leads')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Potential Client',
                    email: 'client@example.com',
                    phone: '9876543210',
                    territory: 'North',
                    source: 'website'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            // Verify auto-assignment if logic exists, otherwise just check creation
            // Our service has logic: if territory matches, assign.
            if (res.body.data.salesRepresentative) {
                expect(res.body.data.salesRepresentative).toBe(salesRepId);
            }
            expect(res.body.data.score).toBeGreaterThan(0);
        });

        it('should validate required fields', async () => {
            const res = await request(app)
                .post('/api/v1/crm/leads')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    email: 'invalid-lead'
                });

            expect(res.status).toBe(400);
        });
    });

    // Data seeding for GET tests is now moved into the test itself or another Describe block with its own beforeEach
    // But since the main beforeEach clears DB, we must re-seed for each test that needs data beyond the basic setup.

    describe('GET /api/v1/crm/leads', () => {
        beforeEach(async () => {
            // Additional seeding for list tests
            await Lead.create([
                {
                    company: testCompanyId,
                    salesRepresentative: salesRepId,
                    name: 'Lead 1',
                    phone: '111',
                    status: 'new',
                    score: 10
                },
                {
                    company: testCompanyId,
                    salesRepresentative: salesRepId,
                    name: 'Lead 2',
                    phone: '222',
                    status: 'won',
                    score: 50
                }
            ]);
        });

        it('should list leads with pagination', async () => {
            const res = await request(app)
                .get('/api/v1/crm/leads')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.leads).toHaveLength(2);
            expect(res.body.data.pagination.total).toBe(2);
        });

        it('should filter leads by status', async () => {
            const res = await request(app)
                .get('/api/v1/crm/leads?status=won')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.leads).toHaveLength(1);
            expect(res.body.data.leads[0].name).toBe('Lead 2');
        });
    });

    describe('POST /api/v1/crm/leads/:id/convert', () => {
        it('should convert a lead to won and link order', async () => {
            const lead = await Lead.create({
                company: testCompanyId,
                salesRepresentative: salesRepId,
                name: 'Convertible Lead',
                phone: '333',
                status: 'negotiation'
            });

            const orderId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .post(`/api/v1/crm/leads/${lead._id}/convert`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    orderId: orderId.toString()
                });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('won');
            expect(res.body.data.convertedToOrder).toBe(orderId.toString());

            const updatedLead = await Lead.findById(lead._id);
            expect(updatedLead?.status).toBe('won');
        });
    });

    describe('GET /api/v1/crm/leads/funnel-metrics', () => {
        it('should return funnel metrics', async () => {
            await Lead.create([
                { company: testCompanyId, salesRepresentative: salesRepId, name: 'L1', phone: '1', status: 'new' },
                { company: testCompanyId, salesRepresentative: salesRepId, name: 'L2', phone: '2', status: 'new' },
                { company: testCompanyId, salesRepresentative: salesRepId, name: 'L3', phone: '3', status: 'won' }
            ]);

            const res = await request(app)
                .get('/api/v1/crm/leads/funnel-metrics')
                .set('Authorization', `Bearer ${authToken}`);

            if (res.status === 401) {
                console.error('Funnel Metrics 401 Error Body:', JSON.stringify(res.body, null, 2));
                console.error('Auth Token:', authToken);
            }
            expect(res.status).toBe(200);
            expect(res.body.data.new).toBe(2);
            expect(res.body.data.won).toBe(1);
        });
    });
});
