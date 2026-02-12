import logger from '../../../../shared/logger/winston.logger';
import CourierProviderRegistry from '../courier/courier-provider-registry';

type Provider = string;
type Confidence = 'high' | 'medium' | 'low';
type BookingFailureStage = 'before_awb' | 'after_awb' | 'unknown';

interface QuoteMetricInput {
    durationMs: number;
    providerAttempts: Provider[];
    providerTimeouts: Provider[];
    optionsCount: number;
    fallbackOptionsCount: number;
    confidence: Confidence;
}

interface VarianceMetricInput {
    variancePercent: number;
    autoClosed: boolean;
}

interface ServiceLevelPricingMetrics {
    quotes: {
        total: number;
        partialResults: number;
        avgLatencyMs: number;
        p95LatencyMs: number;
        optionsTotal: number;
        fallbackOptionsTotal: number;
        confidence: Record<Confidence, number>;
        providerAttempts: Record<string, number>;
        providerTimeouts: Record<string, number>;
        providerTimeoutRate: Record<string, number>;
    };
    bookings: {
        attempts: number;
        success: number;
        failures: number;
        failureStages: Record<BookingFailureStage, number>;
        fallback: {
            fallbackAttempts: number;
            fallbackSuccess: number;
            fallbackExhausted: number;
            nonRecoverableStops: number;
            fallbackEvents: number;
        };
    };
    reconciliation: {
        varianceCasesTotal: number;
        autoClosedWithinThreshold: number;
        openCasesAboveThreshold: number;
        buckets: {
            lte5: number;
            gt5_lte10: number;
            gt10: number;
        };
    };
    lastUpdatedAt?: string;
}

class ServiceLevelPricingMetricsService {
    private readonly latencySamples: number[] = [];
    private readonly MAX_LATENCY_SAMPLES = 1000;

    private metrics = {
        quotes: {
            total: 0,
            partialResults: 0,
            latencySumMs: 0,
            optionsTotal: 0,
            fallbackOptionsTotal: 0,
            confidence: {
                high: 0,
                medium: 0,
                low: 0,
            } as Record<Confidence, number>,
            providerAttempts: {
                ...Object.fromEntries(
                    CourierProviderRegistry.getSupportedProviders().map((provider) => [provider, 0])
                ),
            } as Record<string, number>,
            providerTimeouts: {
                ...Object.fromEntries(
                    CourierProviderRegistry.getSupportedProviders().map((provider) => [provider, 0])
                ),
            } as Record<string, number>,
        },
        bookings: {
            attempts: 0,
            success: 0,
            failures: 0,
            failureStages: {
                before_awb: 0,
                after_awb: 0,
                unknown: 0,
            } as Record<BookingFailureStage, number>,
            fallback: {
                fallbackAttempts: 0,
                fallbackSuccess: 0,
                fallbackExhausted: 0,
                nonRecoverableStops: 0,
                fallbackEvents: 0,
            },
        },
        reconciliation: {
            varianceCasesTotal: 0,
            autoClosedWithinThreshold: 0,
            openCasesAboveThreshold: 0,
            buckets: {
                lte5: 0,
                gt5_lte10: 0,
                gt10: 0,
            },
        },
        lastUpdatedAt: undefined as Date | undefined,
    };

    recordQuote(input: QuoteMetricInput): void {
        this.metrics.quotes.total += 1;
        this.metrics.quotes.latencySumMs += Math.max(0, Number(input.durationMs || 0));
        this.metrics.quotes.optionsTotal += Math.max(0, Number(input.optionsCount || 0));
        this.metrics.quotes.fallbackOptionsTotal += Math.max(0, Number(input.fallbackOptionsCount || 0));
        this.metrics.quotes.confidence[input.confidence] += 1;

        if (input.providerTimeouts.length > 0) {
            this.metrics.quotes.partialResults += 1;
        }

        for (const provider of input.providerAttempts) {
            const key = this.normalizeProviderKey(provider);
            this.ensureProviderCounter('providerAttempts', key);
            this.metrics.quotes.providerAttempts[key] += 1;
        }

        for (const provider of input.providerTimeouts) {
            const key = this.normalizeProviderKey(provider);
            this.ensureProviderCounter('providerTimeouts', key);
            this.metrics.quotes.providerTimeouts[key] += 1;
        }

        this.pushLatencySample(input.durationMs);
        this.metrics.lastUpdatedAt = new Date();
    }

