import logger from '../../../../shared/logger/winston.logger';

interface MetricLabels {
    method?: string;
    status?: string;
    companyId?: string;
}

export class PricingMetricsService {
    private static instance: PricingMetricsService;

    // In-memory counters (Shim for Prometheus)
    private metrics = {
        pricing_requests_total: 0,
        pricing_latency_sum: 0,
        pricing_latency_count: 0,
        pricing_mismatch_count: 0,
        ratecard_import_errors: 0,
        cache_hits: 0,
        cache_misses: 0
    };

    private constructor() {
        // Periodically log metrics to console (mocking a scrape)
        setInterval(() => this.logMetrics(), 60000 * 60); // Every hour
    }

    static getInstance(): PricingMetricsService {
        if (!PricingMetricsService.instance) {
            PricingMetricsService.instance = new PricingMetricsService();
        }
        return PricingMetricsService.instance;
    }

    /**
     * Increment pricing request counter
     */
    incrementRequestCount(labels: MetricLabels = {}): void {
        this.metrics.pricing_requests_total++;
    }

    /**
     * Record pricing calculation latency
     * @param durationMs Duration in milliseconds
     */
    observeLatency(durationMs: number): void {
        this.metrics.pricing_latency_sum += durationMs;
        this.metrics.pricing_latency_count++;
    }

    /**
     * Increment audit mismatch counter
     */
    incrementMismatchCount(): void {
        this.metrics.pricing_mismatch_count++;
    }

    /**
     * Increment import error counter
     */
    incrementImportError(): void {
        this.metrics.ratecard_import_errors++;
    }

    /**
     * Record Cache Hit
     */
    recordCacheHit(type?: string): void {
        this.metrics.cache_hits++;
    }

    /**
     * Record Cache Miss
     */
    recordCacheMiss(type?: string): void {
        this.metrics.cache_misses++;
    }

    /**
     * Log current metrics state
     */
    logMetrics(): void {
        const avgLatency = this.metrics.pricing_latency_count > 0
            ? (this.metrics.pricing_latency_sum / this.metrics.pricing_latency_count).toFixed(2)
            : 0;

        const cacheTotal = this.metrics.cache_hits + this.metrics.cache_misses;
        const hitRatio = cacheTotal > 0 ? (this.metrics.cache_hits / cacheTotal).toFixed(2) : 0;

        logger.info('[PricingMetrics] Status Report', {
            requests: this.metrics.pricing_requests_total,
            avgLatencyMs: avgLatency,
            mismatches: this.metrics.pricing_mismatch_count,
            importErrors: this.metrics.ratecard_import_errors,
            cacheHitRatio: hitRatio
        });
    }
}

export default PricingMetricsService.getInstance();
