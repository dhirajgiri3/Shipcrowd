/**
 * Test Database Utilities
 * Methods for managing the test database state
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer | null = null;

/**
 * Connect to in-memory MongoDB for testing
 * Use this when you need standalone database control
 */
export const connectTestDb = async (): Promise<void> => {
    if (mongoose.connection.readyState !== 0) {
        return; // Already connected
    }

    // Use the global URI if available (from globalSetup)
    const uri = process.env.MONGO_TEST_URI || process.env.MONGODB_URI;
    if (uri) {
        await mongoose.connect(uri);
        return;
    }

    // Otherwise create a new memory server
    mongoServer = await MongoMemoryServer.create({
        instance: { ip: '127.0.0.1' }
    });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
};

/**
 * Close database connection and stop MongoDB server
 */
export const closeTestDb = async (): Promise<void> => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    }

    if (mongoServer) {
        await mongoServer.stop();
        mongoServer = null;
    }
};

/**
 * Clear all data from test database
 */
export const clearTestDb = async (): Promise<void> => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
};

/**
 * Drop a specific collection
 */
export const dropCollection = async (collectionName: string): Promise<void> => {
    const collection = mongoose.connection.collections[collectionName];
    if (collection) {
        await collection.drop();
    }
};

/**
 * Get document count for a collection
 */
export const getCollectionCount = async (collectionName: string): Promise<number> => {
    const collection = mongoose.connection.collections[collectionName];
    if (!collection) return 0;
    return collection.countDocuments();
};

/**
 * Seed test data into a collection
 */
export const seedCollection = async <T extends mongoose.Document>(
    Model: mongoose.Model<T>,
    documents: Partial<T>[]
): Promise<T[]> => {
    return Model.insertMany(documents) as unknown as T[];
};

// Aliases for compatibility
export const setupTestDatabase = connectTestDb;
export const teardownTestDatabase = closeTestDb;
