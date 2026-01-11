import crypto from 'crypto';

/**
 * AuthTokenService
 * 
 * Secure token generation and hashing for authentication purposes
 * (email verification, password reset, team invitations, account recovery)
 * 
 * SECURITY PATTERN:
 * - Generate raw token (64 hex chars = 32 bytes)
 * - Hash with SHA256 before database storage
 * - Send raw token to user (email/link)
 * - Compare hashed incoming token with database hash
 * 
 * WHY SHA256 (not bcrypt)?
 * - Single-use tokens with short expiry (minutes/hours)
 * - No progressive slowdown needed (unlike passwords)
 * - Constant-time hashing is sufficient
 * - OWASP recommended for API tokens and reset tokens
 * 
 * NOTE: This is different from:
 * - `shared/helpers/jwt.ts` - For JWT access/refresh tokens
 * - `shared/services/token.service.ts` - For address update magic links
 */
export class AuthTokenService {
    /**
     * Generate a secure token and return both raw and hashed versions
     * 
     * Use for:
     * - Password reset tokens
     * - Email verification tokens
     * - Team invitation tokens
     * - Account recovery tokens
     * - Email change verification tokens
     * 
     * @returns Object with raw token (send to user) and hashed token (store in DB)
     * 
     * @example
     * const { raw, hashed } = AuthTokenService.generateSecureToken();
     * user.security.resetToken = hashed; // Store hash in DB
     * await sendPasswordResetEmail(user.email, user.name, raw); // Send raw to user
     */
    static generateSecureToken(): { raw: string; hashed: string } {
        // Generate 32 bytes = 64 hex characters
        const rawToken = crypto.randomBytes(32).toString('hex');

        // Hash with SHA256 for database storage
        const hashedToken = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');

        return {
            raw: rawToken,    // 64 chars - send to user
            hashed: hashedToken // 64 chars - store in DB
        };
    }

    /**
     * Hash an incoming token for database comparison
     * 
     * Use when verifying a token received from user
     * 
     * @param rawToken The token received from user (from email link, form, etc.)
     * @returns Hashed token to compare with database value
     * 
     * @example
     * const hashedToken = AuthTokenService.hashToken(req.body.token);
     * const user = await User.findOne({ 'security.resetToken': hashedToken });
     */
    static hashToken(rawToken: string): string {
        return crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');
    }

    /**
     * Verify a token matches the stored hash
     * 
     * @param rawToken The token received from user
     * @param hashedToken The hash stored in database
     * @returns true if tokens match, false otherwise
     * 
     * @example
     * const isValid = AuthTokenService.verifyToken(
     *   req.body.token,
     *   user.security.resetToken
     * );
     */
    static verifyToken(rawToken: string, hashedToken: string): boolean {
        const computedHash = this.hashToken(rawToken);
        return computedHash === hashedToken;
    }
}

export default AuthTokenService;
