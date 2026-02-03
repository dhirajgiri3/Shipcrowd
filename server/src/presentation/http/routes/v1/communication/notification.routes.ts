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
// IN-APP NOTIFICATION ROUTES
// ============================================================================

/**
 * @route GET /api/v1/notifications
 * @desc Get user notifications
 * @access Private
 */
router.get('/', notificationController.getNotifications);

/**
 * @route POST /api/v1/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.post('/:id/read', notificationController.markAsRead);

/**
 * @route POST /api/v1/notifications/mark-all-read
 * @desc Mark all notifications as read
 * @access Private
 */
router.post('/mark-all-read', notificationController.markAllAsRead);

/**
 * @route GET /api/v1/notifications/unread-count
 * @desc Get unread notification count
 * @access Private
 */
router.get('/unread-count', notificationController.getUnreadCount);

export default router;
