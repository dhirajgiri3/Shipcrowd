import { Router } from 'express';
import asyncHandler from '../../../../../shared/utils/asyncHandler';
import AdminCommissionTransactionController from '../../../controllers/commission/admin-commission-transaction.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

const router = Router();

router.use(authenticate);
router.use(requireAccess({ roles: ['admin', 'super_admin'] }));

router.get('/transactions', asyncHandler(AdminCommissionTransactionController.listTransactions));
router.post('/transactions/bulk-approve', asyncHandler(AdminCommissionTransactionController.bulkApprove));
router.post('/transactions/bulk-reject', asyncHandler(AdminCommissionTransactionController.bulkReject));

export default router;
