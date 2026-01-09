import { Router } from 'express';
import shopifyRoutes from './shopify.routes';
import woocommerceRoutes from './woocommerce.routes';
import flipkartRoutes from './flipkart.routes';
import amazonRoutes from './amazon.routes';
import flipkartProductMappingRoutes from './flipkart-product-mapping.routes';
import productMappingRoutes from './product-mapping.routes';
import integrationsRoutes from './integrations.routes';

/**
 * Integrations Routes Index
 *
 * Aggregates all marketplace integration routes under /api/v1/integrations
 */

const router = Router();

// Shopify Integration
router.use('/shopify', shopifyRoutes);

// WooCommerce Integration
router.use('/woocommerce', woocommerceRoutes);

// Flipkart Integration
router.use('/flipkart', flipkartRoutes);

// Flipkart Product Mapping (for nested routes)
router.use('/flipkart/stores/:storeId/mappings', flipkartProductMappingRoutes);

// Amazon Integration
router.use('/amazon', amazonRoutes);

// Generic Product Mapping (legacy/shared)
router.use('/product-mappings', productMappingRoutes);

// Cross-platform Integration Health Monitoring
router.use(integrationsRoutes);

export default router;
