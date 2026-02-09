/**
 * Global Setup for Jest
 * Starts MongoDB Memory Server before all tests
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';

export default async function globalSetup(): Promise<void> {
    process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
    process.env.JWT_ACCESS_EXPIRY = '15m';
    process.env.JWT_REFRESH_EXPIRY = '7d';
    process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'; // 64 hex chars
    process.env.NODE_ENV = 'test';

    const forceMemory = process.env.USE_MONGO_MEMORY_SERVER === 'true';
    const externalUri = !forceMemory ? (process.env.MONGODB_URI || '').trim() : '';

    // If caller provided an external DB URI, don't overwrite it.
    // This enables running tests in environments where MongoMemoryServer can't bind ports.
    if (externalUri) {
        process.env.MONGO_TEST_URI = externalUri;
        console.log('✅ Using external MongoDB for tests:', externalUri);
        return;
    }

    const explicitPort = Number(process.env.MONGO_TEST_PORT || 29017);
    const mongod = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: 'wiredTiger',
        },
        // Avoid getFreePort probe on 0.0.0.0 in restricted environments.
        instanceOpts: [
            {
                port: explicitPort,
            },
        ],
    });

    const uri = mongod.getUri();

    // CRITICAL: Set both MONGO_TEST_URI and MONGODB_URI to ensure
    // the app uses the test database when services connect
    process.env.MONGO_TEST_URI = uri;
    process.env.MONGODB_URI = uri; // This is what the app uses in database.ts

    // Store mongod instance globally so globalTeardown can access it
    (globalThis as any).__MONGOD__ = mongod;

    // Write URI to a file so test suites can read it (simulating custom environment)
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, 'mongoConfig.json');
    fs.writeFileSync(configPath, JSON.stringify({ mongoUri: uri }));

    console.log('✅ MongoDB Memory Server started at:', uri);
    console.log('✅ MONGODB_URI written to:', configPath);
}
