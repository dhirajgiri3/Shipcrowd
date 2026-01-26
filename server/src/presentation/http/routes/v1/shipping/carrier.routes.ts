import express from 'express';
import { CarrierController } from '../../../controllers/shipping/carrier.controller';

const router = express.Router();
const carrierController = new CarrierController();

// List all carriers (PUBLIC - needed for rate card creation form)
router.get(
    '/',
    carrierController.getCarriers
);

// Get single carrier (PUBLIC - needed for rate card details)
router.get(
    '/:id',
    carrierController.getCarrier
);

export default router;
