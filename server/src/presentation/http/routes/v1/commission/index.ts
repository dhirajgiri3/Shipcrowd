/**
 * Commission Routes Index
 * 
 * Aggregates all commission-related routes
 */

import { Router } from 'express';
import commissionRulesRouter from './commission-rules.routes';
import salesRepresentativesRouter from './sales-representatives.routes';
import commissionTransactionsRouter from './commission-transactions.routes';
import payoutsRouter from './payouts.routes';
import analyticsRouter from './analytics.routes';

const router = Router();

// Mount sub-routers
router.use('/rules', commissionRulesRouter);
router.use('/sales-reps', salesRepresentativesRouter);
router.use('/transactions', commissionTransactionsRouter);
router.use('/payouts', payoutsRouter);
router.use('/analytics', analyticsRouter);

export default router;
