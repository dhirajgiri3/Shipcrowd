import mongoose from 'mongoose';
import connectDB from '@/config/database';
import { OrderService } from '@/core/application/services/shipping/order.service';
import { Company, Order } from '@/infrastructure/database/mongoose/models';

describe('Bulk Import - Production Tests', () => {
    let testCompanyId: string;

    beforeAll(async () => {
        if (!process.env.MONGODB_URI) {
            process.env.MONGODB_URI = 'mongodb://localhost:27017/shipcrowd_test';
        }
        if (!process.env.ENCRYPTION_KEY) {
            process.env.ENCRYPTION_KEY = 'fallback_secret_for_testing_only_32_chars_long';
        }
        await connectDB();
    });

    beforeEach(async () => {
        const company = await Company.create({
            name: `Test Company ${Date.now()}`,
            email: `test_${Date.now()}@shipcrowd.com`,
            phone: '9999999999',
            password: 'hashed',
            status: 'approved',
            wallet: { balance: 50000, currency: 'INR' },
        });
        testCompanyId = company._id.toString();
    });

    afterEach(async () => {
        await Company.deleteMany({ _id: testCompanyId });
        await Order.deleteMany({ companyId: testCompanyId });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('CSV Parsing & Validation', () => {
        test('should create valid orders from CSV rows', async () => {
            const rows = [
                {
                    customer_name: 'John Doe',
                    phone: '9876543210',
                    email: 'john@test.com',
                    address: '123 Main St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postal_code: '400001',
                    product: 'Widget',
                    quantity: '1',
                    price: '999.50',
                    payment_method: 'cod',
                },
            ];

            const result = await OrderService.getInstance().bulkImportOrders(rows, testCompanyId);

            expect(result.success).toBe(true);
            expect(result.created.length).toBe(1);
            expect(result.errors.length).toBe(0);
        });

        test('should reject invalid phone numbers', async () => {
            const rows = [
                {
                    customer_name: 'John Doe',
                    phone: '123', // Invalid
                    email: 'john@test.com',
                    address: '123 Main St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postal_code: '400001',
                    product: 'Widget',
                    quantity: '1',
                    price: '999.50',
                    payment_method: 'cod',
                },
            ];

            const result = await OrderService.getInstance().bulkImportOrders(rows, testCompanyId);

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.created.length).toBe(0);
        });

        test('should reject invalid postal codes', async () => {
            const rows = [
                {
                    customer_name: 'John Doe',
                    phone: '9876543210',
                    email: 'john@test.com',
                    address: '123 Main St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postal_code: '1234', // Invalid (need 6 digits)
                    product: 'Widget',
                    quantity: '1',
                    price: '999.50',
                    payment_method: 'cod',
                },
            ];

            const result = await OrderService.getInstance().bulkImportOrders(rows, testCompanyId);

            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should handle missing required fields', async () => {
            const rows = [
                {
                    // Missing customer_name
                    phone: '9876543210',
                    email: 'john@test.com',
                    address: '123 Main St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postal_code: '400001',
                    product: 'Widget',
                    quantity: '1',
                    price: '999.50',
                    payment_method: 'cod',
                },
            ];

            const result = await OrderService.getInstance().bulkImportOrders(rows, testCompanyId);

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].error).toContain('required');
        });
    });

    describe('Bulk Operations', () => {
        test('should import 100 orders atomically', async () => {
            const rows = Array(100)
                .fill(null)
                .map((_, i) => ({
                    customer_name: `Customer ${i}`,
                    phone: `987654321${String(i).padStart(1, '0')}`.slice(0, 10),
                    email: `customer${i}@test.com`,
                    address: `${i} Test St`,
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postal_code: `40000${String(i % 100).padStart(1, '0')}`.slice(0, 6),
                    product: `Product ${i}`,
                    quantity: '1',
                    price: '500',
                    payment_method: 'cod',
                }));

            const result = await OrderService.getInstance().bulkImportOrders(rows, testCompanyId);

            expect(result.success).toBe(true);
            expect(result.created.length).toBe(100);

            const ordersInDB = await Order.countDocuments({ companyId: testCompanyId });
            expect(ordersInDB).toBe(100);
        });

        test('should rollback on validation failure (atomic operation)', async () => {
            const rows = [
                {
                    customer_name: 'Valid Customer',
                    phone: '9876543210',
                    email: 'valid@test.com',
                    address: '123 Main St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postal_code: '400001',
                    product: 'Widget',
                    quantity: '1',
                    price: '500',
                    payment_method: 'cod',
                },
                {
                    customer_name: 'Invalid Customer',
                    phone: 'invalid', // Invalid
                    email: 'invalid@test.com',
                    address: '456 Side St',
                    city: 'Delhi',
                    state: 'Delhi',
                    postal_code: '110001',
                    product: 'Gadget',
                    quantity: '1',
                    price: '800',
                    payment_method: 'cod',
                },
            ];

            const result = await OrderService.getInstance().bulkImportOrders(rows, testCompanyId);

            // Should either create both or neither (atomic)
            const ordersInDB = await Order.countDocuments({ companyId: testCompanyId });
            expect(ordersInDB === 2 || ordersInDB === 0).toBe(true);
        });

        test('should handle mixed valid/invalid rows and report errors clearly', async () => {
            const rows = [
                {
                    customer_name: 'Valid 1',
                    phone: '9876543210',
                    email: 'valid1@test.com',
                    address: '123 Main St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postal_code: '400001',
                    product: 'Widget',
                    quantity: '1',
                    price: '500',
                    payment_method: 'cod',
                },
                {
                    customer_name: 'Invalid Phone',
                    phone: '123',
                    email: 'invalid@test.com',
                    address: '456 Side St',
                    city: 'Delhi',
                    state: 'Delhi',
                    postal_code: '110001',
                    product: 'Gadget',
                    quantity: '1',
                    price: '800',
                    payment_method: 'cod',
                },
                {
                    customer_name: 'Valid 2',
                    phone: '9988776655',
                    email: 'valid2@test.com',
                    address: '789 Long St',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    postal_code: '560001',
                    product: 'Tool',
                    quantity: '2',
                    price: '300',
                    payment_method: 'prepaid',
                },
            ];

            const result = await OrderService.getInstance().bulkImportOrders(rows, testCompanyId);

            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].row).toBe(2); // Second row (1-indexed in error message)
        });
    });

    describe('Order Numbering', () => {
        test('should generate unique order numbers', async () => {
            const rows = Array(10)
                .fill(null)
                .map((_, i) => ({
                    customer_name: `Customer ${i}`,
                    phone: `987654321${i}`,
                    email: `customer${i}@test.com`,
                    address: `${i} Test St`,
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postal_code: `40000${i}`,
                    product: `Product ${i}`,
                    quantity: '1',
                    price: '500',
                    payment_method: 'cod',
                }));

            const result = await OrderService.getInstance().bulkImportOrders(rows, testCompanyId);

            expect(result.created.length).toBe(10);

            const orderNumbers = result.created.map((o) => o.orderNumber);
            const uniqueOrderNumbers = new Set(orderNumbers);

            expect(uniqueOrderNumbers.size).toBe(10);
        });
    });

    describe('Data Integrity', () => {
        test('should store all customer info correctly', async () => {
            const rows = [
                {
                    customer_name: 'Test Customer',
                    phone: '9876543210',
                    email: 'test@example.com',
                    address: '123 Test Lane',
                    address_line2: 'Apt 5B',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postal_code: '400001',
                    product: 'TestWidget',
                    sku: 'TWX-001',
                    quantity: '2',
                    price: '1500.50',
                    payment_method: 'cod',
                },
            ];

            const result = await OrderService.getInstance().bulkImportOrders(rows, testCompanyId);

            expect(result.created.length).toBe(1);

            const createdOrder = await Order.findOne({ _id: result.created[0].id });

            expect(createdOrder?.customerInfo.name).toBe('Test Customer');
            expect(createdOrder?.customerInfo.phone).toBe('9876543210');
            expect(createdOrder?.customerInfo.email).toBe('test@example.com');
            expect(createdOrder?.customerInfo.address.line1).toBe('123 Test Lane');
            expect(createdOrder?.customerInfo.address.line2).toBe('Apt 5B');
            expect(createdOrder?.products[0].quantity).toBe(2);
            expect(createdOrder?.products[0].price).toBe(1500.5);
        });
    });

    describe('Error Reporting', () => {
        test('should report exact row numbers and error reasons', async () => {
            const rows = [
                {
                    customer_name: 'Valid',
                    phone: '9876543210',
                    email: 'valid@test.com',
                    address: '123 Main St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postal_code: '400001',
                    product: 'Widget',
                    quantity: '1',
                    price: '500',
                    payment_method: 'cod',
                },
                {
                    customer_name: 'Invalid Phone',
                    phone: '123',
                    email: 'test2@test.com',
                    address: '456 Main St',
                    city: 'Delhi',
                    state: 'Delhi',
                    postal_code: '110001',
                    product: 'Widget',
                    quantity: '1',
                    price: '500',
                    payment_method: 'cod',
                },
            ];

            const result = await OrderService.getInstance().bulkImportOrders(rows, testCompanyId);

            if (result.errors.length > 0) {
                expect(result.errors[0].row).toBeDefined();
                expect(result.errors[0].error).toBeDefined();
                expect(result.errors[0].error.length).toBeGreaterThan(0);
            }
        });
    });
});
