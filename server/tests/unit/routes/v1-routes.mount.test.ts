import app from '@/app';
import request from 'supertest';

describe('v1 route mounts', () => {
    it('mounts commission payout webhook route (not 404)', async () => {
        const response = await request(app)
            .post('/api/v1/commission/payouts/webhook')
            .send({ event: 'payout.processed' });

        expect(response.status).not.toBe(404);
    });

    it('mounts razorpay payment webhook route (not 404)', async () => {
        const response = await request(app)
            .post('/api/v1/webhooks/razorpay/payment')
            .send({ event: 'payment.captured' });

        expect(response.status).not.toBe(404);
    });
});
