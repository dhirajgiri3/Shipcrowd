import * as walletController from '@/presentation/http/controllers/finance/wallet.controller';
import WalletService from '@/core/application/services/wallet/wallet.service';
import { guardChecks, requireCompanyContext } from '@/shared/helpers/controller.helpers';
import { sendSuccess } from '@/shared/utils/responseHelper';
import { AppError } from '@/shared/errors/app.error';

jest.mock('@/core/application/services/wallet/wallet.service', () => ({
    __esModule: true,
    default: {
        updateAutoRechargeSettings: jest.fn(),
        getAutoRechargeSettings: jest.fn(),
    },
}));

jest.mock('@/shared/helpers/controller.helpers', () => ({
    guardChecks: jest.fn(),
    requireCompanyContext: jest.fn(),
}));

jest.mock('@/shared/utils/responseHelper', () => ({
    sendSuccess: jest.fn(),
    sendPaginated: jest.fn(),
}));

jest.mock('@/shared/logger/winston.logger', () => ({
    error: jest.fn(),
}));

describe('wallet.controller auto-recharge feature gate', () => {
    const req: any = { body: {} };
    const res: any = {};
    const next = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (guardChecks as jest.Mock).mockReturnValue({
            companyId: 'company-1',
            userId: 'user-1',
            role: 'seller',
        });
        (requireCompanyContext as jest.Mock).mockImplementation(() => undefined);
    });

    it('returns 403 when enabling auto-recharge while feature is disabled', async () => {
        req.body = { enabled: true, threshold: 1000, amount: 5000, paymentMethodId: 'pm_1' };
        (WalletService.updateAutoRechargeSettings as jest.Mock).mockRejectedValue(
            new AppError('Auto-recharge is currently unavailable', 'FEATURE_DISABLED', 403)
        );

        await walletController.updateAutoRechargeSettings(req, res, next);

        expect(next).toHaveBeenCalled();
        const error = (next as jest.Mock).mock.calls[0][0];
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('FEATURE_DISABLED');
    });

    it('returns settings with featureEnabled after successful update', async () => {
        req.body = { enabled: false };
        (WalletService.updateAutoRechargeSettings as jest.Mock).mockResolvedValue({
            success: true,
            settings: {
                enabled: false,
                threshold: 1000,
                amount: 5000,
                paymentMethodId: null,
                dailyLimit: 100000,
                monthlyLimit: 500000,
                featureEnabled: false,
            },
        });

        await walletController.updateAutoRechargeSettings(req, res, next);

        expect(sendSuccess).toHaveBeenCalledWith(
            res,
            expect.objectContaining({
                featureEnabled: false,
                enabled: false,
            }),
            'Auto-recharge settings updated successfully'
        );
    });

    it('returns get settings payload from service (including featureEnabled)', async () => {
        (WalletService.getAutoRechargeSettings as jest.Mock).mockResolvedValue({
            enabled: false,
            threshold: 1000,
            amount: 5000,
            featureEnabled: false,
        });

        await walletController.getAutoRechargeSettings(req, res, next);

        expect(sendSuccess).toHaveBeenCalledWith(
            res,
            expect.objectContaining({ featureEnabled: false }),
            'Auto-recharge settings retrieved'
        );
    });
});
