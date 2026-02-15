/**
 * Marketplace Stores Seeder
 * 
 * Seeds marketplace integration data:
 * - ShopifyStores: 5-10 stores per company subset
 * - WooCommerceStores: 3-5 stores
 * - AmazonStores: 2-4 stores with SP-API credentials
 * - FlipkartStores: 2-4 stores
 * 
 * Note: Generates fake OAuth tokens/API keys as per user requirement
 */

import User from '../../mongoose/models/iam/users/user.model';
import AmazonStore from '../../mongoose/models/marketplaces/amazon/amazon-store.model';
import FlipkartStore from '../../mongoose/models/marketplaces/flipkart/flipkart-store.model';
import ShopifyStore from '../../mongoose/models/marketplaces/shopify/shopify-store.model';
import WooCommerceStore from '../../mongoose/models/marketplaces/woocommerce/woocommerce-store.model';
import Company from '../../mongoose/models/organization/core/company.model';
import { subDays } from '../utils/date.utils';
import { createTimer, logger } from '../utils/logger.utils';
import { generateAlphanumeric, generateHexString, randomInt, selectRandom } from '../utils/random.utils';

// Store status distribution
const STORE_STATUS_DISTRIBUTION = {
    active: 70,
    paused: 20,
    error: 10,
};
void STORE_STATUS_DISTRIBUTION;

// Shopify plans
const SHOPIFY_PLANS = ['basic', 'shopify', 'advanced', 'plus'];

// Shopify webhook topics
const SHOPIFY_WEBHOOK_TOPICS = [
    'orders/create',
    'orders/updated',
    'orders/fulfilled',
    'products/update',
    'inventory_levels/update',
];

// WooCommerce versions
const WC_VERSIONS = ['8.4.0', '8.3.0', '8.2.1', '7.9.0'];
const WP_VERSIONS = ['6.4.2', '6.4.1', '6.3.2', '6.2.0'];

// Amazon marketplaces
const AMAZON_MARKETPLACES = [
    { id: 'A21TJRUUN4KGV', name: 'Amazon India', region: 'eu-west-1' },
    { id: 'ATVPDKIKX0DER', name: 'Amazon US', region: 'us-east-1' },
    { id: 'A1F83G8C2ARO7P', name: 'Amazon UK', region: 'eu-west-1' },
];

// Store name templates
const STORE_NAME_TEMPLATES = [
    { prefix: 'QuickMart', suffix: ['Store', 'India', 'Online'] },
    { prefix: 'PrimeSeller', suffix: ['Hub', 'Shop', 'Express'] },
    { prefix: 'FastTrade', suffix: ['Co', 'Retail', 'Direct'] },
    { prefix: 'SmartShop', suffix: ['Online', 'India', 'World'] },
];

/**
 * Generate a fake OAuth token
 */
function generateFakeToken(prefix: string = 'shpat'): string {
    return `${prefix}_${generateHexString(32)}`;
}

/**
 * Generate fake AWS credentials
 */
function generateAwsCredentials(): { accessKeyId: string; secretAccessKey: string; roleArn: string } {
    return {
        accessKeyId: `AKIATEST${generateAlphanumeric(16).toUpperCase()}`,
        secretAccessKey: generateHexString(40),
        roleArn: `arn:aws:iam::${randomInt(100000000000, 999999999999)}:role/ShipcrowdSellerRole`,
    };
}

/**
 * Generate store name
 */
function generateStoreName(): string {
    const template = selectRandom(STORE_NAME_TEMPLATES);
    return `${template.prefix} ${selectRandom(template.suffix)}`;
}

/**
 * Generate sync config for stores
 */
function generateSyncConfig(status: string): any {
    return {
        orderSync: {
            enabled: true,
            autoSync: status === 'active',
            syncInterval: selectRandom([15, 30, 60]),
            lastSyncAt: status !== 'error' ? subDays(new Date(), randomInt(0, 1)) : undefined,
            syncStatus: status === 'error' ? 'ERROR' : 'IDLE',
            errorCount: status === 'error' ? randomInt(1, 5) : 0,
            lastError: status === 'error' ? 'Connection timeout' : undefined,
        },
        inventorySync: {
            enabled: Math.random() > 0.3,
            autoSync: false,
            syncDirection: 'ONE_WAY',
            lastSyncAt: subDays(new Date(), randomInt(0, 7)),
            errorCount: 0,
        },
        webhooksEnabled: true,
    };
}

/**
 * Generate store statistics
 */
function generateStats(installedDays: number): any {
    return {
        totalOrdersSynced: randomInt(50, 1000) * Math.ceil(installedDays / 30),
        totalProductsMapped: randomInt(10, 200),
        totalInventorySyncs: randomInt(10, 100),
        lastOrderSyncAt: subDays(new Date(), randomInt(0, 2)),
        lastInventorySyncAt: subDays(new Date(), randomInt(0, 7)),
        webhooksReceived: randomInt(100, 5000),
    };
}

