/**
 * Unit Tests for EkartMapper
 * 
 * Tests cover:
 * - Phone number normalization and validation
 * - Pincode validation
 * - Weight conversion
 * - String sanitization
 * - Forward shipment mapping
 * - Reverse shipment mapping
 * - Validation functions
 */

import { CourierReverseShipmentData, CourierShipmentData } from '@/infrastructure/external/couriers/base/courier.adapter';
import { EkartMapper } from '@/infrastructure/external/couriers/ekart/ekart.mapper';
import { describe, expect, it } from '@jest/globals';

describe('EkartMapper', () => {
    describe('normalizePhone', () => {
        it('should strip +91 country code', () => {
            expect(EkartMapper.normalizePhone('+919876543210')).toBe('9876543210');
        });

        it('should handle phone without country code', () => {
            expect(EkartMapper.normalizePhone('9876543210')).toBe('9876543210');
        });

        it('should throw error for invalid phone length', () => {
            expect(() => EkartMapper.normalizePhone('12345')).toThrow();
        });

        it('should handle phone with spaces and dashes', () => {
            expect(EkartMapper.normalizePhone('98765-43210')).toBe('9876543210');
        });
    });

    describe('validatePincode', () => {
        it('should validate correct 6-digit pincode', () => {
            expect(EkartMapper.validatePincode('110001')).toBe(true);
        });

        it('should throw error for invalid pincode length', () => {
            expect(() => EkartMapper.validatePincode('1100')).toThrow();
        });

        it('should throw error for non-numeric pincode', () => {
            expect(() => EkartMapper.validatePincode('11000A')).toThrow();
        });
    });

    describe('toGrams', () => {
        it('should convert kg to grams', () => {
            expect(EkartMapper.toGrams(1.5)).toBe(1500);
        });

        it('should handle zero weight', () => {
            expect(EkartMapper.toGrams(0)).toBe(1); // Min 1 gram
        });

        it('should round to integer', () => {
            expect(EkartMapper.toGrams(0.0015)).toBe(2); // 1.5g rounds to 2
        });
    });

    describe('sanitize', () => {
        it('should remove special characters', () => {
            expect(EkartMapper.sanitize('Test@123#')).toBe('Test@123');
        });

        it('should preserve spaces and hyphens', () => {
            expect(EkartMapper.sanitize('Test-Address 123')).toBe('Test-Address 123');
        });

        it('should trim whitespace', () => {
            expect(EkartMapper.sanitize('  Test  ')).toBe('Test');
        });

        it('should handle empty string', () => {
            expect(EkartMapper.sanitize('')).toBe('');
        });
    });

    describe('validateForwardShipmentData', () => {
        const validData: CourierShipmentData = {
            origin: {
                name: 'Warehouse',
                phone: '9876543210',
                address: '123 St',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                country: 'India'
            },
            destination: {
                name: 'Customer',
                phone: '9123456789',
                address: '456 Rd',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001',
                country: 'India'
            },
            package: {
                weight: 1,
                length: 10,
                width: 10,
                height: 10
            },
            orderNumber: 'ORD-123',
            paymentMode: 'prepaid'
        };

        it('should validate correct data', () => {
            expect(() => EkartMapper.validateForwardShipmentData(validData)).not.toThrow();
        });

        it('should throw for missing order number', () => {
            const invalidData = { ...validData, orderNumber: '' };
            expect(() => EkartMapper.validateForwardShipmentData(invalidData)).toThrow('Order number is required');
        });

        it('should throw for invalid weight', () => {
            const invalidData = { ...validData, package: { ...validData.package, weight: 0 } };
            expect(() => EkartMapper.validateForwardShipmentData(invalidData)).toThrow('Package weight is required');
        });
    });

    describe('validateReverseShipmentData', () => {
        const validReverseData: CourierReverseShipmentData = {
            orderId: 'ORD-123',
            pickupAddress: {
                name: 'Customer',
                phone: '9123456789',
                address: '123 St',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001',
                country: 'India'
            },
            returnWarehouseId: 'WH-001',
            package: {
                weight: 1,
                length: 10,
                width: 10,
                height: 10
            }
        };

        it('should validate correct reverse data', () => {
            expect(() => EkartMapper.validateReverseShipmentData(validReverseData)).not.toThrow();
        });

        it('should throw for missing orderId', () => {
            const invalidData = { ...validReverseData, orderId: '' };
            expect(() => EkartMapper.validateReverseShipmentData(invalidData)).toThrow('Order ID is required');
        });

        it('should throw for invalid weight', () => {
            const invalidData = { ...validReverseData, package: { ...validReverseData.package, weight: 0 } };
            expect(() => EkartMapper.validateReverseShipmentData(invalidData)).toThrow('Package weight is required');
        });
    });
});
