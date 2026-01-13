import { Request, Response, NextFunction } from 'express';
import MFAService from '../../../../core/application/services/auth/mfa.service';
import User from '../../../../infrastructure/database/mongoose/models/iam/users/user.model';
import { ValidationError, AuthenticationError, NotFoundError } from '../../../../shared/errors/app.error';
import logger from '../../../../shared/logger/winston.logger';

/**
 * MFA Controller
 * Handles Multi-Factor Authentication endpoints
 * 
 * Endpoints:
 * 1. POST /auth/mfa/setup-totp - Generate QR code
 * 2. POST /auth/mfa/verify-totp - Verify code & enable MFA
 * 3. POST /auth/mfa/disable-totp - Disable MFA (requires password)
 * 4. GET /auth/mfa/backup-codes - Generate 10 backup codes
 * 5. POST /auth/mfa/use-backup-code - Consume backup code
 * 6. GET /auth/mfa/status - Get MFA enrollment status
 * 7. POST /auth/mfa/enforce - Admin: Enforce MFA per company
 * 8. POST /auth/login/mfa-verify - Verify MFA during login
 */

class MFAController {
    /**
     * Setup TOTP - Generate QR code for Google Authenticator
     * POST /auth/mfa/setup-totp
     */
    async setupTOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                throw new AuthenticationError('User not authenticated');
            }

            const user = await User.findById(userId);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            const { secret, qrCode, manualEntryKey } = await MFAService.generateTOTPSecret(
                userId,
                user.email
            );

            res.status(200).json({
                success: true,
                message: 'TOTP setup initiated. Scan QR code with Google Authenticator.',
                data: {
                    qrCode,
                    manualEntryKey,
                    instructions: [
                        '1. Open Google Authenticator app',
                        '2. Scan the QR code or enter the manual key',
                        '3. Verify the 6-digit code using /auth/mfa/verify-totp',
                    ],
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify TOTP and enable MFA
     * POST /auth/mfa/verify-totp
     */
    async verifyTOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                throw new AuthenticationError('User not authenticated');
            }

            const { code } = req.body;
            if (!code || !/^\d{6}$/.test(code)) {
                throw new ValidationError('Invalid code format. Must be 6 digits.');
            }

            const isValid = await MFAService.verifyTOTP(userId, code);
            if (!isValid) {
                throw new AuthenticationError('Invalid TOTP code');
            }

            // Enable MFA
            await MFAService.enableMFA(userId, {
                ip: req.ip || req.socket.remoteAddress || 'unknown',
                userAgent: req.get('user-agent') || 'unknown',
            });

            // Generate backup codes
            const backupCodes = await MFAService.generateBackupCodes(userId);

            res.status(200).json({
                success: true,
                message: 'MFA enabled successfully',
                data: {
                    backupCodes,
                    warning: 'Save these backup codes in a secure location. They can only be used once.',
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Disable MFA (requires password verification)
     * POST /auth/mfa/disable-totp
     */
    async disableTOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                throw new AuthenticationError('User not authenticated');
            }

            const { password } = req.body;
            if (!password) {
                throw new ValidationError('Password is required to disable MFA');
            }

            // Verify password
            const user = await User.findById(userId);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                throw new AuthenticationError('Invalid password');
            }

            await MFAService.disableMFA(userId, 'User requested via password verification');

            res.status(200).json({
                success: true,
                message: 'MFA disabled successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Generate backup codes
     * GET /auth/mfa/backup-codes
     */
    async getBackupCodes(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                throw new AuthenticationError('User not authenticated');
            }

            const backupCodes = await MFAService.generateBackupCodes(userId);

            res.status(200).json({
                success: true,
                message: 'Backup codes generated',
                data: {
                    backupCodes,
                    warning: 'Save these codes securely. Previous backup codes are now invalid.',
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Use backup code (for login)
     * POST /auth/mfa/use-backup-code
     */
    async useBackupCode(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                throw new AuthenticationError('User not authenticated');
            }

            const { code } = req.body;
            if (!code) {
                throw new ValidationError('Backup code is required');
            }

            const isValid = await MFAService.useBackupCode(userId, code, {
                ip: req.ip || req.socket.remoteAddress || 'unknown',
                userAgent: req.get('user-agent') || 'unknown',
            });

            if (!isValid) {
                throw new AuthenticationError('Invalid or already used backup code');
            }

            res.status(200).json({
                success: true,
                message: 'Backup code verified successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get MFA status
     * GET /auth/mfa/status
     */
    async getStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                throw new AuthenticationError('User not authenticated');
            }

            const status = await MFAService.getMFAStatus(userId);

            res.status(200).json({
                success: true,
                data: status,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Admin: Enforce MFA for company
     * POST /auth/mfa/enforce
     * TODO: Implement company-level MFA enforcement
     */
    async enforceMFA(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id?.toString();
            if (!userId) {
                throw new AuthenticationError('User not authenticated');
            }

            // TODO: Check admin role
            // TODO: Update company settings to enforce MFA
            // TODO: Notify all company users

            res.status(501).json({
                success: false,
                message: 'Company-level MFA enforcement not yet implemented',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify MFA during login (called after password verification)
     * POST /auth/login/mfa-verify
     * This is handled in auth.controller.ts
     */
}

export default new MFAController();
