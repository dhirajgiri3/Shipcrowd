import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app.error';

/**
 * Legacy TokenService compatibility shim.
 * Runtime flows now use NDRMagicLinkService, but tests still import this module.
 */

interface AddressUpdateTokenPayload {
    shipmentId: string;
    ndrEventId?: string;
    companyId: string;
    purpose: 'address_update';
}

interface TokenVerificationResult {
    shipmentId: string;
    ndrEventId?: string;
    companyId: string;
}

export class TokenService {
    private static readonly SECRET_KEY = (() => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('FATAL: JWT_SECRET environment variable is required');
        }
        return secret || '';
    })();
    private static readonly ADDRESS_UPDATE_EXPIRY = '48h';

    // In-memory invalidation store kept for backwards compatibility.
    private static invalidatedTokens: Set<string> = new Set();

    static generateAddressUpdateToken(shipmentId: string, companyId: string, ndrEventId?: string): string {
        const payload: AddressUpdateTokenPayload = {
            shipmentId,
            ndrEventId,
            companyId,
            purpose: 'address_update',
        };

        return jwt.sign(payload, this.SECRET_KEY, {
            expiresIn: this.ADDRESS_UPDATE_EXPIRY,
            issuer: 'Shipcrowd',
            subject: 'address-update',
        });
    }

    static verifyAddressUpdateToken(token: string): TokenVerificationResult {
        try {
            if (this.invalidatedTokens.has(token)) {
                throw new AppError('Token has been used and is no longer valid', 'TOKEN_INVALIDATED', 401);
            }

            const decoded = jwt.verify(token, this.SECRET_KEY, {
                issuer: 'Shipcrowd',
                subject: 'address-update',
            }) as AddressUpdateTokenPayload;

            if (!decoded.shipmentId || !decoded.companyId || decoded.purpose !== 'address_update') {
                throw new AppError('Invalid token payload', 'INVALID_TOKEN', 401);
            }

            return {
                shipmentId: decoded.shipmentId,
                ndrEventId: decoded.ndrEventId,
                companyId: decoded.companyId,
            };
        } catch (error: any) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AppError('Token has expired', 'TOKEN_EXPIRED', 401);
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new AppError('Invalid token', 'INVALID_TOKEN', 401);
            }
            throw error;
        }
    }

    static invalidateToken(token: string): void {
        this.invalidatedTokens.add(token);
        setTimeout(() => this.invalidatedTokens.delete(token), 48 * 60 * 60 * 1000);
    }

    static isTokenInvalidated(token: string): boolean {
        return this.invalidatedTokens.has(token);
    }

    static clearInvalidatedTokens(): void {
        this.invalidatedTokens.clear();
    }
}

export default TokenService;
