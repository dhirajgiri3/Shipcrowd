export interface ICODDiscrepancyResolution {
    method: 'auto_accept' | 'courier_adjustment' | 'merchant_writeoff' | 'split_difference';
    adjustedAmount?: number;
    resolvedAt?: Date;
    resolvedBy?: string;
    remarks?: string;
}
