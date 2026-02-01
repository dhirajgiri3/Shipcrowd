import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    const mongoose = (await import('mongoose')).default;
    const { InvoiceGenerationJob } = await import('../src/infrastructure/jobs/finance/invoice-generation.job');
    const { Shipment } = await import('../src/infrastructure/database/mongoose/models');

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd');
    console.log('✅ Connected');

    try {
        console.log('🚀 Triggering Monthly Invoice Generation...');

        // 1. Ensure at least one shipment is 'delivered' in the target period
        const now = new Date();
        // Target previous month
        let year = now.getFullYear();
        let month = now.getMonth() - 1;

        if (month < 0) {
            month = 11;
            year -= 1;
        }

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);
        const midDate = new Date(year, month, 15);

        console.log(`Target Period: ${startDate.toISOString()} - ${endDate.toISOString()}`);

        // Find a random shipment and update it
        const shipment = await Shipment.findOne({}).sort({ createdAt: -1 });
        if (shipment) {
            console.log(`📝 Updating shipment ${shipment._id} to delivered on ${midDate.toISOString()}`);
            shipment.currentStatus = 'delivered';
            shipment.actualDelivery = midDate;

            // Ensure pricing details exist for invoice
            if (!shipment.pricingDetails) {
                shipment.pricingDetails = {
                    totalPrice: 150,
                    subtotal: 100,
                    gstAmount: 18,
                    baseRate: 100,
                    weightCharge: 0,
                    zoneCharge: 0,
                    zone: 'A',
                    customerDiscount: 0,
                    codCharge: 0,
                    calculatedAt: new Date(),
                    calculationMethod: 'ratecard'
                } as any;
            }
            // Ensure 'totalAmount' or 'pricing.totalAmount' is accessible by InvoiceService
            (shipment as any).totalAmount = 150;

            await shipment.save();

            // Also ensure company has GSTIN
            const { Company } = await import('../src/infrastructure/database/mongoose/models');
            await Company.findByIdAndUpdate(shipment.companyId, {
                $set: { 'billingInfo.gstin': '07AAAAA0000A1Z5' }
            });
            console.log(`📝 Updated company ${shipment.companyId} with dummy GSTIN`);

        } else {
            console.warn('⚠️ No shipments found to update.');
        }

        // Run the job logic
        await (InvoiceGenerationJob as any).runMonthlyInvoiceGeneration({
            month,
            year
        });

        console.log('✅ Invoice generation completed');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected');
    }
}

main().catch(console.error);
