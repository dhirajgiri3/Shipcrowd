export interface PricingFeatureFlags {
    serviceLevelPricingStrategyEnabled: boolean;
    serviceLevelRtoPricingEnabled: boolean;
    serviceLevelZoneMatrixEnabled: boolean;
    reverseQuoteEnabled: boolean;
}

const toBool = (value: string | undefined): boolean => value === 'true';
const toBoolDefaultTrue = (value: string | undefined): boolean => value !== 'false';

export const getPricingFeatureFlags = (): PricingFeatureFlags => ({
    serviceLevelPricingStrategyEnabled: toBool(process.env.SERVICE_LEVEL_PRICING_STRATEGY_ENABLED),
    // Backward-compatible default: include RTO in quote totals unless explicitly disabled.
    serviceLevelRtoPricingEnabled: toBoolDefaultTrue(process.env.SERVICE_LEVEL_RTO_PRICING_ENABLED),
    serviceLevelZoneMatrixEnabled: toBool(process.env.SERVICE_LEVEL_ZONE_MATRIX_ENABLED),
    reverseQuoteEnabled: toBool(process.env.REVERSE_QUOTE_ENABLED),
});

export default {
    getPricingFeatureFlags,
};
