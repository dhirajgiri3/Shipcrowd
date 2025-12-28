/**
 * Warehouse Routes Index
 * 
 * Combines all warehouse workflow routes
 */

import { Router } from 'express';
import pickingRoutes from './picking.routes';
import packingRoutes from './packing.routes';
import inventoryRoutes from './inventory.routes';

const router = Router();

// Mount sub-routes
router.use('/picking', pickingRoutes);
router.use('/packing', packingRoutes);
router.use('/inventory', inventoryRoutes);

export default router;
