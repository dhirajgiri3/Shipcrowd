/**
 * Global Teardown for Jest
 * Stops MongoDB Memory Server after all tests
 */
export default async function globalTeardown(): Promise<void> {
    const mongod = (globalThis as any).__MONGOD__;
    if (mongod) {
        await mongod.stop();
        console.log('✅ MongoDB Memory Server stopped');
    }
}