/**
 * Get random status
 */
function getRandomStatus(): 'active' | 'paused' | 'error' {
    const rand = Math.random() * 100;
    if (rand < 70) return 'active';
    if (rand < 90) return 'paused';
    return 'error';
}

/**
 * Generate a Shopify store
 */
function generateShopifyStore(companyId: any, _createdBy: any): any {
    const storeName = generateStoreName();
    const shopDomain = storeName.toLowerCase().replace(/\s+/g, '-') + '.myshopify.com';
    const status = getRandomStatus();
    const installedDays = randomInt(30, 365);
    const installedAt = subDays(new Date(), installedDays);

    return {
        companyId,
        shopDomain,
        shopName: storeName,
        shopEmail: `admin@${shopDomain.replace('.myshopify.com', '.com')}`,
        shopCountry: 'IN',
        shopCurrency: 'INR',
        shopPlan: selectRandom(SHOPIFY_PLANS),
        accessToken: generateFakeToken('shpat'),
        scope: 'read_orders,write_orders,read_products,write_products,read_inventory,write_inventory',
        installedAt,
        isActive: status !== 'error',
        isPaused: status === 'paused',
        syncConfig: generateSyncConfig(status),
        webhooks: SHOPIFY_WEBHOOK_TOPICS.slice(0, randomInt(2, 5)).map(topic => ({
            topic,
            shopifyWebhookId: String(randomInt(1000000, 9999999)),
            address: `https://api.Shipcrowd.com/webhooks/shopify/${generateHexString(16)}`,
            isActive: true,
            createdAt: installedAt,
        })),
        stats: generateStats(installedDays),
        createdAt: installedAt,
        updatedAt: subDays(new Date(), randomInt(0, 7)),
    };
}

/**
 * Generate a WooCommerce store
 */
function generateWooCommerceStore(companyId: any, createdBy: any): any {
    const storeName = generateStoreName();
    const domain = storeName.toLowerCase().replace(/\s+/g, '') + '.com';
    const status = getRandomStatus();
    const installedDays = randomInt(30, 365);
    const installedAt = subDays(new Date(), installedDays);

    return {
        companyId,
        createdBy,
        storeUrl: `https://${domain}`,
        storeName,
        storeEmail: `support@${domain}`,
        apiVersion: 'wc/v3',
        wpVersion: selectRandom(WP_VERSIONS),
        wcVersion: selectRandom(WC_VERSIONS),
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        consumerKey: `ck_${generateHexString(40)}`,
        consumerSecret: `cs_${generateHexString(40)}`,
        webhookSecret: generateHexString(32),
        isActive: status !== 'error',
        isPaused: status === 'paused',
        lastSyncAt: subDays(new Date(), randomInt(0, 3)),
        syncStatus: status,
        errorCount: status === 'error' ? randomInt(1, 3) : 0,
        lastError: status === 'error' ? 'API rate limit exceeded' : undefined,
        installedAt,
        syncConfig: generateSyncConfig(status),
        webhooks: [],
        stats: generateStats(installedDays),
        createdAt: installedAt,
        updatedAt: subDays(new Date(), randomInt(0, 7)),
    };
}

/**
 * Generate an Amazon store
 */
function generateAmazonStore(companyId: any, createdBy: any): any {
    const storeName = generateStoreName();
    const marketplace = selectRandom(AMAZON_MARKETPLACES);
    const status = getRandomStatus();
    const installedDays = randomInt(30, 365);
    const installedAt = subDays(new Date(), installedDays);
    const aws = generateAwsCredentials();

    return {
        companyId,
        createdBy,
        sellerId: `A${generateAlphanumeric(13).toUpperCase()}`,
        marketplaceId: marketplace.id,
        sellerName: storeName,
        sellerEmail: `seller@${storeName.toLowerCase().replace(/\s+/g, '')}.com`,
        region: marketplace.region,
        apiVersion: '2021-06-30',
        lwaClientId: `amzn1.application-oa2-client.${generateHexString(32)}`,
        lwaClientSecret: `amzn1.oa2-cs.v1.${generateHexString(64)}`,
        lwaRefreshToken: `Atzr|${generateHexString(256)}`,
        awsAccessKeyId: aws.accessKeyId,
        awsSecretAccessKey: aws.secretAccessKey,
        roleArn: aws.roleArn,
        sqsQueueUrl: `https://sqs.${marketplace.region}.amazonaws.com/${randomInt(100000000000, 999999999999)}/Shipcrowd-orders`,
        isActive: status !== 'error',
        isPaused: status === 'paused',
        lastSyncAt: subDays(new Date(), randomInt(0, 3)),
        syncStatus: status,
        errorCount: status === 'error' ? randomInt(1, 3) : 0,
        lastError: status === 'error' ? 'Unauthorized - Token expired' : undefined,
        installedAt,
        webhooks: [],
        syncConfig: generateSyncConfig(status),
        stats: generateStats(installedDays),
        createdAt: installedAt,
        updatedAt: subDays(new Date(), randomInt(0, 7)),
    };
}

