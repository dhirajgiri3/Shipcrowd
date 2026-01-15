import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app.error';

/**
 * TokenService
 * 
 * Handles generation and verification of JWT tokens for various purposes
 * including magic links for address updates, password resets, etc.
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
    // SECURITY: Removed weak fallback - JWT_SECRET is required
    private static readonly SECRET_KEY = (() => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('FATAL: JWT_SECRET environment variable is required');
            // Don't throw in module scope to avoid breaking imports
            // Actual operations will fail when SECRET_KEY is empty
        }
        return secret || '';
    })();
    private static readonly ADDRESS_UPDATE_EXPIRY = '48h'; // 48 hours

    // In-memory token invalidation store (use Redis in production)
    private static invalidatedTokens: Set<string> = new Set();

    /**
     * Generate magic link token for address update
     */
    static generateAddressUpdateToken(shipmentId: string, companyId: string, ndrEventId?: string): string {
        const payload: AddressUpdateTokenPayload = {
            shipmentId,
            ndrEventId,
            companyId,
            purpose: 'address_update',
        };

        const token = jwt.sign(payload, this.SECRET_KEY, {
            expiresIn: this.ADDRESS_UPDATE_EXPIRY,
            issuer: 'shipcrowd',
            subject: 'address-update',
        });

        return token;
    }

    /**
     * Verify address update token and extract payload
     */
    static verifyAddressUpdateToken(token: string): TokenVerificationResult {
        try {
            // Check if token has been invalidated
            if (this.invalidatedTokens.has(token)) {
                throw new AppError('Token has been used and is no longer valid', 'TOKEN_INVALIDATED', 401);
            }

            const decoded = jwt.verify(token, this.SECRET_KEY, {
                issuer: 'shipcrowd',
                subject: 'address-update',
            }) as AddressUpdateTokenPayload;

            // Validate payload structure
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

    /**
     * Invalidate token after use (prevents reuse)
     */
    static invalidateToken(token: string): void {
        this.invalidatedTokens.add(token);

        // Auto-cleanup after 48 hours (should match token expiry)
        setTimeout(() => {
            this.invalidatedTokens.delete(token);
        }, 48 * 60 * 60 * 1000);
    }

    /**
     * Check if token is invalidated
     */
    static isTokenInvalidated(token: string): boolean {
        return this.invalidatedTokens.has(token);
    }

    /**
     * Clear all invalidated tokens (for testing)
     */
    static clearInvalidatedTokens(): void {
        this.invalidatedTokens.clear();
    }
}

export default TokenService;
