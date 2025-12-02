import express from 'express';
import notificationController from '../controllers/notification.controller';

const router = express.Router();

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
 * @route POST /api/notifications/verify-phone/send
 * @desc Send a verification code via SMS
 * @access Public
 */
router.post('/verify-phone/send', notificationController.sendVerificationCode);

/**
 * @route POST /api/notifications/verify-phone/check
 * @desc Verify a phone number with a code
 * @access Public
 */
router.post('/verify-phone/check', notificationController.verifyPhoneNumber);

/**
 * @route POST /api/notifications/shipment-status
 * @desc Send a shipment status notification (email, SMS, WhatsApp, or all)
 * @access Private
 */
router.post('/shipment-status', notificationController.sendShipmentStatus);

export default router;
