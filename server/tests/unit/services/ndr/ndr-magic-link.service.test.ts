import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import NDRMagicLinkService from '../../../../src/core/application/services/ndr/ndr-magic-link.service';
import { NDREvent } from '../../../../src/infrastructure/database/mongoose/models';

// Mock dependencies
jest.mock('../../../../src/infrastructure/database/mongoose/models', () => ({
    NDREvent: {
        findById: jest.fn(),
    }
}));

jest.mock('../../../../src/shared/logger/winston.logger', () => ({
    error: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    verify: jest.fn(),
}));

describe('NDRMagicLinkService', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, JWT_SECRET: 'test-secret', FRONTEND_URL: 'http://localhost:3000' };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('generateMagicLink', () => {
        it('should generate a valid magic link', () => {
            (jwt.sign as any).mockReturnValue('mock-token');

            const link = NDRMagicLinkService.generateMagicLink('ndr_123');

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({ ndrEventId: 'ndr_123', type: 'ndr_resolution' }),
                'test-secret',
                { expiresIn: '7d' }
            );
            expect(link).toBe('http://localhost:3000/resolve-ndr/mock-token');
        });

        it('should throw error if JWT_SECRET is missing', () => {
            delete process.env.JWT_SECRET;
            expect(() => NDRMagicLinkService.generateMagicLink('ndr_123')).toThrow('JWT_SECRET not configured');
        });
    });

    describe('validateToken', () => {
        it('should return valid result for correct token', async () => {
            (jwt.verify as any).mockReturnValue({
                ndrEventId: 'ndr_123',
                type: 'ndr_resolution'
            });
            (NDREvent.findById as any).mockResolvedValue({
                _id: 'ndr_123',
                status: 'detected'
            });

            const result = await NDRMagicLinkService.validateToken('valid-token');

            expect(result.valid).toBe(true);
            expect(result.ndrEventId).toBe('ndr_123');
        });

        it('should return invalid if token type is wrong', async () => {
            (jwt.verify as any).mockReturnValue({
                ndrEventId: 'ndr_123',
                type: 'other_type'
            });

            const result = await NDRMagicLinkService.validateToken('wrong-type-token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid token type');
        });

        it('should return invalid if NDR event not found', async () => {
            (jwt.verify as any).mockReturnValue({
                ndrEventId: 'ndr_123',
                type: 'ndr_resolution'
            });
            (NDREvent.findById as any).mockResolvedValue(null);

            const result = await NDRMagicLinkService.validateToken('token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('NDR record not found');
        });

        it('should return invalid if NDR is already resolved', async () => {
            (jwt.verify as any).mockReturnValue({
                ndrEventId: 'ndr_123',
                type: 'ndr_resolution'
            });
            (NDREvent.findById as any).mockResolvedValue({
                status: 'resolved'
            });

            const result = await NDRMagicLinkService.validateToken('token');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('NDR already resolved');
        });

        it('should return invalid if token expired', async () => {
            (jwt.verify as any).mockImplementation(() => {
                const error: any = new Error('Expired');
                error.name = 'TokenExpiredError';
                throw error;
            });

            const result = await NDRMagicLinkService.validateToken('expired-token');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('Link expired');
        });
    });
});
