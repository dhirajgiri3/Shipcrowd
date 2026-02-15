import mongoose from 'mongoose';
import logger from '../../shared/logger/winston.logger';
import {
Company,
Order,
Shipment,
User,
Warehouse,
Zone
} from './mongoose/models';

/**
 * Database Indexes Configuration
 * 
 * Creates optimized compound indexes for frequently queried collections.
 * Indexes dramatically improve query performance (10-100x speedup).
 * 
 * Run automatically on server startup via createIndexes()
 */

/**
 * Order Indexes
 * 
 * Primary queries:
 * - List orders by company with filters (status, date range)
 * - Search by order number
 * - Search by customer phone
 * - Filter by warehouse
 */
const ORDER_INDEXES = [
    // Primary list query: company + deleted + sorted by date
    { companyId: 1, isDeleted: 1, createdAt: -1 },

    // Status filtering
    { companyId: 1, currentStatus: 1, isDeleted: 1 },

    // Order number lookup (exact match)
    { companyId: 1, orderNumber: 1 },

    // Customer phone search
    { 'customerInfo.phone': 1, companyId: 1, isDeleted: 1 },

    // Warehouse filtering
    { warehouseId: 1, companyId: 1, isDeleted: 1 },

    // Date range queries
    { companyId: 1, createdAt: -1, isDeleted: 1 },

    // Payment method analytics
    { companyId: 1, paymentMethod: 1, paymentStatus: 1, isDeleted: 1 },
];

/**
 * Shipment Indexes
 * 
 * Primary queries:
 * - List shipments by company with filters
 * - Track by tracking number (unique)
 * - Find by order
 * - Filter by carrier/status
 */
const SHIPMENT_INDEXES = [
    // Primary list query
    { companyId: 1, isDeleted: 1, createdAt: -1 },

    // Tracking number lookup (UNIQUE, most common query)
    { trackingNumber: 1 },

    // Order-shipment relation
    { orderId: 1, isDeleted: 1 },

    // Status filtering
    { companyId: 1, currentStatus: 1, isDeleted: 1 },

    // Carrier filtering
    { companyId: 1, carrier: 1, isDeleted: 1 },

    // Destination pincode search
    { 'deliveryDetails.address.postalCode': 1, companyId: 1 },

    // Analytics: shipments by date
    { companyId: 1, createdAt: -1, currentStatus: 1 },
];

/**
 * Zone Indexes
 * 
 * Primary queries:
 * - Pincode lookup
 * - List by company
 */
const ZONE_INDEXES = [
    // Pincode matching (array index)
    { companyId: 1, postalCodes: 1, isDeleted: 1 },

    // List zones
    { companyId: 1, isDeleted: 1, name: 1 },
];

/**
 * Warehouse Indexes
 */
const WAREHOUSE_INDEXES = [
    { companyId: 1, isDeleted: 1 },
    { companyId: 1, isActive: 1, isDeleted: 1 },
];

/**
 * User Indexes
 */
const USER_INDEXES = [
    // Login lookup (unique)
    { email: 1 },

    // Company users
    { companyId: 1, isActive: 1 },

    // Role-based queries
    { companyId: 1, role: 1, isActive: 1 },
];

/**
 * Company Indexes
 */
const COMPANY_INDEXES = [
    // Active companies
    { isDeleted: 1, createdAt: -1 },

    // Name lookup
    { name: 1 },
];

/**
 * Create all indexes
 * 
 * Called on server startup. Creates indexes if they don't exist.
 * Mongoose will skip creation if index already exists.
 */
export async function createIndexes(): Promise<void> {
    try {
        logger.info('Starting database index creation...');

        // Create indexes in parallel for speed
        await Promise.all([
            createModelIndexes(Order, ORDER_INDEXES, 'Order'),
            createModelIndexes(Shipment, SHIPMENT_INDEXES, 'Shipment'),
            createModelIndexes(Zone, ZONE_INDEXES, 'Zone'),
            createModelIndexes(Warehouse, WAREHOUSE_INDEXES, 'Warehouse'),
            createModelIndexes(User, USER_INDEXES, 'User'),
            createModelIndexes(Company, COMPANY_INDEXES, 'Company'),
        ]);

        logger.info('✅ All database indexes created successfully');
    } catch (error) {
        logger.error('❌ Error creating database indexes:', error);
        throw error;
    }
}

/**
 * Helper to create indexes for a specific model
 */
async function createModelIndexes(
    model: any,
    indexes: any[],
    modelName: string
): Promise<void> {
    let created = 0;
    let skipped = 0;

    for (const index of indexes) {
        try {
            await model.collection.createIndex(index, { background: true });
            created++;
        } catch (error: any) {
            // Skip if index already exists (might have different options like unique)
            if (error.code === 85 || error.codeName === 'IndexOptionsConflict' || error.message?.includes('existing index')) {
                skipped++;
                continue;
            }
            // Re-throw unexpected errors
            logger.error(`❌ Error creating index for ${modelName}:`, error);
            throw error;
        }
    }

    logger.info(`✅ ${modelName}: ${created} created, ${skipped} skipped (${indexes.length} total)`);
}

/**
 * Drop all indexes (use with caution!)
 * Only for development/testing
 */
export async function dropAllIndexes(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Cannot drop indexes in production!');
    }

    logger.warn('⚠️ Dropping all indexes...');

    await Promise.all([
        Order.collection.dropIndexes(),
        Shipment.collection.dropIndexes(),
        Zone.collection.dropIndexes(),
        Warehouse.collection.dropIndexes(),
        User.collection.dropIndexes(),
        Company.collection.dropIndexes(),
    ]);

    logger.info('✅ All indexes dropped');
}

/**
 * List all indexes for a collection
 * Useful for debugging
 */
export async function listIndexes(collectionName: string): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
        logger.error('Database not connected');
        return;
    }

    const indexes = await db.collection(collectionName).indexes();
    logger.info(`Indexes for ${collectionName}:`, JSON.stringify(indexes, null, 2));
}

export default {
    createIndexes,
    dropAllIndexes,
    listIndexes,
};
