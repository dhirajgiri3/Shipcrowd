import redisLockService from '@/core/application/services/infra/redis-lock.service';
import walletService from '@/core/application/services/wallet/wallet.service';
import { AutoRechargeLog } from '@/infrastructure/database/mongoose/models/finance/auto-recharge-log.model';
import { handlePaymentWebhook } from '@/presentation/http/controllers/webhooks/payment/razorpay-payment.webhook.controller';
import { Request, Response } from 'express';

jest.mock('@/core/application/services/wallet/wallet.service', () => ({
    __esModule: true,
    default: {
        processCapturedRechargeWebhook: jest.fn(),
        credit: jest.fn(),
    },
}));

jest.mock('@/infrastructure/database/mongoose/models/finance/auto-recharge-log.model', () => ({
    AutoRechargeLog: {
        findOne: jest.fn(),
        create: jest.fn(),
    },
}));

jest.mock('@/core/application/services/infra/redis-lock.service', () => ({
    __esModule: true,
    default: {
        acquireLock: jest.fn(),
        releaseLock: jest.fn(),
    },
}));

jest.mock('@/shared/logger/winston.logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

describe('razorpay payment webhook controller', () => {
    const mockRes = () => {
        const res: Partial<Response> = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res as Response;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (redisLockService.acquireLock as jest.Mock).mockResolvedValue(true);
        (redisLockService.releaseLock as jest.Mock).mockResolvedValue(undefined);
    });

    it('ignores unsupported payment purpose', async () => {
        const req = {
            body: {
                event: 'payment.captured',
                payload: { payment: { entity: { id: 'pay_1', notes: { purpose: 'order_payment' } } } },
            },
        } as unknown as Request;
        const res = mockRes();

        await handlePaymentWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ status: 'ignored' });
        expect(redisLockService.acquireLock).not.toHaveBeenCalled();
    });

    it('credits wallet recharge captures via wallet service', async () => {
        (walletService.processCapturedRechargeWebhook as jest.Mock).mockResolvedValue({
            success: true,
            transactionId: 'txn_1',
            companyId: 'company_1',
        });

        const req = {
            body: {
                event: 'payment.captured',
                payload: { payment: { entity: { id: 'pay_wallet_1', notes: { purpose: 'wallet_recharge' } } } },
            },
        } as unknown as Request;
        const res = mockRes();

        await handlePaymentWebhook(req, res);

        expect(redisLockService.acquireLock).toHaveBeenCalledWith('wallet-recharge:webhook:pay_wallet_1', 30000);
        expect(walletService.processCapturedRechargeWebhook).toHaveBeenCalledWith('pay_wallet_1');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true });
        expect(redisLockService.releaseLock).toHaveBeenCalledWith('wallet-recharge:webhook:pay_wallet_1');
    });

    it('returns 500 when wallet recharge crediting fails', async () => {
        (walletService.processCapturedRechargeWebhook as jest.Mock).mockResolvedValue({
            success: false,
            error: 'credit failed',
        });

        const req = {
            body: {
                event: 'payment.captured',
                payload: { payment: { entity: { id: 'pay_wallet_2', notes: { purpose: 'wallet_recharge' } } } },
            },
        } as unknown as Request;
        const res = mockRes();

        await handlePaymentWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Internal processing error' });
    });

    it('short-circuits already processed auto-recharge webhook', async () => {
        (AutoRechargeLog.findOne as jest.Mock).mockResolvedValue({ status: 'success' });

        const req = {
            body: {
                event: 'payment.captured',
                payload: {
                    payment: {
                        entity: {
                            id: 'pay_auto_1',
                            notes: { purpose: 'auto-recharge', companyId: 'company_1', idempotencyKey: 'k1' },
                        },
                    },
                },
            },
        } as unknown as Request;
        const res = mockRes();

        await handlePaymentWebhook(req, res);

        expect(redisLockService.acquireLock).toHaveBeenCalledWith('auto-recharge:webhook:pay_auto_1', 30000);
        expect(AutoRechargeLog.findOne).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ status: 'processed' });
    });

    it('keeps ignoring non-captured events', async () => {
        const req = {
            body: {
                event: 'payment.failed',
                payload: { payment: { entity: { id: 'pay_ignored' } } },
            },
        } as unknown as Request;
        const res = mockRes();

        await handlePaymentWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ status: 'ignored' });
        expect(redisLockService.acquireLock).not.toHaveBeenCalled();
    });
});
