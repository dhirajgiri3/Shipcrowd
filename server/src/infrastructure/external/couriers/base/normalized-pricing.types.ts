export type PricingConfidence = 'high' | 'medium' | 'low';

export interface NormalizedServiceabilityResult {
    provider: 'velocity' | 'delhivery' | 'ekart';
    serviceable: boolean;
    zone?: string;
    minDays?: number;
    maxDays?: number;
    source: 'lane' | 'pincode' | 'api' | 'table';
    confidence: PricingConfidence;
    reason?: string;
    metadata?: Record<string, any>;
}

export interface NormalizedRateResult {
    provider: 'velocity' | 'delhivery' | 'ekart';
    amount: number;
    currency: string;
    source: 'live' | 'table' | 'hybrid';
    confidence: PricingConfidence;
    zone?: string;
    breakdown?: {
        freight?: number;
        cod?: number;
        fuel?: number;
        rto?: number;
        taxes?: number;
        total?: number;
    };
}
