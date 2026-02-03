import { Router } from 'express';
import multer from 'multer';
import PODController from '../../../controllers/shipments/pod.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { uploadRateLimiter } from '../../../../../shared/config/rateLimit.config';
import { validateKYCFile } from '../../../middleware/upload/file-validation.middleware';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * POD Routes
 */

// Upload POD manually
router.post(
    '/:id/pod/upload',
    authenticate,
    uploadRateLimiter,
    upload.single('file'),
    validateKYCFile({
        maxSize: 10 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf']
    }),
    PODController.uploadPOD
);

// Get POD (manual or courier)
router.get(
    '/:id/pod',
    authenticate,
    PODController.getPOD
);

export default router;
