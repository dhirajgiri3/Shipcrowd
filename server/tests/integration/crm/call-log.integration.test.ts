import mongoose from 'mongoose';
import request from 'supertest';
import app from '@/app';
import { generateAuthToken } from '@/../tests/setup/testHelpers';
import CallLog from '@/infrastructure/database/mongoose/models/crm/communication/call-log.model';
import SalesRepresentative from '@/infrastructure/database/mongoose/models/crm/sales/sales-representative.model';
import CallLogService from '@/core/application/services/crm/communication/CallLogService';
import User from '@/infrastructure/database/mongoose/models/iam/users/user.model';
import Company from '@/infrastructure/database/mongoose/models/organization/core/company.model';

describe('Call Log System - Integration Tests', () => {
    let company: any;
    let salesRepUser: any;
    let adminUser: any;
    let salesRep: any;
    let adminToken: string;
    let salesRepToken: string;

    const testCompanyId = new mongoose.Types.ObjectId();
    const testAdminId = new mongoose.Types.ObjectId();
    const testRepUserId = new mongoose.Types.ObjectId();

    beforeEach(async () => {
        // Create Company
        company = await Company.create({
            _id: testCompanyId,
            name: 'CallLog Test Corp',
            email: 'calllogtest@test.com',
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

        // Create Admin User
        adminUser = await User.create({
            _id: testAdminId,
            name: 'Admin User',
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@calllogtest.com',
            password: 'password123',
            role: 'admin',
            companyId: company._id,
            isEmailVerified: true,
            kycStatus: { isComplete: true, lastUpdated: new Date() }
        });
        adminToken = generateAuthToken(adminUser._id.toString(), 'admin');

        // Create Sales Rep User
        salesRepUser = await User.create({
            _id: testRepUserId,
            name: 'Rep User',
            firstName: 'Rep',
            lastName: 'User',
            email: 'rep@calllogtest.com',
            password: 'password123',
            role: 'staff',
            companyId: company._id,
            isEmailVerified: true,
            kycStatus: { isComplete: true, lastUpdated: new Date() }
        });
        salesRepToken = generateAuthToken(salesRepUser._id.toString(), 'staff');

        // Create Sales Representative Linked to Rep User
        salesRep = await SalesRepresentative.create({
            company: company._id,
            companyId: company._id,
            user: salesRepUser._id,
            userId: salesRepUser._id,
            employeeId: 'EMP-LOG-TEST',
            role: 'rep',
            name: 'John Sales',
            email: 'john.sales@test.com',
            phone: '9876543210',
            territory: ['North-East'],
            status: 'active',
            availabilityStatus: 'available',
            bankDetails: {
                accountNumber: '1234567890',
                ifscCode: 'HDFC0001234',
                accountHolderName: 'John Sales',
                bankName: 'HDFC Bank'
            }
        });
    });

    describe('Call Log Creation (Manual)', () => {
        it('should create a call log and auto-assign to available rep', async () => {
            const payload = {
                companyId: company._id.toString(),
                shipmentId: 'SHIP-1001',
                direction: 'outbound',
                notes: 'Manual follow up'
            };

            const res = await request(app)
                .post('/api/v1/crm/call-logs')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.shipmentId).toBe('SHIP-1001');
            expect(res.body.data.salesRepId).toBe(salesRep._id.toString());
            expect(res.body.data.status).toBe('pending');

            // Verify DB state (using the imported CallLog model)
            const dbLog = await CallLog.findById(res.body.data._id);
            expect(dbLog).toBeDefined();
            expect(dbLog?.salesRepId.toString()).toBe(salesRep._id.toString());
        });
    });

    describe('Call Log Retrieval', () => {
        it('should retrieve logs for a specific sales rep', async () => {
            // Seed a log first
            await CallLogService.getInstance().createCallLog({
                companyId: company._id.toString(),
                shipmentId: 'SHIP-RETRIEVE-1',
                direction: 'outbound',
                notes: 'Seeded log for retrieval'
            });

            const res = await request(app)
                .get('/api/v1/crm/call-logs')
                .query({ salesRepId: salesRep._id.toString() })
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            expect(res.body.data[0].salesRepId).toBe(salesRep._id.toString());
        });
    });

    describe('Call Outcome Update', () => {
        it('should update the outcome of a call log', async () => {
            const log = await CallLogService.getInstance().createCallLog({
                companyId: company._id.toString(),
                shipmentId: 'SHIP-UPDATE-TEST'
            });

            const updatePayload = {
                outcome: 'connected',
                notes: 'Customer agreed to receive shipment',
                duration: 120
            };

            const res = await request(app)
                .patch(`/api/v1/crm/call-logs/${log._id}/outcome`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updatePayload);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.outcome).toBe('connected');
            expect(res.body.data.status).toBe('completed');
            expect(res.body.data.duration).toBe(120);
        });
    });

    describe('Auto-Assignment Logic', () => {
        it('should assign multiple calls to the same available rep if only one exists', async () => {
            const payload1 = { companyId: company._id.toString(), shipmentId: 'SHIP-AUTO-1' };
            const payload2 = { companyId: company._id.toString(), shipmentId: 'SHIP-AUTO-2' };

            const [log1, log2] = await Promise.all([
                CallLogService.getInstance().createCallLog(payload1),
                CallLogService.getInstance().createCallLog(payload2)
            ]);

            expect(log1.salesRepId.toString()).toBe(salesRep._id.toString());
            expect(log2.salesRepId.toString()).toBe(salesRep._id.toString());
        });
    });
});
