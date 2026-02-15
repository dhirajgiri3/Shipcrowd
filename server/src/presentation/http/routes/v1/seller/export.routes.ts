import express from 'express';
import sellerExportController from '../../../controllers/export/seller-export.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { asyncHandler } from '../../../../../shared/utils/asyncHandler';

const router = express.Router();

router.use(authenticate);

router.post('/', asyncHandler(sellerExportController.exportSellerModule));
router.get('/jobs/:jobId', asyncHandler(sellerExportController.getSellerExportJobStatus));
router.get('/jobs/:jobId/download', asyncHandler(sellerExportController.downloadSellerExportJob));

export default router;
