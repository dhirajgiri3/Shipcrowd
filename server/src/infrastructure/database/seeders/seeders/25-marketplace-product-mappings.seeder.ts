/**
 * Marketplace Product Mappings Seeder
 * 
 * Maps internal inventory to marketplace products.
 */

import mongoose from 'mongoose';
import ShopifyStore from '../../mongoose/models/marketplaces/shopify/shopify-store.model';
import WooCommerceStore from '../../mongoose/models/marketplaces/woocommerce/woocommerce-store.model';
import AmazonStore from '../../mongoose/models/marketplaces/amazon/amazon-store.model';
import FlipkartStore from '../../mongoose/models/marketplaces/flipkart/flipkart-store.model';

import ShopifyProductMapping from '../../mongoose/models/marketplaces/shopify/shopify-product-mapping.model';
import WooCommerceProductMapping from '../../mongoose/models/marketplaces/woocommerce/woocommerce-product-mapping.model';
import AmazonProductMapping from '../../mongoose/models/marketplaces/amazon/amazon-product-mapping.model';
import FlipkartProductMapping from '../../mongoose/models/marketplaces/flipkart/flipkart-product-mapping.model';

import Inventory from '../../mongoose/models/logistics/inventory/store/inventory.model';

import { logger, createTimer } from '../utils/logger.utils';
import { selectRandom, selectWeightedFromObject } from '../utils/random.utils';

// Helper to generate common fields
const generateCommonFields = (store: any, inventory: any) => ({
    companyId: store.companyId,
    HelixSKU: inventory.sku.toUpperCase(),
    HelixProductName: inventory.productName,
    syncInventory: true,
    syncPrice: Math.random() > 0.8, // Occasional price sync
    isActive: Math.random() > 0.1, // 90% active
});

function generateShopifyMapping(store: any, inventory: any) {
    return {
        ...generateCommonFields(store, inventory),
        shopifyStoreId: store._id,
        shopifyProductId: `gid://shopify/Product/${Math.floor(Math.random() * 100000000)}`,
        shopifyVariantId: `gid://shopify/ProductVariant/${Math.floor(Math.random() * 100000000)}`,
        shopifySKU: inventory.sku, // Ideally matches
        shopifyTitle: inventory.productName + ' (Shopify)',
        mappingType: selectWeightedFromObject({ 'AUTO': 0.7, 'MANUAL': 0.3 }),
        syncErrors: 0
    };
}

function generateWooCommerceMapping(store: any, inventory: any) {
    return {
        ...generateCommonFields(store, inventory),
        woocommerceStoreId: store._id,
        woocommerceProductId: Math.floor(Math.random() * 100000),
        woocommerceVariationId: Math.random() > 0.5 ? Math.floor(Math.random() * 10000) : undefined,
        woocommerceSKU: inventory.sku,
        woocommerceTitle: inventory.productName + ' (Woo)',
        mappingType: selectWeightedFromObject({ 'AUTO': 0.7, 'MANUAL': 0.3 }),
        syncErrors: 0
    };
}

function generateAmazonMapping(store: any, inventory: any) {
    return {
        ...generateCommonFields(store, inventory),
        amazonStoreId: store._id,
        amazonASIN: `B0${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        amazonSKU: `AMZ-${inventory.sku}`,
        fulfillmentType: selectWeightedFromObject({ 'MFN': 0.8, 'FBA': 0.2 }),
        mappingType: selectWeightedFromObject({ 'AUTO': 0.6, 'MANUAL': 0.4 }),
        lastSyncStatus: 'SUCCESS'
    };
}

function generateFlipkartMapping(store: any, inventory: any) {
    return {
        ...generateCommonFields(store, inventory),
        flipkartStoreId: store._id,
        flipkartFSN: `FSN${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
        flipkartSKU: `FK-${inventory.sku}`,
        flipkartTitle: inventory.productName + ' (Flipkart)',
        mappingType: selectWeightedFromObject({ 'AUTO': 0.6, 'MANUAL': 0.4 }),
        lastSyncStatus: 'SUCCESS'
    };
}

export async function seedMarketplaceProductMappings(): Promise<void> {
    const timer = createTimer();
    logger.step(25, 'Seeding Marketplace Product Mappings');

    try {
        const shopifyStores = await ShopifyStore.find().lean();
        const wooCommerceStores = await WooCommerceStore.find().lean();
        const amazonStores = await AmazonStore.find().lean();
        const flipkartStores = await FlipkartStore.find().lean();

        // Group configurations per store type
        const configs = [
            { type: 'shopify', stores: shopifyStores, model: ShopifyProductMapping, generator: generateShopifyMapping },
            { type: 'woocommerce', stores: wooCommerceStores, model: WooCommerceProductMapping, generator: generateWooCommerceMapping },
            { type: 'amazon', stores: amazonStores, model: AmazonProductMapping, generator: generateAmazonMapping },
            { type: 'flipkart', stores: flipkartStores, model: FlipkartProductMapping, generator: generateFlipkartMapping }
        ];

        let totalMappings = 0;
        const allInventory = await Inventory.find().lean();

        if (allInventory.length === 0) {
            logger.warn('No inventory found. specific mappings will be skipped.');
            return;
        }

        for (const config of configs) {
            const mappingsToInsert: any[] = [];
            const uniqueKeys = new Set(); // Track unique keys to prevent duplicates

            for (const store of config.stores) {
                const companyInventory = allInventory.filter((inv: any) => inv.companyId.toString() === (store as any).companyId.toString());

                if (companyInventory.length === 0) continue;

                // Map ~60% of inventory
                const itemsToMap = companyInventory.sort(() => 0.5 - Math.random()).slice(0, Math.floor(companyInventory.length * 0.6));

                for (const item of itemsToMap) {
                    const mappedData = config.generator(store, item);

                    // Prevent duplicates in current batch (though Model unique index also protects)
                    // For simplicity, just push. We set ordered: false helper.
                    mappingsToInsert.push(mappedData);
                }
            }

            if (mappingsToInsert.length > 0) {
                try {
                    await (config.model as any).insertMany(mappingsToInsert, { ordered: false });
                    totalMappings += mappingsToInsert.length;
                    logger.debug(`Seeded ${mappingsToInsert.length} ${config.type} product mappings`);
                } catch (e: any) {
                    // Ignore duplicate key errors (code 11000)
                    if (e.code !== 11000) {
                        logger.warn(`Partial error seeding ${config.type} mappings: ${e.message}`);
                    } else {
                        // Count actually inserted if possible, or just ignore exact count for now
                        totalMappings += (e.result?.nInserted || 0);
                    }
                }
            }
        }

        logger.complete('Marketplace Product Mappings', totalMappings, timer.elapsed());
    } catch (error) {
        logger.error('Failed to seed marketplace product mappings:', error);
        throw error;
    }
}
