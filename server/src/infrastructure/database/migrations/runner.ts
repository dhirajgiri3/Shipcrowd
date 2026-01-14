import mongoose from 'mongoose';
import * as migration001 from './001-seed-ratecards';

/**
 * Migration Runner
 * 
 * Usage:
 * - npm run migrate:up    -> Run all pending migrations
 * - npm run migrate:down  -> Rollback last migration
 */

const migrations = [
    migration001,
    // Add new migrations here
];

async function connectDB() {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd';
    await mongoose.connect(dbUri);
    console.log('✓ Connected to MongoDB');
}

async function disconnectDB() {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
}

async function runUp() {
    console.log('\n=== Running Migrations (UP) ===\n');

    for (const migration of migrations) {
        console.log(`\nMigration: ${migration.metadata.name}`);
        console.log(`Description: ${migration.metadata.description}`);

        try {
            await migration.up();
            console.log(`✓ Migration ${migration.metadata.name} completed\n`);
        } catch (error) {
            console.error(`✗ Migration ${migration.metadata.name} failed:`, error);
            throw error;
        }
    }

    console.log('\n=== All Migrations Completed ===\n');
}

async function runDown() {
    console.log('\n=== Rolling Back Last Migration (DOWN) ===\n');

    const lastMigration = migrations[migrations.length - 1];

    if (!lastMigration) {
        console.log('No migrations to rollback');
        return;
    }

    console.log(`\nMigration: ${lastMigration.metadata.name}`);
    console.log(`Description: ${lastMigration.metadata.description}`);

    try {
        await lastMigration.down();
        console.log(`✓ Rollback ${lastMigration.metadata.name} completed\n`);
    } catch (error) {
        console.error(`✗ Rollback ${lastMigration.metadata.name} failed:`, error);
        throw error;
    }

    console.log('\n=== Rollback Completed ===\n');
}

async function main() {
    const command = process.argv[2];

    if (!['up', 'down'].includes(command)) {
        console.error('Usage: ts-node migrations/runner.ts [up|down]');
        process.exit(1);
    }

    try {
        await connectDB();

        if (command === 'up') {
            await runUp();
        } else if (command === 'down') {
            await runDown();
        }

        await disconnectDB();
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Migration failed:', error);
        await disconnectDB();
        process.exit(1);
    }
}

main();