/**
 * Generate a Flipkart store
 */
function generateFlipkartStore(companyId: any, createdBy: any): any {
    const storeName = generateStoreName();
    const status = getRandomStatus();
    const installedDays = randomInt(30, 365);
    const installedAt = subDays(new Date(), installedDays);

    return {
        companyId,
        createdBy,
        sellerId: `FK${generateAlphanumeric(12).toUpperCase()}`,
        sellerName: storeName,
        sellerEmail: `seller@${storeName.toLowerCase().replace(/\s+/g, '')}.com`,
        storeUrl: `https://seller.flipkart.com/seller/${generateAlphanumeric(8)}`,
        apiVersion: 'v3',
        apiKey: generateHexString(32),
        apiSecret: generateHexString(64),
        accessToken: generateHexString(128),
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: status !== 'error',
        isPaused: status === 'paused',
        lastSyncAt: subDays(new Date(), randomInt(0, 3)),
        syncStatus: status,
        errorCount: status === 'error' ? randomInt(1, 3) : 0,
        lastError: status === 'error' ? 'Invalid API key' : undefined,
        installedAt,
        webhooks: [],
        syncConfig: generateSyncConfig(status),
        stats: generateStats(installedDays),
        createdAt: installedAt,
        updatedAt: subDays(new Date(), randomInt(0, 7)),
    };
}

/**
 * Main seeder function
 */
export async function seedMarketplaceStores(): Promise<void> {
    const timer = createTimer();
    logger.step(21, 'Seeding Marketplace Stores (Shopify, WooCommerce, Amazon, Flipkart)');

    try {
        const companies = await Company.find({ status: 'approved', isDeleted: false }).limit(15).lean();
        const users = await User.find({ role: { $in: ['admin', 'seller'] } }).limit(30).lean();

        if (companies.length === 0 || users.length === 0) {
            logger.warn('No companies or users found. Skipping marketplace stores seeder.');
            return;
        }

        const shopifyStores: any[] = [];
        const woocommerceStores: any[] = [];
        const amazonStores: any[] = [];
        const flipkartStores: any[] = [];

        // Generate stores for a subset of companies
        for (const company of companies.slice(0, 10)) {
            const companyAny = company as any;
            const user = selectRandom(users) as any;

            // Each company gets 1-2 Shopify stores
            const shopifyCount = randomInt(1, 2);
            for (let i = 0; i < shopifyCount; i++) {
                shopifyStores.push(generateShopifyStore(companyAny._id, user._id));
            }

            // 60% chance of WooCommerce store
            if (Math.random() > 0.4) {
                woocommerceStores.push(generateWooCommerceStore(companyAny._id, user._id));
            }

            // 40% chance of Amazon store
            if (Math.random() > 0.6) {
                amazonStores.push(generateAmazonStore(companyAny._id, user._id));
            }

            // 40% chance of Flipkart store
            if (Math.random() > 0.6) {
                flipkartStores.push(generateFlipkartStore(companyAny._id, user._id));
            }
        }

        // Insert all stores
        if (shopifyStores.length > 0) {
            await ShopifyStore.insertMany(shopifyStores, { ordered: false }).catch((err) => {
                if (err.code !== 11000) throw err;
                logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate Shopify stores`);
            });
        }

        if (woocommerceStores.length > 0) {
            await WooCommerceStore.insertMany(woocommerceStores, { ordered: false }).catch((err) => {
                if (err.code !== 11000) throw err;
                logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate WooCommerce stores`);
            });
        }

        if (amazonStores.length > 0) {
            await AmazonStore.insertMany(amazonStores, { ordered: false }).catch((err) => {
                if (err.code !== 11000) throw err;
                logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate Amazon stores`);
            });
        }

        if (flipkartStores.length > 0) {
            await FlipkartStore.insertMany(flipkartStores, { ordered: false }).catch((err) => {
                if (err.code !== 11000) throw err;
                logger.warn(`Skipped ${err.writeErrors?.length || 0} duplicate Flipkart stores`);
            });
        }

        const total = shopifyStores.length + woocommerceStores.length + amazonStores.length + flipkartStores.length;
        logger.complete('marketplace-stores', total, timer.elapsed());
        logger.table({
            'Shopify Stores': shopifyStores.length,
            'WooCommerce Stores': woocommerceStores.length,
            'Amazon Stores': amazonStores.length,
            'Flipkart Stores': flipkartStores.length,
            'Total Stores': total,
        });

    } catch (error) {
        logger.error('Failed to seed marketplace stores:', error);
        throw error;
    }
}
