/**
 * Test Helpers
 * Shared utilities and lifecycle hooks for all tests
 */
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

function extractMongoDbName(uri: string): string | undefined {
    // Examples:
    // - mongodb://localhost:27017/shipcrowd_test
    // - mongodb://127.0.0.1:12345/?replicaSet=testset (no db name)
    const match = uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i);
    const db = match?.[1]?.trim();
    if (!db) return undefined;
    return decodeURIComponent(db);
}

// Connect to MongoDB before all tests in a file
beforeAll(async () => {
    let uri = process.env.MONGO_TEST_URI || process.env.MONGODB_URI;
    if (!uri) {
        // Try reading from config file
        try {
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(__dirname, 'mongoConfig.json');

            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                uri = config.mongoUri;
            }
        } catch (e) {
            console.warn('Failed to read mongoConfig.json', e);
        }
    }

    if (!uri) {
        console.warn('MONGO_TEST_URI not set. Falling back to local test database.');
        uri = 'mongodb://localhost:27017/shipcrowd_test';
    }

    // Safety guard: tests wipe collections; prevent accidental use of a non-test external DB.
    const usingMemoryServer = !!(globalThis as any).__MONGOD__
        || uri.includes('replicaSet=testset')
        || uri.includes('mongodb-memory-server');

    if (!usingMemoryServer) {
        const dbName = extractMongoDbName(uri);
        const isTestDb = !!dbName && dbName.toLowerCase().includes('test');
        const explicitlyAllowed = process.env.ALLOW_TEST_DB_WIPE === 'true';

        if (!isTestDb && !explicitlyAllowed) {
            throw new Error(
                `Refusing to run tests against non-test MongoDB database (${dbName || 'unknown'}).\n` +
                `Set MONGODB_URI to a test database (name includes "test"), e.g. mongodb://localhost:27017/shipcrowd_test\n` +
                `OR set ALLOW_TEST_DB_WIPE=true if you understand tests will delete collections.`
            );
        }
    }

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
    }
});

// Disconnect after all tests in a file
afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});

// Clear all collections between tests
beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

/**
 * Generate a JWT token for testing authenticated endpoints
 */
export const generateAuthToken = (
    userId: string,
    role: 'seller' | 'admin' | 'user' | 'staff' | 'super_admin' = 'seller'
): string => {
    const secret = process.env.ACCESS_TOKEN_SECRET || 'access_token_secret';
    // Match the payload structure from jwt.ts (generateAccessToken)
    return jwt.sign(
        { userId, role },
        secret,
        {
            expiresIn: '1h',
            audience: 'Shipcrowd-api',
            issuer: 'Shipcrowd-auth'
        }
    );
};

/**
 * Generate a refresh token for testing
 */
export const generateRefreshToken = (userId: string): string => {
    const secret = process.env.JWT_SECRET || 'test_jwt_secret';
    return jwt.sign(
        { userId, type: 'refresh' },
        secret,
        { expiresIn: '7d' }
    );
};

/**
 * Utility to wait for a specific duration
 */
export const wait = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create mock request object for testing middleware
 */
export const createMockRequest = (overrides: Record<string, any> = {}) => ({
    headers: {},
    body: {},
    params: {},
    query: {},
    cookies: {},
    ...overrides
});

/**
 * Create mock response object for testing middleware
 */
export const createMockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
};

/**
 * Create mock next function for testing middleware
 */
export const createMockNext = () => jest.fn();
