/**
 * External Integrations - Barrel Export
 *
 * Centralized exports for all third-party vendor integrations
 */

// E-commerce platforms
export * from './ecommerce/amazon/amazon.client';
export * from './ecommerce/shopify/shopify.client';
export * from './ecommerce/flipkart/flipkart.client';
export * from './ecommerce/woocommerce/woocommerce.client';

// Courier services
export * from './couriers/base/courier.adapter';
export * from './couriers/velocity/velocity.auth';
export * from './couriers/velocity/velocity.mapper';
export * from './couriers/velocity/velocity-shipfast.provider';

// Communication services
export * from './communication/exotel/exotel.client';
export * from './communication/whatsapp/whatsapp.service';

// AI services
export * from './ai/openai/openai.service';

// Storage services
export * from './storage/cloudinary/cloudinary-storage.service';
