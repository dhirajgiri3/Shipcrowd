import { initRechargeSchema, rechargeWalletSchema } from '@/shared/validation/schemas/financial.schemas';

describe('financial schemas - wallet recharge caps', () => {
    it('accepts amount up to ₹1,00,000 for recharge init', () => {
        const result = initRechargeSchema.safeParse({ amount: 100000 });
        expect(result.success).toBe(true);
    });

    it('rejects amount above ₹1,00,000 for recharge init', () => {
        const result = initRechargeSchema.safeParse({ amount: 100001 });
        expect(result.success).toBe(false);
    });

    it('accepts amount up to ₹1,00,000 for recharge confirmation payload', () => {
        const result = rechargeWalletSchema.safeParse({
            amount: 100000,
            paymentId: 'pay_1',
            orderId: 'order_1',
            signature: 'sig_1',
        });
        expect(result.success).toBe(true);
    });

    it('rejects amount above ₹1,00,000 for recharge confirmation payload', () => {
        const result = rechargeWalletSchema.safeParse({
            amount: 100001,
            paymentId: 'pay_1',
            orderId: 'order_1',
            signature: 'sig_1',
        });
        expect(result.success).toBe(false);
    });
});
