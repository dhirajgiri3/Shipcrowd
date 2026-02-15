/**
 * Warehouse Routes Index
 * 
 * Combines all warehouse workflow routes
 */

import { Router } from 'express';
import inventoryRoutes from './inventory.routes';
import packingRoutes from './packing.routes';
import pickingRoutes from './picking.routes';

const router = Router();

// Mount sub-routes
router.use('/picking', pickingRoutes);
router.use('/packing', packingRoutes);
router.use('/inventory', inventoryRoutes);

export default router;
