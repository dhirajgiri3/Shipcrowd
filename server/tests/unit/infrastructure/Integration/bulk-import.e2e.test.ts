import connectDB from '@/config/database';
import { Company, Order } from '@/infrastructure/database/mongoose/models';
import orderRoutes from '@/presentation/http/routes/v1/shipping/order.routes';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';

// Mock dependencies
jest.mock('@/middleware/auth/auth', () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { userId: 'test-user', role: 'seller' };
        req.companyId = 'test-company-id';
        next();
    },
    csrfProtection: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('@/middleware/index', () => ({
    requireCompleteCompany: (_req: any, _res: any, next: any) => next(),
    requireAccess: () => (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/orders', orderRoutes);

describe('Bulk Import E2E - Backend API', () => {
    let testCompanyId: string;

    beforeAll(async () => {
        await connectDB();
    });

    beforeEach(async () => {
        // Create test company
        const company = await Company.create({
            name: `Test Co ${Date.now()}`,
            email: `test${Date.now()}@shipcrowd.com`,
            phone: '9999999999',
            password: 'hash',
            status: 'approved',
            wallet: { balance: 10000 },
        });
        testCompanyId = company._id.toString();

        // Mock request.companyId middleware injection
        jest.spyOn(require('@/middleware/auth/auth'), 'authenticate').mockImplementation((req: any, _res: any, next: any) => {
            req.companyId = testCompanyId;
            req.user = { userId: 'test-user', role: 'seller' };
            next();
        });

        // Ensure Order service uses this company ID
        // Note: The controller gets companyId from req.companyId
    });

    afterEach(async () => {
        await Company.deleteMany({ _id: testCompanyId });
        await Order.deleteMany({ companyId: testCompanyId });
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('CSV File Upload', () => {
        it('should process valid CSV file', async () => {
            const csvContent = `customer_name,phone,email,address,city,state,postal_code,product,quantity,price,payment_method
John Doe,9876543210,john@test.com,123 Main St,Mumbai,Maharashtra,400001,Widget,1,500,cod`;

            const res = await request(app)
                .post('/api/v1/orders/bulk')
                .attach('file', Buffer.from(csvContent), 'orders.csv');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.created).toHaveLength(1);
        });

        it('should reject non-CSV file', async () => {
            const res = await request(app)
                .post('/api/v1/orders/bulk')
                .attach('file', Buffer.from('invalid'), 'test.txt');

            // Multer filter should reject it, but depending on implementation it might be 400 or 500
            // The router catches the error from multer fileFilter
            expect(res.status).not.toBe(200);
        });

        it('should reject file larger than limit (mocked)', async () => {
            // Creating a real 5MB buffer is slow/expensive in test; rely on unit tests or small limit mock
            // Actual limit is 5MB in route
            const hugeCsv = 'a'.repeat(6 * 1024 * 1024); // 6MB
            const res = await request(app)
                .post('/api/v1/orders/bulk')
                .attach('file', Buffer.from(hugeCsv), 'huge.csv');

            expect(res.status).toBe(500); // Multer throws error, typically 500 or 413 handled by error handler
        });
    });

    describe('Validation Logic via API', () => {
        it('should return errors for invalid rows', async () => {
            const csvContent = `customer_name,phone,email,address,city,state,postal_code,product,quantity,price,payment_method
Invalid,123,invalid,addr,city,state,123,Widget,1,500,cod`; // Invalid phone/pin

            const res = await request(app)
                .post('/api/v1/orders/bulk')
                .attach('file', Buffer.from(csvContent), 'invalid.csv');

            expect(res.status).toBe(200); // It returns 200 but with error details for rows
            expect(res.body.data.errors).toHaveLength(1);
            expect(res.body.data.created).toHaveLength(0);
        });
    });
});

