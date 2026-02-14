jest.mock('p-map', () => ({
    __esModule: true,
    default: async (input: any[], mapper: any) => Promise.all(input.map(mapper)),
}));

jest.mock('@/infrastructure/database/mongoose/models', () => ({
    Company: {
        find: jest.fn(),
        updateOne: jest.fn(),
    },
}));

jest.mock('@/core/application/services/wallet/wallet.service', () => ({
    __esModule: true,
    default: {
        processAutoRecharge: jest.fn(),
    },
}));

jest.mock('@/core/application/services/wallet/wallet-feature-flags', () => ({
    isWalletAutoRechargeFeatureEnabled: jest.fn(),
}));

jest.mock('@/core/application/services/metrics/auto-recharge-metrics.service', () => ({
    __esModule: true,
    default: {
        recordAttempt: jest.fn(),
        recordSuccess: jest.fn(),
        recordFailure: jest.fn(),
    },
}));

jest.mock('@/shared/logger/winston.logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

import { autoRechargeWorker } from '@/workers/finance/auto-recharge.worker';
import { Company } from '@/infrastructure/database/mongoose/models';
import WalletService from '@/core/application/services/wallet/wallet.service';
import { isWalletAutoRechargeFeatureEnabled } from '@/core/application/services/wallet/wallet-feature-flags';
import autoRechargeMetrics from '@/core/application/services/metrics/auto-recharge-metrics.service';

describe('autoRechargeWorker feature flag behavior', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('skips all processing when global auto-recharge feature is disabled', async () => {
        (isWalletAutoRechargeFeatureEnabled as jest.Mock).mockResolvedValue(false);

        await autoRechargeWorker();

        expect(Company.find).not.toHaveBeenCalled();
        expect(WalletService.processAutoRecharge).not.toHaveBeenCalled();
    });

    it('processes eligible companies when feature is enabled', async () => {
        (isWalletAutoRechargeFeatureEnabled as jest.Mock).mockResolvedValue(true);

        const companies = [
            {
                _id: 'company-1',
                name: 'Demo',
                wallet: {
                    autoRecharge: {
                        amount: 5000,
                        paymentMethodId: 'pm_123',
                    },
                },
            },
        ];

        const chain: any = {
            limit: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValueOnce(companies).mockResolvedValueOnce([]),
        };
        (Company.find as jest.Mock).mockReturnValue(chain);
        (Company.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });
        (WalletService.processAutoRecharge as jest.Mock).mockResolvedValue({ success: true });

        await autoRechargeWorker();

        expect(Company.find).toHaveBeenCalled();
        expect(WalletService.processAutoRecharge).toHaveBeenCalledWith('company-1', 5000, 'pm_123');
    });

    it('does not count pending auto-recharge as failure', async () => {
        (isWalletAutoRechargeFeatureEnabled as jest.Mock).mockResolvedValue(true);

        const companies = [
            {
                _id: 'company-1',
                name: 'Demo',
                wallet: {
                    autoRecharge: {
                        amount: 5000,
                        paymentMethodId: 'pm_123',
                    },
                },
            },
        ];

        const chain: any = {
            limit: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValueOnce(companies).mockResolvedValueOnce([]),
        };
        (Company.find as jest.Mock).mockReturnValue(chain);
        (Company.updateOne as jest.Mock).mockResolvedValue({ acknowledged: true });
        (WalletService.processAutoRecharge as jest.Mock).mockResolvedValue({
            success: false,
            pending: true,
            transactionId: 'order_123',
        });

        await autoRechargeWorker();

        expect(autoRechargeMetrics.recordFailure).not.toHaveBeenCalled();
    });
});
