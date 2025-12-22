import express, { Request, Response, NextFunction } from 'express';
import { authenticate, csrfProtection } from '../../middleware/auth';
import orderController from '../../controllers/order.controller';
import multer from 'multer';

const router = express.Router();

// Configure multer for CSV file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (_req, file, cb) => {
        // Accept only CSV files
        if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(null, false);
            return cb(new Error('Only CSV files are allowed'));
        }
    },
});

// Type assertion for request handlers
type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asHandler = (fn: any): RequestHandler => fn as RequestHandler;

/**
 * @route POST /api/v1/orders
 * @desc Create a new order
 * @access Private
 */
router.post('/', authenticate, csrfProtection, asHandler(orderController.createOrder));

/**
 * @route GET /api/v1/orders
 * @desc Get all orders with pagination and filters
 * @access Private
 */
router.get('/', authenticate, asHandler(orderController.getOrders));

/**
 * @route GET /api/v1/orders/:orderId
 * @desc Get a single order by ID
 * @access Private
 */
router.get('/:orderId', authenticate, asHandler(orderController.getOrderById));

/**
 * @route PATCH /api/v1/orders/:orderId
 * @desc Update an order
 * @access Private
 */
router.patch('/:orderId', authenticate, csrfProtection, asHandler(orderController.updateOrder));

/**
 * @route DELETE /api/v1/orders/:orderId
 * @desc Soft delete an order
 * @access Private
 */
router.delete('/:orderId', authenticate, csrfProtection, asHandler(orderController.deleteOrder));

/**
 * @route POST /api/v1/orders/bulk
 * @desc Bulk import orders from CSV
 * @access Private
 */
router.post(
    '/bulk',
    authenticate,
    csrfProtection,
    upload.single('file'),
    asHandler(orderController.bulkImportOrders)
);

export default router;
