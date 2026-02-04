/**
 * DelhiveryMapper Unit Tests
 */

import { DelhiveryMapper } from '../../../src/infrastructure/external/couriers/delhivery/delhivery.mapper';
import { CourierShipmentData } from '../../../src/infrastructure/external/couriers/base/courier.adapter';

describe('DelhiveryMapper', () => {
    describe('normalizePhone', () => {
        it('normalizes +91 number', () => {
            expect(DelhiveryMapper.normalizePhone('+919876543210')).toBe('9876543210');
        });

        it('normalizes 91 prefix', () => {
            expect(DelhiveryMapper.normalizePhone('919876543210')).toBe('9876543210');
        });

        it('strips non-digits', () => {
            expect(DelhiveryMapper.normalizePhone('+91-9876-543-210')).toBe('9876543210');
        });
    });

    describe('sanitize', () => {
        it('removes forbidden characters', () => {
            expect(DelhiveryMapper.sanitize('A&B#C%\\;')).toBe('A B C');
        });

        it('handles empty values', () => {
            expect(DelhiveryMapper.sanitize(undefined)).toBeUndefined();
        });
    });

    describe('toGrams', () => {
        it('converts kg to grams', () => {
            expect(DelhiveryMapper.toGrams(1.2)).toBe(1200);
        });
    });

    describe('mapForwardShipment', () => {
        it('maps shipment fields and COD correctly', () => {
            const data: CourierShipmentData = {
                origin: {
                    name: 'Warehouse',
                    phone: '+919999999999',
                    address: 'Origin',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    country: 'India'
                },
                destination: {
                    name: 'John Doe',
                    phone: '+919876543210',
                    address: '123, Street & Block',
                    city: 'Mumbai',
                    state: 'MH',
                    pincode: '400001',
                    country: 'India'
                },
                package: {
                    weight: 1,
                    length: 10,
                    width: 10,
                    height: 10
                },
                orderNumber: 'ORD-1',
                paymentMode: 'cod',
                codAmount: 250
            };

            const shipment = DelhiveryMapper.mapForwardShipment(data, { shippingMode: 'Surface' });
            expect(shipment.payment_mode).toBe('COD');
            expect(shipment.cod_amount).toBe(250);
            expect(shipment.weight).toBe(1000);
            expect(shipment.add).not.toContain('&');
        });
    });
});
