import express, { Request, Response, NextFunction } from 'express';
import { authenticate, csrfProtection } from '../../middleware/auth';
import ratecardController from '../../controllers/ratecard.controller';

const router = express.Router();

// Type assertion for request handlers
type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asHandler = (fn: any): RequestHandler => fn as RequestHandler;

/**
 * @route POST /api/v1/ratecards
 * @desc Create a new rate card
 * @access Private
 */
router.post('/', authenticate, csrfProtection, asHandler(ratecardController.createRateCard));

/**
 * @route GET /api/v1/ratecards
 * @desc Get all rate cards
 * @access Private
 */
router.get('/', authenticate, asHandler(ratecardController.getRateCards));

/**
 * @route POST /api/v1/ratecards/calculate
 * @desc Calculate shipping rate
 * @access Private
 */
router.post('/calculate', authenticate, asHandler(ratecardController.calculateRate));

/**
 * @route GET /api/v1/ratecards/:id
 * @desc Get a rate card by ID
 * @access Private
 */
router.get('/:id', authenticate, asHandler(ratecardController.getRateCardById));

/**
 * @route PATCH /api/v1/ratecards/:id
 * @desc Update a rate card
 * @access Private
 */
router.patch('/:id', authenticate, csrfProtection, asHandler(ratecardController.updateRateCard));

export default router;
