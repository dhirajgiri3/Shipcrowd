import { Router } from 'express';
import InvoiceController from '../../../controllers/finance/invoice.controller';
import { authenticate } from '../../../middleware/auth/auth';
import { apiRateLimiter } from '../../../middleware/system/rate-limiter.middleware';

const router = Router();

/**
 * Invoice Routes
 * All routes require authentication
 */

// 1. Create invoice
router.post(
    '/',
    authenticate,
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
    apiRateLimiter,
    InvoiceController.sendInvoice
);

// 6. Create credit note
router.post(
    '/credit-notes',
    authenticate,
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
    apiRateLimiter,
    InvoiceController.exportGSTR
);

// 9. Generate IRN for invoice
router.post(
    '/:id/generate-irn',
    authenticate,
    apiRateLimiter,
    InvoiceController.generateIRN
);

// 10. Cancel IRN
router.post(
    '/:id/cancel-irn',
    authenticate,
    apiRateLimiter,
    InvoiceController.cancelIRN
);

export default router;
