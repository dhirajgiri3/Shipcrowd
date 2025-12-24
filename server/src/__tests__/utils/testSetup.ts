/**
 * Test Setup Utilities
 * Provides helpers for setting up test database and environment
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

/**
 * Connect to in-memory MongoDB for testing
 */
export const connectTestDb = async (): Promise<void> => {
    try {
        // Create in-memory MongoDB instance
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        // Connect to the in-memory database
        await mongoose.connect(mongoUri);

        console.log('Test database connected');
    } catch (error) {
        console.error('Error connecting to test database:', error);
        throw error;
    }
};

/**
 * Close database connection and stop MongoDB server
 */
export const closeTestDb = async (): Promise<void> => {
    try {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
        console.log('Test database closed');
    } catch (error) {
        console.error('Error closing test database:', error);
        throw error;
    }
};

/**
 * Clear all data from test database
 */
export const clearTestDb = async (): Promise<void> => {
    try {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    } catch (error) {
        console.error('Error clearing test database:', error);
        throw error;
    }
};

/**
 * Create a test user for authentication tests
 */
export const createTestUser = async (userData?: Partial<any>) => {
    const User = mongoose.model('User');

    const defaultUser = {
        email: 'test@example.com',
        password: 'Test1234!',
        name: 'Test User',
        role: 'seller',
        isEmailVerified: true,
        ...userData,
    };

    return await User.create(defaultUser);
};
