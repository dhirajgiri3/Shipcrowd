import express from 'express';
import whatsappController from '../../../controllers/communication/whatsapp.controller';

const router = express.Router();

/**
 * @route POST /api/whatsapp/message
 * @desc Send a WhatsApp message
 * @access Private
 */
router.post('/message', whatsappController.sendWhatsAppMessage);

/**
 * @route POST /api/whatsapp/shipment-status
 * @desc Send a shipment status notification via WhatsApp
 * @access Private
 */
router.post('/shipment-status', whatsappController.sendShipmentStatus);

/**
 * @route POST /api/whatsapp/welcome
 * @desc Send a welcome message via WhatsApp
 * @access Private
 */
router.post('/welcome', whatsappController.sendWelcome);

/**
 * @route POST /api/whatsapp/delivery-confirmation
 * @desc Send a delivery confirmation via WhatsApp
 * @access Private
 */
router.post('/delivery-confirmation', whatsappController.sendDeliveryConfirmation);

export default router;
