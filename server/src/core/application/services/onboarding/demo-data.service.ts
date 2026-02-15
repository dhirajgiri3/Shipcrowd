import { Order, Shipment, UserPersona } from '../../../../infrastructure/database/mongoose/models';
import { IndustryType } from '../../../../infrastructure/database/mongoose/models/onboarding/user-persona.model';
import logger from '../../../../shared/logger/winston.logger';

interface IDemoDataOptions {
    companyId: string;
    userId: string;
}

export class DemoDataService {
    /**
     * Generate sample data for a new account based on industry
     */
    async generateDemoData(options: IDemoDataOptions) {
        try {
            const { companyId, userId } = options;

            // Check if demo data already exists
            const existingDemo = await Order.findOne({ companyId, isDemoData: true });
            if (existingDemo) {
                logger.info(`Demo data already exists for company ${companyId}`);
                return;
            }

            // Get industry preference from persona, default to 'other' if not set
            const persona = await UserPersona.findOne({ companyId, userId });
            const industry = persona?.industry || 'other';

            await this.createSampleOrders(companyId, userId, industry);
            // We could also create sample shipments, analytics, etc. here

            logger.info(`Generated demo data for company ${companyId} (Industry: ${industry})`);
        } catch (error) {
            logger.error('Error generating demo data:', error);
            throw error;
        }
    }

    /**
     * Clear all demo data for a company
     */
    async clearDemoData(companyId: string) {
        try {
            await Order.deleteMany({ companyId, isDemoData: true });
            await Shipment.deleteMany({ companyId, isDemoData: true });
            // Clear other demo collections if any (e.g. dummy products, customers)

            logger.info(`Cleared demo data for company ${companyId}`);
            return { success: true };
        } catch (error) {
            logger.error('Error clearing demo data:', error);
            throw error;
        }
    }

    /**
     * Check if demo data exists
     */
    async hasDemoData(companyId: string) {
        const count = await Order.countDocuments({ companyId, isDemoData: true });
        return count > 0;
    }

    // Private helpers

    private async createSampleOrders(companyId: string, userId: string, industry: IndustryType) {
        const products = this.getProductsForIndustry(industry);
        const customers = this.getSampleCustomers();

        // Create 15 sample orders spread over last 30 days
        // Mix: 60% Delivered, 20% In Transit, 10% RTO, 10% NDR
        // This creates "lived in" feel immediately

        const orders = [];
        const now = new Date();

        for (let i = 0; i < 15; i++) {
            const daysAgo = Math.floor(Math.random() * 30);
            const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

            // Determine status based on "age"
            let status = 'delivered';
            if (daysAgo < 3) status = 'pending';
            else if (daysAgo < 7) status = 'in_transit';
            else if (daysAgo % 10 === 0) status = 'rto_delivered'; // 10% RTO
            else if (daysAgo % 9 === 0) status = 'ndr_pending';  // 10% NDR

            const product = products[Math.floor(Math.random() * products.length)];
            const customer = customers[Math.floor(Math.random() * customers.length)];

            orders.push({
                orderNumber: `DEMO-${1000 + i}`,
                companyId,
                customerInfo: customer,
                products: [{
                    name: product.name,
                    quantity: 1,
                    price: product.price,
                    weight: 0.5
                }],
                paymentStatus: 'paid',
                paymentMethod: i % 2 === 0 ? 'prepaid' : 'cod',
                source: 'manual',
                currentStatus: status,
                totals: {
                    subtotal: product.price,
                    tax: product.price * 0.18,
                    shipping: 50,
                    discount: 0,
                    total: product.price * 1.18 + 50
                },
                isDemoData: true,
                createdAt,
                updatedAt: createdAt,
                statusHistory: [{
                    status: 'created',
                    timestamp: createdAt,
                    updatedBy: userId
                }]
            });
        }

        await Order.insertMany(orders);
    }

    private getProductsForIndustry(industry: string) {
        switch (industry) {
            case 'fashion':
                return [
                    { name: 'Cotton T-Shirt (M)', price: 499 },
                    { name: 'Slim Fit Jeans (32)', price: 1299 },
                    { name: 'Summer Dress', price: 899 }
                ];
            case 'electronics':
                return [
                    { name: 'Wireless Mouse', price: 699 },
                    { name: 'USB-C Cable (2m)', price: 399 },
                    { name: 'Bluetooth Earbuds', price: 1499 }
                ];
            case 'food':
                return [
                    { name: 'Organic Honey (500g)', price: 350 },
                    { name: 'Quinoa Pack (1kg)', price: 450 },
                    { name: 'Mixed Nuts (200g)', price: 299 }
                ];
            default:
                return [
                    { name: 'Sample Product A', price: 500 },
                    { name: 'Sample Product B', price: 1000 }
                ];
        }
    }

    private getSampleCustomers() {
        return [
            {
                name: 'Rahul Sharma',
                phone: '9876543210',
                address: {
                    line1: '123 MG Road',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postalCode: '400001',
                    country: 'India'
                }
            },
            {
                name: 'Priya Patel',
                phone: '9876543211',
                address: {
                    line1: '456 Residency Road',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    postalCode: '560025',
                    country: 'India'
                }
            },
            {
                name: 'Amit Singh',
                phone: '9876543212',
                address: {
                    line1: '789 Connaught Place',
                    city: 'New Delhi',
                    state: 'Delhi',
                    postalCode: '110001',
                    country: 'India'
                }
            }
        ];
    }
}

export default new DemoDataService();
