/**
 * Packing Station Routes
 * 
 * Evidence capture at packing stations before courier pickup
 */

import express from 'express';
import multer from 'multer';
import { authenticate } from '../../../middleware/auth/auth';
import packingStationController from '../../../controllers/disputes/packing-station.controller';
import asyncHandler from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

// Configure multer for photo uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 10, // Max 10 files
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

/**
 * @route POST /api/v1/packing-station/evidence
 * @desc Submit packing evidence with photos
 * @access Private (Warehouse staff)
 * @body multipart/form-data with shipmentId, actualWeight, weightUnit, photos[], etc.
 */
router.post(
    '/evidence',
    authenticate,
    upload.array('photos', 10),
    asyncHandler(packingStationController.submitEvidence)
);

/**
 * @route POST /api/v1/packing-station/upload-urls
 * @desc Generate pre-signed URLs for direct client upload (S3 only)
 * @access Private (Warehouse staff)
 * @body { shipmentId, files: [{ fileName, contentType, fileSize }] }
 */
router.post(
    '/upload-urls',
    authenticate,
    asyncHandler(packingStationController.generateUploadUrls)
);

/**
 * @route GET /api/v1/packing-station/evidence/:shipmentId
 * @desc Get packing evidence for a shipment
 * @access Private
 */
router.get(
    '/evidence/:shipmentId',
    authenticate,
    asyncHandler(packingStationController.getEvidence)
);

export default router;
