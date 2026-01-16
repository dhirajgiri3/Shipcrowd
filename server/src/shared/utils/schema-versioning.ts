/**
 * Schema Versioning Utility
 * 
 * Adds schema version tracking to models for migration safety.
 * Detects and handles legacy documents during migrations.
 */

import { Schema } from 'mongoose';

export interface ISchemaVersion {
    schemaVersion: number;
}

/**
 * Add schema version field to a Mongoose schema
 */
export function addSchemaVersion(schema: Schema, version: number = 1): void {
    schema.add({
        schemaVersion: {
            type: Number,
            default: version,
            required: true,
            index: true
        }
    });
}

/**
 * Check if document is legacy (no schema version or old version)
 */
export function isLegacyDocument(doc: any, currentVersion: number): boolean {
    return !doc.schemaVersion || doc.schemaVersion < currentVersion;
}

/**
 * Get documents that need migration
 */
export async function getLegacyDocuments<T>(
    Model: any,
    currentVersion: number,
    limit: number = 1000
): Promise<T[]> {
    return Model.find({
        $or: [
            { schemaVersion: { $exists: false } },
            { schemaVersion: { $lt: currentVersion } }
        ]
    }).limit(limit);
}

/**
 * Update document schema version
 */
export async function updateSchemaVersion(
    Model: any,
    documentId: any,
    version: number
): Promise<void> {
    await Model.updateOne(
        { _id: documentId },
        { $set: { schemaVersion: version } }
    );
}

/**
 * Batch update schema versions
 */
export async function batchUpdateSchemaVersions(
    Model: any,
    documentIds: any[],
    version: number
): Promise<void> {
    await Model.updateMany(
        { _id: { $in: documentIds } },
        { $set: { schemaVersion: version } }
    );
}
