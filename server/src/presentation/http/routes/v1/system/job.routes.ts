import { Router } from 'express';
import { JobController } from '../../../controllers/system/job.controller';
import { authenticate, authorize } from '../../../middleware/auth/auth';
import { asyncHandler } from '../../../../../shared/utils/asyncHandler';

const router = Router();
const controller = new JobController();

router.get(
    '/jobs/failed',
    authenticate,
    authorize(['admin', 'super_admin']),
    asyncHandler(controller.listFailedJobs.bind(controller))
);

router.post(
    '/jobs/:jobId/retry',
    authenticate,
    authorize(['admin', 'super_admin']),
    asyncHandler(controller.retryJob.bind(controller))
);

export default router;
