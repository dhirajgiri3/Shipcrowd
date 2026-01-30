/**
 * Feature Flags Configuration
 * 
 * Controls gradual rollout of schema changes.
 * All flags default to OFF for safety.
 */

export interface FeatureFlags {
    schema: {
        companyIdMigration: boolean;
        newAddressSchema: boolean;
        lowercaseEnums: boolean;
        cascadeDelete: boolean;
        rateCardV2: boolean;
    };
}

export const featureFlags: FeatureFlags = {
    schema: {
        // Company field rename: company → companyId
        companyIdMigration: process.env.FEATURE_COMPANY_ID_MIGRATION === 'true',

        // New shared address schema
        newAddressSchema: process.env.FEATURE_NEW_ADDRESS_SCHEMA === 'true',

        // Lowercase status enums
        lowercaseEnums: process.env.FEATURE_LOWERCASE_ENUMS === 'true',

        // Cascade delete hooks
        cascadeDelete: process.env.FEATURE_CASCADE_DELETE === 'true',

        // Multi-Courier Pricing Engine (V2)
        rateCardV2: process.env.FEATURE_RATECARD_V2 === 'true',
    }
};

/**
 * Canary rollout support
 * Enable features for specific companies/tenants
 */
export interface CanaryConfig {
    enabledCompanies: string[]; // Company IDs
    rolloutPercentage: number; // 0-100
}

const canaryConfigs: Map<string, CanaryConfig> = new Map();

/**
 * Check if feature is enabled for a specific company
 */
export function isFeatureEnabledForCompany(
    featureName: keyof FeatureFlags['schema'],
    companyId: string
): boolean {
    const globalEnabled = featureFlags.schema[featureName];

    // If globally enabled, return true
    if (globalEnabled) return true;

    // Check canary config
    const canary = canaryConfigs.get(featureName);
    if (!canary) return false;

    // Check if company is in enabled list
    if (canary.enabledCompanies.includes(companyId)) return true;

    // Check rollout percentage (deterministic based on company ID)
    const hash = companyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const bucket = hash % 100;
    return bucket < canary.rolloutPercentage;
}

/**
 * Configure canary rollout for a feature
 */
export function setCanaryConfig(
    featureName: keyof FeatureFlags['schema'],
    config: CanaryConfig
): void {
    canaryConfigs.set(featureName, config);
}

/**
 * Get current canary config
 */
export function getCanaryConfig(
    featureName: keyof FeatureFlags['schema']
): CanaryConfig | undefined {
    return canaryConfigs.get(featureName);
}
