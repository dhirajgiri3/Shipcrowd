/**
 * Fraud Detection Module
 *
 * Complete fraud detection system with:
 * - Real-time fraud risk scoring
 * - Pattern matching and rule evaluation
 * - Blacklist verification
 * - AI-powered analysis
 * - Alert generation and tracking
 *
 * STATUS: Standalone, not integrated (ready for future activation)
 */

export { default as FraudDetectionService } from './fraud-detection.service';
export { default as OpenAIFraudService } from './openai-fraud.service';
export * from './fraud-utils';

export type {
    IOrderAnalysisInput,
    IFraudAnalysisResult,
    IBlacklistEntry,
} from './fraud-detection.service';
