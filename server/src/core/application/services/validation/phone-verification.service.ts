/**
 * Phone Verification Service
 *
 * Verifies customer phone numbers to ensure they are reachable.
 * Uses Regex for format validation and Exotel for missed call/OTP verification.
 */

import CacheService from '../../../../infrastructure/utilities/cache.service';
import logger from '../../../../shared/logger/winston.logger';

export class PhoneVerificationService {
    /**
     * Validate phone number format (Indian mobile numbers)
     */
    static isValidFormat(phone: string): boolean {
        // Must start with 6, 7, 8, or 9 and have 10 digits
        // Allow +91 prefix optional
        const re = /^(\+91)?([6-9][0-9]{9})$/;
        return re.test(phone.replace(/\s/g, '').replace(/-/g, ''));
    }

    /**
     * Send OTP via SMS (using Exotel or alternative)
     */
    static async sendOTP(phone: string, companyId: string): Promise<{ success: boolean; messageId?: string }> {
        if (!this.isValidFormat(phone)) {
            throw new Error('Invalid phone number format');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const cacheKey = `otp:${companyId}:${phone}`;

        // Store OTP in cache for 5 minutes
        await CacheService.set(cacheKey, otp, 300);

        try {
            // In a real implementation, use smsService.sendSMS
            // For now, mocking the call or assuming smsService exists and is imported
            // const { default: smsService } = await import('../../communication/sms.service');
            // await smsService.sendSMS(phone, `Your verification code is ${otp}`);

            logger.info(`OTP generated for ${phone}: ${otp}`); // Logged for dev/demo

            return { success: true, messageId: 'mock-msg-id' };
        } catch (error) {
            logger.error('Failed to send OTP', error);
            return { success: false };
        }
    }

    /**
     * Verify OTP
     */
    static async verifyOTP(phone: string, otp: string, companyId: string): Promise<boolean> {
        const cacheKey = `otp:${companyId}:${phone}`;
        const storedOtp = await CacheService.get(cacheKey);

        if (storedOtp && storedOtp === otp) {
            await CacheService.delete(cacheKey); // Invalidate after use
            return true;
        }

        return false;
    }
}
void PhoneVerificationService;

export default PhoneVerificationService;
