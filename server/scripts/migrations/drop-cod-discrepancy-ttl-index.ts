import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';
    await mongoose.connect(mongoUri);

    try {
        const collection = mongoose.connection.collection('coddiscrepancies');
        const indexes = await collection.indexes();
        const ttlIndexes = indexes.filter(
            (idx) =>
                idx.key &&
                Object.prototype.hasOwnProperty.call(idx.key, 'autoResolveAt') &&
                typeof idx.expireAfterSeconds === 'number'
        );

        if (ttlIndexes.length === 0) {
            console.log('No COD discrepancy TTL index found. Nothing to drop.');
            return;
        }

        for (const index of ttlIndexes) {
            if (index.name) {
                await collection.dropIndex(index.name);
                console.log(`Dropped TTL index: ${index.name}`);
            }
        }

        await collection.createIndex({ autoResolveAt: 1 });
        console.log('Ensured non-TTL index: autoResolveAt_1');
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(async (error) => {
    console.error('Failed to drop COD discrepancy TTL index:', error);
    try {
        await mongoose.disconnect();
    } catch {
        // ignore disconnect errors
    }
    process.exit(1);
});
