import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AddressValidationService from '../../../../src/core/application/services/validation/address-validation.service';
import PhoneVerificationService from '../../../../src/core/application/services/validation/phone-verification.service';
import { RiskScoringService } from '../../../../src/core/application/services/risk/risk-scoring.service';
// Note: Dependencies are mocked below

// Mock PincodeLookupService
jest.mock('../../../../src/core/application/services/logistics/pincode-lookup.service', () => ({
    isValidPincodeFormat: jest.fn(),
    getPincodeDetails: jest.fn(),
}));

// Mock ExotelClient
jest.mock('../../../../src/infrastructure/external/communication/exotel/exotel.client', () => {
    return jest.fn().mockImplementation(() => ({
        // Mock methods if any needed
    }));
});

// Mock CacheService
jest.mock('../../../../src/infrastructure/utilities/cache.service', () => ({
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
}));

// Mock CODVerificationService
jest.mock('../../../../src/core/application/services/payment/cod-verification.service', () => ({
    verify: jest.fn(),
}));

// Mock Logger
jest.mock('../../../../src/shared/logger/winston.logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

import PincodeLookupService from '../../../../src/core/application/services/logistics/pincode-lookup.service';
import CacheService from '../../../../src/infrastructure/utilities/cache.service';
import CODVerificationService from '../../../../src/core/application/services/payment/cod-verification.service';


describe('Prevention Layer', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('AddressValidationService', () => {
        it('should validate a correct address', async () => {
            (PincodeLookupService.isValidPincodeFormat as any).mockReturnValue(true);
            (PincodeLookupService.getPincodeDetails as any).mockReturnValue({
                city: 'MUMBAI',
                state: 'MAHARASHTRA'
            });

            const address = {
                line1: 'Main Street, Andheri West', // Removed "123" to avoid junk keyword
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400053'
            };

            const result = await AddressValidationService.validate(address);

            expect(result.isValid).toBe(true);
            expect(result.score).toBeGreaterThan(0.8);
            expect(result.issues).toHaveLength(0);
        });

        it('should detect mismatching city/state', async () => {
            (PincodeLookupService.isValidPincodeFormat as any).mockReturnValue(true);
            (PincodeLookupService.getPincodeDetails as any).mockReturnValue({
                city: 'DELHI',
                state: 'DELHI'
            });

            const address = {
                line1: 'Main Street', // Removed "123"
                city: 'Mumbai', // Mismatch
                state: 'Maharashtra',
                pincode: '110001'
            };

            const result = await AddressValidationService.validate(address);

            expect(result.issues).toEqual(expect.arrayContaining([
                expect.stringContaining('City mismatch'),
                expect.stringContaining('State mismatch')
            ]));
            expect(result.score).toBeLessThan(1.0);
        });

        it('should detect junk addresses', async () => {
            const address = {
                line1: 'test address',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400053'
            };
            // Default mocks
            (PincodeLookupService.isValidPincodeFormat as any).mockReturnValue(true);
            (PincodeLookupService.getPincodeDetails as any).mockReturnValue({ city: 'MUMBAI', state: 'MAHARASHTRA' });


            const result = await AddressValidationService.validate(address);
            expect(result.issues).toContain('Address Line 1 contains junk keywords');
            expect(result.score).toBeLessThan(1.0);
        });
    });

    describe('PhoneVerificationService', () => {
        it('should validate correct Indian mobile numbers', () => {
            expect(PhoneVerificationService.isValidFormat('9876543210')).toBe(true);
            expect(PhoneVerificationService.isValidFormat('+919876543210')).toBe(true);
            expect(PhoneVerificationService.isValidFormat('919876543210')).toBe(false); // 12 digits without +
            expect(PhoneVerificationService.isValidFormat('1234567890')).toBe(false); // Does not start with 6-9
        });

        it('should send OTP successfully', async () => {
            (CacheService.set as any).mockResolvedValue(true);
            const result = await PhoneVerificationService.sendOTP('9876543210', 'comp_1');
            expect(result.success).toBe(true);
            expect(CacheService.set).toHaveBeenCalled();
        });

        it('should verify OTP correctly', async () => {
            (CacheService.get as any).mockResolvedValue('123456');
            (CacheService.delete as any).mockResolvedValue(true);

            const result = await PhoneVerificationService.verifyOTP('9876543210', '123456', 'comp_1');
            expect(result).toBe(true);
            expect(CacheService.delete).toHaveBeenCalled();
        });

        it('should reject invalid OTP', async () => {
            (CacheService.get as any).mockResolvedValue('123456');
            const result = await PhoneVerificationService.verifyOTP('9876543210', '654321', 'comp_1');
            expect(result).toBe(false);
        });
    });

    describe('RiskScoringService', () => {
        const mockOrderContext = {
            orderValue: 1000,
            paymentMethod: 'COD' as 'COD',
            customer: {
                name: 'Risk Tester',
                phone: '9876543210',
                email: 'test@example.com'
            },
            shippingAddress: {
                line1: 'Valid Address Line 1',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400053'
            },
            companyId: 'comp_1'
        };

        it('should calculate low risk for clean order', async () => {
            // Mock Address Validation to return perfect score
            jest.spyOn(AddressValidationService, 'validate').mockResolvedValue({
                isValid: true,
                score: 1.0,
                issues: [],
                type: 'valid'
            });

            // Mock COD Check
            (CODVerificationService.verify as any).mockResolvedValue({
                isAllowed: true,
                riskScore: 0,
                reasons: []
            });

            const assessment = await RiskScoringService.assessOrder(mockOrderContext);

            expect(assessment.level).toBe('low');
            expect(assessment.riskScore).toBeLessThan(0.3);
            expect(assessment.recommendation).toBe('approve');
        });

        it('should flag high risk for bad address', async () => {
            jest.spyOn(AddressValidationService, 'validate').mockResolvedValue({
                isValid: false,
                score: 0.2, // Low score
                issues: ['Address line too short'],
                type: 'invalid'
            });
            (CODVerificationService.verify as any).mockResolvedValue({
                isAllowed: true, riskScore: 0, reasons: []
            });


            const assessment = await RiskScoringService.assessOrder(mockOrderContext);

            expect(assessment.riskScore).toBeGreaterThanOrEqual(0.4);
            // 0.4 added for invalid address.
        });

        it('should include COD risk in total score', async () => {
            jest.spyOn(AddressValidationService, 'validate').mockResolvedValue({
                isValid: true, score: 1, issues: [], type: 'valid'
            });
            (CODVerificationService.verify as any).mockResolvedValue({
                isAllowed: false, // COD Risk
                riskScore: 0.5,
                reasons: ['High RTO pincode']
            });

            const assessment = await RiskScoringService.assessOrder(mockOrderContext);

            expect(assessment.riskScore).toBeGreaterThanOrEqual(0.5);
            expect(assessment.flags).toContain('High RTO pincode');
        });
    });
});
