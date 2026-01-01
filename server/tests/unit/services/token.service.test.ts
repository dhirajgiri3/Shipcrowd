import TokenService from '../../../src/shared/services/token.service';
import { AppError } from '../../../src/shared/errors/AppError';

describe('TokenService', () => {
    beforeEach(() => {
        // Clear invalidated tokens before each test
        TokenService.clearInvalidatedTokens();
    });

    describe('generateAddressUpdateToken', () => {
        it('should generate a valid JWT token with shipmentId', () => {
            const shipmentId = '507f1f77bcf86cd799439011';
            const companyId = '507f1f77bcf86cd799439013';
            const token = TokenService.generateAddressUpdateToken(shipmentId, companyId);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
        });

        it('should generate a valid JWT token with shipmentId and ndrEventId', () => {
            const shipmentId = '507f1f77bcf86cd799439011';
            const companyId = '507f1f77bcf86cd799439013';
            const ndrEventId = '507f1f77bcf86cd799439012';
            const token = TokenService.generateAddressUpdateToken(shipmentId, companyId, ndrEventId);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
        });
    });

    describe('verifyAddressUpdateToken', () => {
        it('should verify and decode a valid token', () => {
            const shipmentId = '507f1f77bcf86cd799439011';
            const companyId = '507f1f77bcf86cd799439013';
            const ndrEventId = '507f1f77bcf86cd799439012';
            const token = TokenService.generateAddressUpdateToken(shipmentId, companyId, ndrEventId);

            const result = TokenService.verifyAddressUpdateToken(token);

            expect(result).toBeDefined();
            expect(result.shipmentId).toBe(shipmentId);
            expect(result.companyId).toBe(companyId);
            expect(result.ndrEventId).toBe(ndrEventId);
        });

        it('should throw error for invalid token', () => {
            const invalidToken = 'invalid.token.here';

            expect(() => {
                TokenService.verifyAddressUpdateToken(invalidToken);
            }).toThrow(AppError);

            expect(() => {
                TokenService.verifyAddressUpdateToken(invalidToken);
            }).toThrow('Invalid token');
        });

        it('should throw error for invalidated token', () => {
            const shipmentId = '507f1f77bcf86cd799439011';
            const companyId = '507f1f77bcf86cd799439013';
            const token = TokenService.generateAddressUpdateToken(shipmentId, companyId);

            // Invalidate the token
            TokenService.invalidateToken(token);

            expect(() => {
                TokenService.verifyAddressUpdateToken(token);
            }).toThrow(AppError);

            expect(() => {
                TokenService.verifyAddressUpdateToken(token);
            }).toThrow('Token has been used and is no longer valid');
        });
    });

    describe('invalidateToken', () => {
        it('should invalidate a token successfully', () => {
            const shipmentId = '507f1f77bcf86cd799439011';
            const companyId = '507f1f77bcf86cd799439013';
            const token = TokenService.generateAddressUpdateToken(shipmentId, companyId);

            // Verify token works before invalidation
            expect(() => {
                TokenService.verifyAddressUpdateToken(token);
            }).not.toThrow();

            // Invalidate token
            TokenService.invalidateToken(token);

            // Verify token no longer works
            expect(() => {
                TokenService.verifyAddressUpdateToken(token);
            }).toThrow('Token has been used and is no longer valid');
        });

        it('should check if token is invalidated', () => {
            const shipmentId = '507f1f77bcf86cd799439011';
            const companyId = '507f1f77bcf86cd799439013';
            const token = TokenService.generateAddressUpdateToken(shipmentId, companyId);

            expect(TokenService.isTokenInvalidated(token)).toBe(false);

            TokenService.invalidateToken(token);

            expect(TokenService.isTokenInvalidated(token)).toBe(true);
        });
    });

    describe('clearInvalidatedTokens', () => {
        it('should clear all invalidated tokens', () => {
            const token1 = TokenService.generateAddressUpdateToken('id1', 'comp1');
            const token2 = TokenService.generateAddressUpdateToken('id2', 'comp2');

            TokenService.invalidateToken(token1);
            TokenService.invalidateToken(token2);

            expect(TokenService.isTokenInvalidated(token1)).toBe(true);
            expect(TokenService.isTokenInvalidated(token2)).toBe(true);

            TokenService.clearInvalidatedTokens();

            expect(TokenService.isTokenInvalidated(token1)).toBe(false);
            expect(TokenService.isTokenInvalidated(token2)).toBe(false);
        });
    });
});
