import { Router } from 'express';
import adminPromoController from '../../../controllers/admin/admin-promo.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { csrfProtection, requireAccess } from '../../../middleware/index';

const router = Router();

router.use(authenticate);
router.use(requireAccess({ roles: ['admin', 'super_admin'] }));

router.get('/', adminPromoController.listPromosAdmin);
router.post('/', csrfProtection, adminPromoController.createPromoAdmin);
router.patch('/:id', csrfProtection, adminPromoController.updatePromoAdmin);
router.delete('/:id', csrfProtection, adminPromoController.deletePromoAdmin);

export default router;
