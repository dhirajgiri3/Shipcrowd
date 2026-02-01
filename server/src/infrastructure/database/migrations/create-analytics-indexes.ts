/**
 * Analytics Indexes Migration
 * 
 * Creates compound indexes for analytics query optimization.
 * Run with: npx ts-node src/infrastructure/database/migrations/create-analytics-indexes.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function createAnalyticsIndexes(): Promise<void> {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }

        // Order indexes
        console.log('Creating Order indexes...');
        await db.collection('orders').createIndexes([
            { key: { companyId: 1, createdAt: -1 }, name: 'orders_company_created' },
            { key: { companyId: 1, currentStatus: 1, createdAt: -1 }, name: 'orders_company_status_created' },
            { key: { companyId: 1, paymentMethod: 1, createdAt: -1 }, name: 'orders_company_payment_created' },
            { key: { 'customerInfo.phone': 1, companyId: 1 }, name: 'orders_customer_phone_company' }
        ]);

        // Shipment indexes
        console.log('Creating Shipment indexes...');
        await db.collection('shipments').createIndexes([
            { key: { companyId: 1, createdAt: -1 }, name: 'shipments_company_created' },
            { key: { companyId: 1, carrier: 1, createdAt: -1 }, name: 'shipments_company_carrier_created' },
            { key: { companyId: 1, currentStatus: 1 }, name: 'shipments_company_status' }
        ]);

        // WalletTransaction indexes
        console.log('Creating WalletTransaction indexes...');
        await db.collection('wallettransactions').createIndexes([
            { key: { company: 1, createdAt: -1 }, name: 'wallet_company_created' },
            { key: { company: 1, type: 1, createdAt: -1 }, name: 'wallet_company_type_created' }
        ]);

        // Inventory indexes
        console.log('Creating Inventory indexes...');
        await db.collection('inventories').createIndexes([
            { key: { companyId: 1, warehouseId: 1 }, name: 'inventory_company_warehouse' },
            { key: { companyId: 1, onHand: 1 }, name: 'inventory_company_stock' }
        ]);

        // ReportConfig indexes
        console.log('Creating ReportConfig indexes...');
        await db.collection('reportconfigs').createIndexes([
            { key: { company: 1, 'schedule.enabled': 1 }, name: 'reports_company_scheduled' }
        ]);

        console.log('All analytics indexes created successfully!');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error creating indexes:', error);
        process.exit(1);
    }
}

// Run if executed directly
createAnalyticsIndexes();

export default createAnalyticsIndexes;
