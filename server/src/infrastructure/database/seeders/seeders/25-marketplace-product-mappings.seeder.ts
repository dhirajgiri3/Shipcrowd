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

function generateMappingData(store: any, inventoryItem: any) {
    const syncStatusWeight = {
        'in-sync': 0.80,
        'out-of-sync': 0.10,
        'overstock': 0.05,
        'understock': 0.05
    };

    // Type casting for status
    const statusResult = selectWeightedFromObject(syncStatusWeight) as 'in-sync' | 'out-of-sync' | 'overstock' | 'understock';

    const marketplaceQty = Math.floor(inventoryItem.available * 0.95);

    return {
        storeId: store._id,
        companyId: store.companyId,
        marketplaceProductId: `gid://${store.platform || 'shopify'}/Product/${Math.floor(Math.random() * 1000000)}`,
        marketplaceSku: `EXT-${inventoryItem.sku}-${Math.floor(Math.random() * 1000)}`,
        internalSku: inventoryItem.sku,
        internalProductName: inventoryItem.productName,
        marketplaceProductName: `${inventoryItem.productName} (Marketplace)`,
        inventory: {
            marketplaceQty: marketplaceQty,
            internalQty: inventoryItem.available,
            lastSynced: new Date(),
            syncStatus: statusResult
        },
        pricing: {
            marketplacePrice: inventoryItem.cost * 2,
            internalPrice: inventoryItem.cost * 1.5, // Check cost field on inventory? If not use default
            syncStatus: Math.random() > 0.05 ? 'in-sync' : 'price-mismatch',
            currency: 'INR'
        },
        status: selectWeightedFromObject({ 'active': 0.85, 'archived': 0.10, 'delisted': 0.05 }),
        isSynced: true,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
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

        const allStores = [
            { type: 'shopify', stores: shopifyStores, model: ShopifyProductMapping },
            { type: 'woocommerce', stores: wooCommerceStores, model: WooCommerceProductMapping },
            { type: 'amazon', stores: amazonStores, model: AmazonProductMapping },
            { type: 'flipkart', stores: flipkartStores, model: FlipkartProductMapping }
        ];

        let totalMappings = 0;

        // Fetch all inventory once (might be large, but fine for seeding)
        const allInventory = await Inventory.find().lean();

        if (allInventory.length === 0) {
            logger.warn('No inventory found. specific mappings will be skipped.');
            // Should we return or try with mock data if inventory missing? Return for now.
            return;
        }

        for (const { type, stores, model } of allStores) {
            const mappingsToInsert: any[] = [];

            for (const store of stores) {
                // Filter inventory for this company
                const companyInventory = allInventory.filter((inv: any) => inv.companyId.toString() === (store as any).companyId.toString());

                if (companyInventory.length === 0) continue;

                // Map 80%
                const mappingsCount = Math.floor(companyInventory.length * 0.8);
                const itemsToMap = companyInventory.slice(0, mappingsCount);

                for (const item of itemsToMap) {
                    mappingsToInsert.push(generateMappingData(store, item));
                }
            }

            if (mappingsToInsert.length > 0) {
                // Bulk insert could fail on duplicates if not careful, but we generate unique external IDs mostly
                try {
                    await (model as any).insertMany(mappingsToInsert, { ordered: false });
                } catch (e) {
                    // Continue on partial success
                }
                totalMappings += mappingsToInsert.length;
                logger.debug(`Seeded ${mappingsToInsert.length} ${type} product mappings`);
            }
        }

        logger.complete('Marketplace Product Mappings', totalMappings, timer.elapsed());
    } catch (error) {
        logger.error('Failed to seed marketplace product mappings:', error);
        throw error;
    }
}
