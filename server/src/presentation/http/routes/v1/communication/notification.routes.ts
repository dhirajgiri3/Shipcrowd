import express from 'express';
import notificationController from '../../../controllers/communication/notification.controller';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';

const router = express.Router();

// Apply CSRF protection to all POST routes
router.use(csrfProtection);

/**
 * @route POST /api/notifications/verify-phone/send
 * @desc Send a verification code via SMS
 * @access Public (Rate limited by controller)
 */
router.post('/verify-phone/send', notificationController.sendVerificationCode);

/**
 * @route POST /api/notifications/verify-phone/check
 * @desc Verify a phone number with a code
 * @access Public (Rate limited by controller)
 */
router.post('/verify-phone/check', notificationController.verifyPhoneNumber);

// Protect all other routes
router.use(authenticate);

/**
 * @route POST /api/notifications/email
 * @desc Send an email
 * @access Private
 */
router.post('/email', notificationController.sendEmail);

/**
 * @route POST /api/notifications/sms
 * @desc Send an SMS
 * @access Private
 */
router.post('/sms', notificationController.sendSMS);

/**
 * @route POST /api/notifications/shipment-status
 * @desc Send a shipment status notification (email, SMS, WhatsApp, or all)
 * @access Private
 */
router.post('/shipment-status', notificationController.sendShipmentStatus);

// ============================================================================
// IN-APP NOTIFICATION ROUTES - REMOVED
// ============================================================================
// In-app notification polling (bell icon) routes have been removed to improve performance.
// These endpoints were:
// - GET /api/v1/notifications (polled every 30s)
// - POST /api/v1/notifications/:id/read
// - POST /api/v1/notifications/mark-all-read
// - GET /api/v1/notifications/unread-count (polled every 30s)
//
// Critical notifications are sent via Email/SMS/WhatsApp using the endpoints above.

export default router;