    recordBookingAttempt(): void {
        this.metrics.bookings.attempts += 1;
        this.metrics.lastUpdatedAt = new Date();
    }

    recordBookingSuccess(meta?: { attemptNumber?: number; provider?: Provider; fallbackUsed?: boolean }): void {
        this.metrics.bookings.success += 1;
        if (meta?.attemptNumber && meta.attemptNumber > 1) {
            this.metrics.bookings.fallback.fallbackSuccess += 1;
        } else if (meta?.fallbackUsed) {
            this.metrics.bookings.fallback.fallbackSuccess += 1;
        }
        this.metrics.lastUpdatedAt = new Date();
    }

    recordBookingFailure(
        stage: BookingFailureStage = 'unknown',
        meta?: { attemptNumber?: number; fallbackAttempted?: boolean; allOptionsExhausted?: boolean; nonRecoverableStop?: boolean }
    ): void {
        this.metrics.bookings.failures += 1;
        this.metrics.bookings.failureStages[stage] += 1;
        if ((meta?.attemptNumber && meta.attemptNumber > 1) || meta?.fallbackAttempted) {
            this.metrics.bookings.fallback.fallbackAttempts += 1;
        }
        if (meta?.allOptionsExhausted) {
            this.metrics.bookings.fallback.fallbackExhausted += 1;
        }
        if (meta?.nonRecoverableStop) {
            this.metrics.bookings.fallback.nonRecoverableStops += 1;
        }
        this.metrics.lastUpdatedAt = new Date();
    }

    recordFallbackEvent(_input: {
        sessionId: string;
        initialProvider: Provider;
        fallbackProvider: Provider;
        attemptNumber: number;
        reason: string;
    }): void {
        this.metrics.bookings.fallback.fallbackEvents += 1;
        this.metrics.lastUpdatedAt = new Date();
    }

    recordVarianceCase(input: VarianceMetricInput): void {
        const varianceAbs = Math.abs(Number(input.variancePercent || 0));
        this.metrics.reconciliation.varianceCasesTotal += 1;

        if (input.autoClosed) {
            this.metrics.reconciliation.autoClosedWithinThreshold += 1;
        } else {
            this.metrics.reconciliation.openCasesAboveThreshold += 1;
        }

        if (varianceAbs <= 5) {
            this.metrics.reconciliation.buckets.lte5 += 1;
        } else if (varianceAbs <= 10) {
            this.metrics.reconciliation.buckets.gt5_lte10 += 1;
        } else {
            this.metrics.reconciliation.buckets.gt10 += 1;
        }

        this.metrics.lastUpdatedAt = new Date();
    }

