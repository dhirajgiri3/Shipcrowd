import { Router } from 'express';
import { asyncHandler } from '../../../../../shared/utils/asyncHandler';
import { JobController } from '../../../controllers/system/job.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

const router = Router();
const controller = new JobController();

router.get(
    '/jobs/failed',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(controller.listFailedJobs.bind(controller))
);

router.post(
    '/jobs/:jobId/retry',
    authenticate,
    requireAccess({ roles: ['admin', 'super_admin'] }),
    asyncHandler(controller.retryJob.bind(controller))
);

export default router;
