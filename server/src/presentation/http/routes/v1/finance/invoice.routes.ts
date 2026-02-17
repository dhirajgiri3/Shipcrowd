import { Router } from 'express';
import { apiRateLimiter } from '../../../../../shared/config/rateLimit.config';
import InvoiceController from '../../../controllers/finance/invoice.controller';
import { authenticate, csrfProtection } from '../../../middleware/auth/auth';
import { requireAccess } from '../../../middleware/auth/unified-access';

const router = Router();

/**
 * Invoice Routes
 * All routes require authentication
 */

// 1. Create invoice
router.post(
    '/',
    authenticate,
    requireAccess({ kyc: true }),
    csrfProtection,
    apiRateLimiter,
    InvoiceController.createInvoice
);

// 2. List invoices
router.get(
    '/',
    authenticate,
    InvoiceController.listInvoices
);

// 3. Get invoice details
router.get(
    '/:id',
    authenticate,
    InvoiceController.getInvoice
);

// 4. Download invoice (PDF/CSV)
router.get(
    '/:id/download',
    authenticate,
    InvoiceController.downloadInvoice
);

// 5. Send invoice via email
router.post(
    '/:id/send',
    authenticate,
    requireAccess({ kyc: true }),
    csrfProtection,
    apiRateLimiter,
    InvoiceController.sendInvoice
);

// 6. Create credit note
router.post(
    '/credit-notes',
    authenticate,
    requireAccess({ kyc: true }),
    csrfProtection,
    apiRateLimiter,
    InvoiceController.createCreditNote
);

// 7. Get GST summary
router.get(
    '/tax/gst-summary',
    authenticate,
    InvoiceController.getGSTSummary
);

// 8. Export GSTR-1 JSON
router.post(
    '/tax/gstr-export',
    authenticate,
    requireAccess({ kyc: true }),
    csrfProtection,
    apiRateLimiter,
    InvoiceController.exportGSTR
);

// 9. Generate IRN for invoice
router.post(
    '/:id/generate-irn',
    authenticate,
    requireAccess({ kyc: true }),
    csrfProtection,
    apiRateLimiter,
    InvoiceController.generateIRN
);

// 10. Cancel IRN
router.post(
    '/:id/cancel-irn',
    authenticate,
    requireAccess({ kyc: true }),
    csrfProtection,
    apiRateLimiter,
    InvoiceController.cancelIRN
);

export default router;
