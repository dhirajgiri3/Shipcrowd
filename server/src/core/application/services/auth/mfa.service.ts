import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import MFASettings from '../../../../infrastructure/database/mongoose/models/iam/users/mfa-settings.model';
import { NotFoundError, ValidationError, AuthenticationError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';
import logger from '../../../../shared/logger/winston.logger';

/**
 * MFA Service
 * Handles Multi-Factor Authentication using TOTP (Time-based One-Time Password)
 * 
 * Features:
 * - TOTP secret generation with QR code for Google Authenticator
 * - Token verification with 30-second window
 * - Backup code generation (10 codes, SHA-256 hashed)
 * - One-time backup code consumption
 */

class MFAService {
    /**
     * Generate TOTP secret and QR code for Google Authenticator
     * @param userId - User ID
     * @param userEmail - User email for QR code label
     * @returns Secret, QR code data URL, and manual entry key
     */
    async generateTOTPSecret(userId: string, userEmail: string) {
        try {
            // Check if MFA already exists
            const existing = await MFASettings.findOne({ userId });
            if (existing && existing.totpEnabled) {
                throw new ValidationError('MFA is already enabled for this user');
            }

            // Generate secret
            const secret = speakeasy.generateSecret({
                name: `Helix (${userEmail})`,
                issuer: 'Helix',
                length: 32,
            });

            // Generate QR code
            logger.info(`Generated otpauth URL: ${secret.otpauth_url}`); // DEBUG: Check issuer
            const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url!);

            // Save or update MFA settings (not enabled yet)
            if (existing) {
                existing.totpSecret = secret.base32;
                existing.totpEnabled = false;
                await existing.save();
            } else {
                await MFASettings.create({
                    userId,
                    totpSecret: secret.base32,
                    totpEnabled: false,
                });
            }

            logger.info(`MFA setup initiated for user ${userId}`);

            return {
                secret: secret.base32,
                qrCode: qrCodeDataURL,
                manualEntryKey: secret.base32,
            };
        } catch (error: any) {
            logger.error(`Error generating TOTP secret for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Verify TOTP token (30-second window)
     * @param userId - User ID
     * @param token - 6-digit TOTP code
     * @returns True if valid, false otherwise
     */
    async verifyTOTP(userId: string, token: string): Promise<boolean> {
        try {
            const settings = await MFASettings.findOne({ userId });
            if (!settings) {
                throw new NotFoundError('MFA settings not found for this user');
            }

            const isValid = speakeasy.totp.verify({
                secret: settings.totpSecret, // Will be decrypted by getter
                encoding: 'base32',
                token,
                window: 1, // Allow 30s before/after current time
            });

            if (isValid) {
                // Update last used timestamp
                settings.lastUsed = new Date();
                settings.lastUsedMethod = 'totp';
                await settings.save();

                logger.info(`TOTP verified successfully for user ${userId}`);
            } else {
                logger.warn(`Invalid TOTP attempt for user ${userId}`);
            }

            return isValid;
        } catch (error: any) {
            logger.error(`Error verifying TOTP for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Generate 10 unique backup codes (SHA-256 hashed)
     * @param userId - User ID
     * @returns Array of plaintext backup codes (user must save these)
     */
    async generateBackupCodes(userId: string): Promise<string[]> {
        try {
            const settings = await MFASettings.findOne({ userId });
            if (!settings) {
                throw new NotFoundError('MFA settings not found for this user');
            }

            const codes: string[] = [];
            const hashedCodes: { code: string }[] = [];

            // Generate 10 unique codes
            for (let i = 0; i < 10; i++) {
                const code = crypto.randomBytes(4).toString('hex').toUpperCase();
                codes.push(code);

                // Hash the code (SHA-256)
                const hashed = crypto
                    .createHash('sha256')
                    .update(code)
                    .digest('hex');
                hashedCodes.push({ code: hashed });
            }

            // Replace existing backup codes
            settings.backupCodes = hashedCodes;
            await settings.save();

            logger.info(`Generated ${codes.length} backup codes for user ${userId}`);

            return codes; // Return plaintext for user to save
        } catch (error: any) {
            logger.error(`Error generating backup codes for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Use backup code (one-time consumption)
     * @param userId - User ID
     * @param code - Backup code
     * @param metadata - Request metadata (IP, user agent)
     * @returns True if valid and consumed, false otherwise
     */
    async useBackupCode(
        userId: string,
        code: string,
        metadata?: { ip: string; userAgent: string }
    ): Promise<boolean> {
        try {
            const settings = await MFASettings.findOne({ userId });
            if (!settings) {
                throw new NotFoundError('MFA settings not found for this user');
            }

            // Hash the input code
            const hashedInput = crypto
                .createHash('sha256')
                .update(code.toUpperCase())
                .digest('hex');

            // Find unused matching code
            const codeIndex = settings.backupCodes.findIndex(
                (bc) => bc.code === hashedInput && !bc.usedAt
            );

            if (codeIndex === -1) {
                logger.warn(`Invalid or already used backup code attempt for user ${userId}`);
                return false;
            }

            // Mark as used
            settings.backupCodes[codeIndex].usedAt = new Date();
            if (metadata) {
                settings.backupCodes[codeIndex].usedBy = metadata;
            }
            settings.lastUsed = new Date();
            settings.lastUsedMethod = 'backup_code';
            await settings.save();

            logger.info(`Backup code consumed for user ${userId}`);

            return true;
        } catch (error: any) {
            logger.error(`Error using backup code for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Enable MFA after successful TOTP verification
     * @param userId - User ID
     * @param metadata - Enrollment metadata (IP, user agent)
     */
    async enableMFA(userId: string, metadata?: { ip: string; userAgent: string }) {
        try {
            const settings = await MFASettings.findOne({ userId });
            if (!settings) {
                throw new NotFoundError('MFA settings not found. Please setup TOTP first.');
            }

            settings.totpEnabled = true;
            settings.isActive = true;
            settings.enrolledAt = new Date();
            if (metadata) {
                settings.enrolledBy = metadata;
            }
            await settings.save();

            logger.info(`MFA enabled for user ${userId}`);
        } catch (error: any) {
            logger.error(`Error enabling MFA for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Disable MFA (requires password verification in controller)
     * @param userId - User ID
     * @param reason - Reason for disabling
     */
    async disableMFA(userId: string, reason?: string) {
        try {
            const settings = await MFASettings.findOne({ userId });
            if (!settings) {
                throw new NotFoundError('MFA settings not found for this user');
            }

            settings.totpEnabled = false;
            settings.isActive = false;
            settings.disabledAt = new Date();
            settings.disabledReason = reason || 'User requested';
            await settings.save();

            logger.info(`MFA disabled for user ${userId}`);
        } catch (error: any) {
            logger.error(`Error disabling MFA for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get MFA enrollment status
     * @param userId - User ID
     * @returns MFA status information
     */
    async getMFAStatus(userId: string) {
        try {
            const settings = await MFASettings.findOne({ userId });

            if (!settings) {
                return {
                    enabled: false,
                    enrolledAt: null,
                    backupCodesRemaining: 0,
                    lastUsed: null,
                };
            }

            const backupCodesRemaining = settings.backupCodes.filter(
                (bc) => !bc.usedAt
            ).length;

            return {
                enabled: settings.totpEnabled,
                enrolledAt: settings.enrolledAt,
                backupCodesRemaining,
                lastUsed: settings.lastUsed,
                lastUsedMethod: settings.lastUsedMethod,
            };
        } catch (error: any) {
            logger.error(`Error getting MFA status for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Check if user has MFA enabled
     * @param userId - User ID
     * @returns True if MFA is enabled
     */
    async isMFAEnabled(userId: string): Promise<boolean> {
        try {
            const settings = await MFASettings.findOne({ userId });
            return settings?.totpEnabled || false;
        } catch (error: any) {
            logger.error(`Error checking MFA status for user ${userId}:`, error);
            return false;
        }
    }
}

export default new MFAService();
