import { Job } from 'bullmq';
import mongoose from 'mongoose';
import QueueManager from '../../utilities/queue-manager';
import logger from '../../../shared/logger/winston.logger';
import InvoiceService from '../../../core/application/services/finance/invoice.service';
import { Company } from '../../../infrastructure/database/mongoose/models';
import { Shipment } from '../../../infrastructure/database/mongoose/models';

interface InvoiceGenerationJobData {
    type: 'monthly_generation';
    billingPeriod?: {
        month: number;
        year: number;
    };
}

export class InvoiceGenerationJob {
    private static readonly QUEUE_NAME = 'invoice-generation';

    /**
     * Initialize the job worker
     */
    static async initialize(): Promise<void> {
        await QueueManager.registerWorker({
            queueName: this.QUEUE_NAME,
            processor: this.processJob.bind(this),
            concurrency: 1,
        });

        logger.info('Invoice generation worker initialized');
    }

    /**
     * Process job
     */
    private static async processJob(job: Job<InvoiceGenerationJobData>): Promise<any> {
        const { type, billingPeriod } = job.data;

        logger.info('Processing invoice generation job', {
            jobId: job.id,
            type,
            billingPeriod
        });

        try {
            if (type === 'monthly_generation') {
                await this.runMonthlyInvoiceGeneration(billingPeriod);
            } else {
                logger.warn('Unknown job type', { type });
            }

            return { success: true };
        } catch (error: any) {
            logger.error('Invoice generation job failed', {
                jobId: job.id,
                type,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Run monthly invoice generation for all active companies
     */
    private static async runMonthlyInvoiceGeneration(period?: { month: number; year: number }): Promise<void> {
        logger.info('Starting monthly invoice generation batch');

        // Determine billing period (default to previous month)
        const now = new Date();
        const year = period?.year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
        const month = period?.month !== undefined ? period.month : (now.getMonth() === 0 ? 11 : now.getMonth() - 1); // 0-indexed month

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

        logger.info(`Billing Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const companies = await Company.find({ isActive: true, isDeleted: false }).select('_id billingInfo');

        let created = 0;
        let skipped = 0;
        let failed = 0;

        for (const company of companies) {
            try {
                // Find potential shipments first to avoid empty processing
                const shipmentCount = await Shipment.countDocuments({
                    companyId: company._id,
                    currentStatus: 'delivered',
                    // Assuming we bill based on delivery date or creation date?
                    // Typically billing is on service completion (delivery)
                    actualDelivery: { $gte: startDate, $lte: endDate }
                });

                if (shipmentCount === 0) {
                    skipped++;
                    continue;
                }

                // Get shipment IDs
                const shipments = await Shipment.find({
                    companyId: company._id,
                    currentStatus: 'delivered',
                    actualDelivery: { $gte: startDate, $lte: endDate }
                }).select('_id');

                const shipmentIds = shipments.map(s => (s as any)._id.toString());

                // Create Invoice
                // NOTE: Using hardcoded Shipcrowd GSTIN for now, should be from config
                const sellerGSTIN = process.env.PLATFORM_GSTIN || '06ABCDE1234F1Z5'; // Example default
                const buyerGSTIN = company.billingInfo?.gstin || '07AAAAA0000A1Z5'; // Fallback if missing?

                if (!company.billingInfo?.gstin) {
                    logger.warn(`Company ${company._id} missing GSTIN, skipping invoice generation`);
                    failed++; // Or skip?
                    continue;
                }

                await InvoiceService.createInvoice({
                    companyId: company._id.toString(),
                    shipmentIds,
                    billingPeriod: {
                        startDate,
                        endDate
                    },
                    sellerGSTIN,
                    buyerGSTIN,
                    createdBy: '000000000000000000000000' // System generated
                });

                created++;
            } catch (error: any) {
                logger.error(`Failed to generate invoice for company ${company._id}:`, error);
                failed++;
            }
        }

        logger.info(`Monthly invoice generation completed: ${created} created, ${skipped} skipped, ${failed} failed`);
    }

    /**
     * Queue Monthly Generation Job
     */
    static async queueMonthlyGeneration(): Promise<void> {
        await QueueManager.addJob(
            this.QUEUE_NAME,
            'monthly-generation',
            { type: 'monthly_generation' },
            {
                jobId: `invoice-monthly-${new Date().toISOString().slice(0, 7)}`, // Unique per month
                removeOnComplete: true
            }
        );
    }
}

export default InvoiceGenerationJob;
