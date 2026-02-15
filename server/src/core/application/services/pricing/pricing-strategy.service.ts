import { IServiceRateCard } from '../../../../infrastructure/database/mongoose/models/logistics/shipping/configuration/service-rate-card.model';
import { PricingConfidence } from '../../../../infrastructure/external/couriers/base/normalized-pricing.types';
import { PricingSource } from '../../../domain/types/service-level-pricing.types';

type CardSourceMode = IServiceRateCard['sourceMode'];

interface CostStrategyInput {
    cardSourceMode?: CardSourceMode;
    hasCard: boolean;
    hasLiveRate: boolean;
}

interface SellStrategyInput {
    cardSourceMode?: CardSourceMode;
    hasCard: boolean;
}

class PricingStrategyService {
    resolveCost(input: CostStrategyInput): {
        mode: 'live' | 'formula' | 'fallback';
        source: PricingSource;
        confidence: PricingConfidence;
    } {
        if (!input.hasCard) {
            if (input.hasLiveRate) {
                return { mode: 'live', source: 'live', confidence: 'high' };
            }
            return { mode: 'fallback', source: 'table', confidence: 'low' };
        }

        const sourceMode = input.cardSourceMode || 'TABLE';
        if ((sourceMode === 'LIVE_API' || sourceMode === 'HYBRID') && input.hasLiveRate) {
            return {
                mode: 'live',
                source: sourceMode === 'LIVE_API' ? 'live' : 'hybrid',
                confidence: 'medium',
            };
        }

        return {
            mode: 'formula',
            source: sourceMode === 'HYBRID' ? 'hybrid' : 'table',
            confidence: 'medium',
        };
    }

    resolveSell(input: SellStrategyInput): {
        mode: 'formula' | 'fallback';
        source: PricingSource;
    } {
        if (!input.hasCard) {
            return { mode: 'fallback', source: 'table' };
        }

        return {
            mode: 'formula',
            source: this.mapCardSourceModeToPricingSource(input.cardSourceMode),
        };
    }

    private mapCardSourceModeToPricingSource(sourceMode?: CardSourceMode): PricingSource {
        if (sourceMode === 'LIVE_API') return 'live';
        if (sourceMode === 'HYBRID') return 'hybrid';
        return 'table';
    }
}

export default new PricingStrategyService();
