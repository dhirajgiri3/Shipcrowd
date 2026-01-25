/**
 * Global Setup for Jest
 * Starts MongoDB Memory Server before all tests
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup(): Promise<void> {
    const mongod = await MongoMemoryServer.create({
        instance: {
            dbName: 'Shipcrowd_test'
        }
    });

    const uri = mongod.getUri();

    // CRITICAL: Set both MONGO_TEST_URI and MONGODB_URI to ensure
    // the app uses the test database when services connect
    process.env.MONGO_TEST_URI = uri;
    process.env.MONGODB_URI = uri; // This is what the app uses in database.ts

    process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
    process.env.JWT_ACCESS_EXPIRY = '15m';
    process.env.JWT_REFRESH_EXPIRY = '7d';
    process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'; // 64 hex chars
    process.env.NODE_ENV = 'test';

    // Store mongod instance globally so globalTeardown can access it
    (globalThis as any).__MONGOD__ = mongod;

    console.log('✅ MongoDB Memory Server started at:', uri);
    console.log('✅ MONGODB_URI set to test database');
}
