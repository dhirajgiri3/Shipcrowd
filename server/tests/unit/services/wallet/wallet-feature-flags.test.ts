import { isWalletAutoRechargeFeatureEnabled, WALLET_AUTO_RECHARGE_FLAG_KEY } from '@/core/application/services/wallet/wallet-feature-flags';
import FeatureFlagService from '@/core/application/services/system/feature-flag.service';

jest.mock('@/core/application/services/system/feature-flag.service', () => ({
    __esModule: true,
    default: {
        evaluate: jest.fn(),
    },
}));

describe('wallet-feature-flags', () => {
    const originalEnv = process.env.AUTO_RECHARGE_FEATURE_ENABLED;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env.AUTO_RECHARGE_FEATURE_ENABLED = originalEnv;
    });

    it('returns false when env kill-switch is off', async () => {
        process.env.AUTO_RECHARGE_FEATURE_ENABLED = 'false';
        const enabled = await isWalletAutoRechargeFeatureEnabled({ companyId: 'company-1' });
        expect(enabled).toBe(false);
        expect(FeatureFlagService.evaluate).not.toHaveBeenCalled();
    });

    it('returns false when env on but db flag missing/false', async () => {
        process.env.AUTO_RECHARGE_FEATURE_ENABLED = 'true';
        (FeatureFlagService.evaluate as jest.Mock).mockResolvedValue(false);

        const enabled = await isWalletAutoRechargeFeatureEnabled({ companyId: 'company-1' });
        expect(enabled).toBe(false);
        expect(FeatureFlagService.evaluate).toHaveBeenCalledWith(
            WALLET_AUTO_RECHARGE_FLAG_KEY,
            { companyId: 'company-1' },
            false
        );
    });

    it('returns true only when env on and db flag enabled', async () => {
        process.env.AUTO_RECHARGE_FEATURE_ENABLED = 'true';
        (FeatureFlagService.evaluate as jest.Mock).mockResolvedValue(true);

        const enabled = await isWalletAutoRechargeFeatureEnabled({ companyId: 'company-1' });
        expect(enabled).toBe(true);
    });
});