    getSnapshot(): ServiceLevelPricingMetrics {
        const quoteTotal = this.metrics.quotes.total || 0;
        const avgLatencyMs = quoteTotal > 0
            ? Number((this.metrics.quotes.latencySumMs / quoteTotal).toFixed(2))
            : 0;

        const p95LatencyMs = this.calculateP95();

        const providerTimeoutRate = Object.keys(this.metrics.quotes.providerAttempts)
            .reduce((acc, provider) => {
                const attempts = this.metrics.quotes.providerAttempts[provider];
                const timeouts = this.metrics.quotes.providerTimeouts[provider] || 0;
                acc[provider] = attempts > 0 ? Number(((timeouts / attempts) * 100).toFixed(2)) : 0;
                return acc;
            }, {} as Record<string, number>);

        return {
            quotes: {
                total: quoteTotal,
                partialResults: this.metrics.quotes.partialResults,
                avgLatencyMs,
                p95LatencyMs,
                optionsTotal: this.metrics.quotes.optionsTotal,
                fallbackOptionsTotal: this.metrics.quotes.fallbackOptionsTotal,
                confidence: { ...this.metrics.quotes.confidence },
                providerAttempts: { ...this.metrics.quotes.providerAttempts },
                providerTimeouts: { ...this.metrics.quotes.providerTimeouts },
                providerTimeoutRate,
            },
            bookings: {
                attempts: this.metrics.bookings.attempts,
                success: this.metrics.bookings.success,
                failures: this.metrics.bookings.failures,
                failureStages: { ...this.metrics.bookings.failureStages },
                fallback: { ...this.metrics.bookings.fallback },
            },
            reconciliation: {
                varianceCasesTotal: this.metrics.reconciliation.varianceCasesTotal,
                autoClosedWithinThreshold: this.metrics.reconciliation.autoClosedWithinThreshold,
                openCasesAboveThreshold: this.metrics.reconciliation.openCasesAboveThreshold,
                buckets: { ...this.metrics.reconciliation.buckets },
            },
            lastUpdatedAt: this.metrics.lastUpdatedAt?.toISOString(),
        };
    }

    reset(): void {
        this.metrics = {
            quotes: {
                total: 0,
                partialResults: 0,
                latencySumMs: 0,
                optionsTotal: 0,
                fallbackOptionsTotal: 0,
                confidence: {
                    high: 0,
                    medium: 0,
                    low: 0,
                },
                providerAttempts: {
                    ...Object.fromEntries(
                        CourierProviderRegistry.getSupportedProviders().map((provider) => [provider, 0])
                    ),
                },
                providerTimeouts: {
                    ...Object.fromEntries(
                        CourierProviderRegistry.getSupportedProviders().map((provider) => [provider, 0])
                    ),
                },
            },
            bookings: {
                attempts: 0,
                success: 0,
                failures: 0,
                failureStages: {
                    before_awb: 0,
                    after_awb: 0,
                    unknown: 0,
                },
                fallback: {
                    fallbackAttempts: 0,
                    fallbackSuccess: 0,
                    fallbackExhausted: 0,
                    nonRecoverableStops: 0,
                    fallbackEvents: 0,
                },
            },
            reconciliation: {
                varianceCasesTotal: 0,
                autoClosedWithinThreshold: 0,
                openCasesAboveThreshold: 0,
                buckets: {
                    lte5: 0,
                    gt5_lte10: 0,
                    gt10: 0,
                },
            },
            lastUpdatedAt: new Date(),
        };

        this.latencySamples.length = 0;
        logger.info('Service level pricing metrics reset');
    }

    private pushLatencySample(durationMs: number): void {
        this.latencySamples.push(Math.max(0, Number(durationMs || 0)));
        if (this.latencySamples.length > this.MAX_LATENCY_SAMPLES) {
            this.latencySamples.shift();
        }
    }

    private calculateP95(): number {
        if (!this.latencySamples.length) {
            return 0;
        }
        const sorted = [...this.latencySamples].sort((a, b) => a - b);
        const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
        return Number(sorted[p95Index].toFixed(2));
    }

    private normalizeProviderKey(provider: string): string {
        return CourierProviderRegistry.toCanonical(provider) || String(provider || '').trim().toLowerCase();
    }

    private ensureProviderCounter(
        counter: 'providerAttempts' | 'providerTimeouts',
        provider: string
    ): void {
        if (!provider) return;

        if (this.metrics.quotes[counter][provider] === undefined) {
            this.metrics.quotes[counter][provider] = 0;
        }
    }
}

export default new ServiceLevelPricingMetricsService();
