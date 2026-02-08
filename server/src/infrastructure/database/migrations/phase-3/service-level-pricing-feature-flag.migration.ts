import mongoose from 'mongoose';
import FeatureFlag from '../../mongoose/models/system/feature-flag.model';

const SYSTEM_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

export class ServiceLevelPricingFeatureFlagMigration {
    constructor(private dryRun: boolean = false) { }

    async run() {
        console.log('--- Starting Service-Level Pricing Feature Flag Migration ---');
        console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE Execute'}`);

        const existing = await FeatureFlag.findOne({
            key: 'enable_service_level_pricing',
            isArchived: false,
        });

        if (this.dryRun) {
            console.log(
                existing
                    ? '[DryRun] Would update existing flag: enable_service_level_pricing'
                    : '[DryRun] Would create flag: enable_service_level_pricing'
            );
            return;
        }

        if (!existing) {
            await FeatureFlag.create({
                key: 'enable_service_level_pricing',
                name: 'Enable Service-Level Pricing',
                description: 'Activates service-level courier quotes, quote sessions, and reconciliation workflows.',
                isEnabled: false,
                type: 'boolean',
                rolloutPercentage: 0,
                rolloutAttribute: 'companyId',
                environments: {
                    development: true,
                    sandbox: true,
                    production: true,
                },
                category: 'feature',
                tags: ['shipping', 'pricing', 'rollout'],
                createdBy: SYSTEM_USER_ID,
                rules: [],
            });
            console.log('Created feature flag: enable_service_level_pricing');
            return;
        }

        existing.rolloutAttribute = existing.rolloutAttribute || 'companyId';
        existing.rolloutPercentage = existing.rolloutPercentage ?? 0;
        existing.category = existing.category || 'feature';
        existing.updatedBy = SYSTEM_USER_ID;
        await existing.save();

        console.log('Updated feature flag defaults: enable_service_level_pricing');
    }
}
