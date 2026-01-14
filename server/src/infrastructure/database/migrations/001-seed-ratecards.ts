import mongoose from 'mongoose';
import Company from '../mongoose/models/organization/core/company.model';
import RateCard from '../mongoose/models/logistics/shipping/configuration/rate-card.model';

/**
 * Migration: Seed RateCards for all existing companies
 * 
 * Purpose: Populate RateCard database for dynamic pricing (Phase 0)
 * 
 * Rollback Strategy:
 * - up(): Create RateCards for all companies
 * - down(): Remove all seeded RateCards
 */

interface RateCardSeed {
    name: string;
    companyId: mongoose.Types.ObjectId;
    description: string;
    baseRates: Array<{
        carrier: string;
        serviceType: string;
        basePrice: number;
        minWeight: number;
        maxWeight: number;
    }>;
    weightRules: Array<{
        minWeight: number;
        maxWeight: number;
        pricePerKg: number;  // Fixed: was additionalPricePerKg
    }>;
    zoneMultipliers: Record<string, number>;
    codCharges: {
        percentage: number;
        minimum: number;
    };
    status: 'active' | 'inactive';
}

/**
 * Seed default RateCards for all companies
 */
export async function up() {
    console.log('[Migration 001] Starting RateCard seeding...');

    const companies = await Company.find({ isDeleted: false }).lean();
    console.log(`[Migration 001] Found ${companies.length} companies to seed`);

    let seededCount = 0;

    for (const company of companies) {
        try {
            // Check if RateCard already exists
            const existing = await RateCard.findOne({
                companyId: company._id,
                name: `${company.name} - Default Rate Card`
            });

            if (existing) {
                console.log(`[Migration 001] Skipped ${company.name} (already has RateCard)`);
                continue;
            }

            // Create default RateCard
            const rateCardData: RateCardSeed = {
                name: `${company.name} - Default Rate Card`,
                companyId: company._id,
                description: 'Auto-generated default rate card for dynamic pricing (Phase 0)',

                // Base rates for Velocity (primary carrier)
                baseRates: [
                    // Weight slab 0-0.5kg
                    { carrier: 'velocity', serviceType: 'standard', basePrice: 35, minWeight: 0, maxWeight: 0.5 },
                    { carrier: 'velocity', serviceType: 'express', basePrice: 50, minWeight: 0, maxWeight: 0.5 },

                    // Weight slab 0.5-1kg
                    { carrier: 'velocity', serviceType: 'standard', basePrice: 45, minWeight: 0.5, maxWeight: 1 },
                    { carrier: 'velocity', serviceType: 'express', basePrice: 65, minWeight: 0.5, maxWeight: 1 },

                    // Weight slab 1-2kg
                    { carrier: 'velocity', serviceType: 'standard', basePrice: 60, minWeight: 1, maxWeight: 2 },
                    { carrier: 'velocity', serviceType: 'express', basePrice: 85, minWeight: 1, maxWeight: 2 },

                    // Weight slab 2-5kg
                    { carrier: 'velocity', serviceType: 'standard', basePrice: 90, minWeight: 2, maxWeight: 5 },
                    { carrier: 'velocity', serviceType: 'express', basePrice: 125, minWeight: 2, maxWeight: 5 },

                    // Weight slab 5-10kg
                    { carrier: 'velocity', serviceType: 'standard', basePrice: 150, minWeight: 5, maxWeight: 10 },
                    { carrier: 'velocity', serviceType: 'express', basePrice: 210, minWeight: 5, maxWeight: 10 },
                ],

                // Additional weight charges (per kg above base slab)
                weightRules: [
                    { minWeight: 0, maxWeight: 10, pricePerKg: 18 },
                    { minWeight: 10, maxWeight: 25, pricePerKg: 15 },
                    { minWeight: 25, maxWeight: 100, pricePerKg: 12 },
                ],

                // Zone multipliers (A-E zones)
                zoneMultipliers: {
                    'zoneA': 0.85,  // Same city (15% discount)
                    'zoneB': 0.95,  // Same state (5% discount)
                    'zoneC': 1.0,   // Metro to metro (standard)
                    'zoneD': 1.1,   // Rest of India (10% premium)
                    'zoneE': 1.3,   // J&K/Northeast (30% premium)
                },

                // COD charges
                codCharges: {
                    percentage: 0.02,  // 2% of order value
                    minimum: 30,       // Minimum ₹30
                },

                status: 'active'
            };

            await RateCard.create(rateCardData);
            seededCount++;
            console.log(`[Migration 001] ✓ Seeded RateCard for ${company.name}`);
        } catch (error) {
            console.error(`[Migration 001] ✗ Failed to seed ${company.name}:`, error);
        }
    }

    console.log(`[Migration 001] Completed: Seeded ${seededCount}/${companies.length} RateCards`);
}

/**
 * Rollback: Remove all seeded RateCards
 */
export async function down() {
    console.log('[Migration 001] Rolling back RateCard seeding...');

    const result = await RateCard.deleteMany({
        description: 'Auto-generated default rate card for dynamic pricing (Phase 0)'
    });

    console.log(`[Migration 001] Rollback completed: Removed ${result.deletedCount} RateCards`);
}

/**
 * Migration metadata
 */
export const metadata = {
    version: '001',
    name: 'seed-ratecards',
    description: 'Seed default RateCards for all companies (Phase 0)',
    createdAt: new Date('2026-01-14'),
};
