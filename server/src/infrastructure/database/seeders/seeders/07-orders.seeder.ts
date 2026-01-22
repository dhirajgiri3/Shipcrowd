/**
 * Orders Seeder
 * 
 * Generates 3,000-5,000 orders distributed over 12 months with seasonal variations.
 */

import mongoose from 'mongoose';
import Order from '../../mongoose/models/orders/core/order.model';
import Company from '../../mongoose/models/organization/core/company.model';
import Warehouse from '../../mongoose/models/logistics/warehouse/structure/warehouse.model';
import Inventory from '../../mongoose/models/logistics/inventory/store/inventory.model';
import { SEED_CONFIG, BusinessType, PaymentMethod } from '../config';
import { randomInt, selectRandom, selectWeightedFromObject, maybeExecute, randomFloat } from '../utils/random.utils';
import { logger, createTimer } from '../utils/logger.utils';
import { generateMonthRange, getSeasonalMultiplier, randomDateInMonth, addDays } from '../utils/date.utils';
import { generateIndianName, generateIndianPhone, generateEmail } from '../data/customer-names';
import { INDIAN_CITIES, getCityByName, CityData, getShippingZone } from '../data/indian-cities';
import { generateStreetAddress, generateLandmark } from '../utils/address.utils';
import { generateOrderProducts, getGSTRate, calculateOrderWeight } from '../data/product-catalog';
import { calculateShippingCost, getBestCarrier } from '../data/carrier-data';

// Order number counter per company
const orderCounters: Map<string, number> = new Map();

/**
 * Generate unique order number
 */
// Map to store consistent unique prefixes for companies
const companyPrefixMap: Map<string, string> = new Map();
let nextPrefixIndex = 1;

/**
 * Generate unique order number
 */
function generateOrderNumber(companyId: string, date: Date): string {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const yearMonth = `${year}${month}`;

    // Counter key includes company and year-month for monthly sequence reset
    const counterKey = `${companyId}-${yearMonth}`;
    const counter = (orderCounters.get(counterKey) || 0) + 1;
    orderCounters.set(counterKey, counter);

    // Get or assign unique prefix for this company
    let companyPrefix = companyPrefixMap.get(companyId);
    if (!companyPrefix) {
        // Generate unique prefix like C001, C002, etc.
        companyPrefix = `C${nextPrefixIndex.toString().padStart(3, '0')}`;
        companyPrefixMap.set(companyId, companyPrefix);
        nextPrefixIndex++;
    }

    const seq = counter.toString().padStart(5, '0');

    return `ORD-${companyPrefix}-${yearMonth}-${seq}`;
}

/**
 * Determine business type from company name
 */
function getBusinessType(companyName: string): BusinessType {
    const name = companyName.toLowerCase();
    if (name.includes('wholesale') || name.includes('trader') || name.includes('b2b') ||
        name.includes('industrial') || name.includes('bulk') || name.includes('distributor')) {
        return 'b2b';
    }
    if (name.includes('tech') || name.includes('electronic') || name.includes('digital') ||
        name.includes('mobile') || name.includes('gadget') || name.includes('computer')) {
        return 'electronics';
    }
    return 'fashion';
}

/**
 * Select customer city based on company location
 */
function selectCustomerCity(companyCity: string): CityData {
    // 60% same state, 40% different state
    const sameState = Math.random() < (SEED_CONFIG.customerLocation.sameState / 100);

    if (sameState) {
        const companyData = getCityByName(companyCity);
        if (companyData) {
            // Find cities in same state
            const sameSateCities = [...INDIAN_CITIES.metro, ...INDIAN_CITIES.tier2, ...INDIAN_CITIES.tier3]
                .filter(c => c.state === companyData.state);
            if (sameSateCities.length > 0) {
                return selectRandom(sameSateCities);
            }
        }
    }

    // Return weighted random city
    const tier = selectWeightedFromObject(SEED_CONFIG.cityTiers);
    return selectRandom(INDIAN_CITIES[tier]);
}

/**
 * Select payment method based on city tier and business type
 */
function selectPaymentMethod(cityTier: 'metro' | 'tier2' | 'tier3', businessType: BusinessType): PaymentMethod {
    // Electronics has higher prepaid rate
    if (businessType === 'electronics') {
        return selectWeightedFromObject(SEED_CONFIG.electronicsPayment) as PaymentMethod;
    }

    const tierDistribution = SEED_CONFIG.paymentMethodByTier[cityTier];
    return selectWeightedFromObject(tierDistribution) as PaymentMethod;
}

/**
 * Select order source based on company integrations
 */
function selectOrderSource(company: any): string {
    const hasShopify = !!company.integrations?.shopify?.shopDomain;
    const hasWooCommerce = !!company.integrations?.woocommerce?.siteUrl;

    const sources: string[] = ['manual'];
    const weights: number[] = [40];

    if (hasShopify) {
        sources.push('shopify');
        weights.push(30);
    }
    if (hasWooCommerce) {
        sources.push('woocommerce');
        weights.push(20);
    }
    sources.push('api');
    weights.push(10);

    // Normalize weights
    const total = weights.reduce((a, b) => a + b, 0);
    const normalized = weights.map(w => w / total * 100);

    let random = Math.random() * 100;
    for (let i = 0; i < sources.length; i++) {
        random -= normalized[i];
        if (random <= 0) return sources[i];
    }
    return 'manual';
}

/**
 * Generate order data
 */
function generateOrderData(
    company: any,
    warehouse: any,
    orderDate: Date,
    businessType: BusinessType
): any {
    const customerCity = selectCustomerCity(company.address?.city || 'Mumbai');
    const cityTier = INDIAN_CITIES.metro.some(c => c.name === customerCity.name) ? 'metro'
        : INDIAN_CITIES.tier2.some(c => c.name === customerCity.name) ? 'tier2' : 'tier3';

    const paymentMethod = selectPaymentMethod(cityTier, businessType);
    const products = generateOrderProducts(businessType);

    // Calculate totals
    const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const gstRate = getGSTRate(products[0]?.hsnCode || '6204');
    const tax = Math.round(subtotal * (gstRate / 100));

    // Calculate shipping cost
    const totalWeight = calculateOrderWeight(products);
    const zone = getShippingZone(warehouse.address?.city || 'Mumbai', customerCity.name);
    const shippingCost = calculateShippingCost(
        getBestCarrier(paymentMethod === 'cod' ? subtotal + tax : 0, totalWeight, cityTier),
        totalWeight,
        zone,
        paymentMethod === 'cod'
    );

    // Apply discount (30% chance)
    const discountPercent = selectWeightedFromObject(SEED_CONFIG.discounts);
    const discount = discountPercent === 'none' ? 0
        : discountPercent === 'tenPercent' ? Math.round(subtotal * 0.10)
            : Math.round(subtotal * 0.15);

    const total = subtotal + tax + shippingCost - discount;

    const customerName = generateIndianName();

    return {
        orderNumber: generateOrderNumber(company._id.toString(), orderDate),
        companyId: company._id,
        customerInfo: {
            name: customerName,
            email: generateEmail(customerName),
            phone: generateIndianPhone(),
            address: {
                line1: generateStreetAddress(customerCity.name),
                line2: generateLandmark(),
                city: customerCity.name,
                state: customerCity.state,
                country: 'India',
                postalCode: selectRandom(customerCity.pincodes),
            },
        },
        products: products.map(p => ({
            name: p.name,
            sku: p.sku,
            quantity: p.quantity,
            price: p.price,
            weight: p.weight,
            dimensions: p.dimensions,
        })),
        shippingDetails: {
            shippingCost,
        },
        paymentStatus: selectWeightedFromObject({ paid: 85, pending: 10, failed: 5 }),
        paymentMethod,
        source: selectOrderSource(company),
        warehouseId: warehouse._id,
        statusHistory: [{
            status: 'pending',
            timestamp: orderDate,
            comment: 'Order placed',
        }],
        currentStatus: 'pending',
        totals: {
            subtotal,
            tax,
            shipping: shippingCost,
            discount,
            total,
        },
        notes: maybeExecute(() => `Customer request: ${selectRandom([
            'Please call before delivery',
            'Fragile items - handle with care',
            'Gift wrapping requested',
            'Leave at door if not available',
            'Preferred delivery time: evening',
        ])}`, 0.2),
        tags: businessType === 'b2b' ? ['b2b', 'bulk'] : [businessType],
        isDeleted: false,
        createdAt: orderDate,
        updatedAt: orderDate,
    };
}

/**
 * Generate customer repository for repeat customer patterns
 */
function generateCustomerRepository(totalOrders: number): Map<string, any> {
    const customers = new Map<string, any>();

    // Create 2,000-3,000 unique customers
    const customerCount = randomInt(2000, 3000);

    // 70% single-order, 20% 2-3 orders, 10% 4-10 orders
    for (let i = 0; i < customerCount; i++) {
        const gender = Math.random() < 0.5 ? 'male' : 'female';
        const name = generateIndianName(gender);
        const phone = generateIndianPhone();
        const email = generateEmail(name);

        const customerKey = `${phone}`;

        customers.set(customerKey, {
            name,
            email,
            phone,
            orderCount: 0,
            maxOrders: Math.random() < 0.7 ? 1 : Math.random() < 0.67 ? randomInt(2, 3) : randomInt(4, 10),
            addresses: [],
        });
    }

    return customers;
}

/**
 * Main seeder function
 */
export async function seedOrders(): Promise<void> {
    const timer = createTimer();
    logger.step(7, 'Seeding Orders');

    // Clear counters to ensure fresh start on each run
    orderCounters.clear();
    companyPrefixMap.clear();
    nextPrefixIndex = 1;

    try {
        // Get approved companies with warehouses
        const companies = await Company.find({ status: 'approved' }).lean();
        const warehouses = await Warehouse.find({ isActive: true, isDeleted: false }).lean();

        // Get inventory for SKU linking
        const inventoryRecords = await Inventory.find({
            status: { $in: ['ACTIVE', 'LOW_STOCK'] },
            onHand: { $gt: 0 },
            isActive: true,
            isDeleted: false
        }).lean();

        if (companies.length === 0 || warehouses.length === 0) {
            logger.warn('No companies or warehouses found. Skipping orders seeder.');
            return;
        }

        // Create warehouse lookup
        const warehousesByCompany = new Map<string, any[]>();
        for (const wh of warehouses) {
            const key = wh.companyId.toString();
            if (!warehousesByCompany.has(key)) {
                warehousesByCompany.set(key, []);
            }
            warehousesByCompany.get(key)!.push(wh);
        }

        const orders: any[] = [];
        // ✅ Generate orders for last 30 days (recent data for testing)
        const months = generateMonthRange(new Date(), true); // recentOnly = true

        let totalProcessed = 0;
        const totalCompanies = companies.length;

        for (const company of companies) {
            const companyWarehouses = warehousesByCompany.get(company._id.toString());
            if (!companyWarehouses || companyWarehouses.length === 0) continue;

            const businessType = getBusinessType(company.name);
            const orderVolumeConfig = SEED_CONFIG.volume.ordersPerCompanyPerMonth[businessType];
            const baseMonthlyOrders = randomInt(orderVolumeConfig.min, orderVolumeConfig.max);

            // Since we're generating daily data now, divide monthly orders by 30
            const dailyOrders = Math.max(1, Math.round(baseMonthlyOrders / 30));

            for (const dayDate of months) {
                const multiplier = getSeasonalMultiplier(dayDate);
                const orderCount = Math.round(dailyOrders * multiplier);

                for (let i = 0; i < orderCount; i++) {
                    // Use the day date directly instead of randomDateInMonth
                    const orderDate = new Date(dayDate);
                    orderDate.setHours(randomInt(9, 18), randomInt(0, 59), randomInt(0, 59));

                    const warehouse = selectRandom(companyWarehouses);

                    const orderData = generateOrderData(company, warehouse, orderDate, businessType);
                    orders.push(orderData);
                }
            }

            totalProcessed++;
            if (totalProcessed % 10 === 0 || totalProcessed === totalCompanies) {
                logger.progress(totalProcessed, totalCompanies, 'Companies');
            }
        }

        // Insert in batches to avoid memory issues
        const batchSize = 1000;
        for (let i = 0; i < orders.length; i += batchSize) {
            const batch = orders.slice(i, i + batchSize);
            await Order.insertMany(batch);
            logger.progress(Math.min(i + batchSize, orders.length), orders.length, 'Orders inserted');
        }

        // Calculate statistics
        const codOrders = orders.filter(o => o.paymentMethod === 'cod').length;
        const prepaidOrders = orders.filter(o => o.paymentMethod === 'prepaid').length;
        const totalValue = orders.reduce((sum, o) => sum + o.totals.total, 0);

        logger.complete('orders', orders.length, timer.elapsed());
        logger.table({
            'Total Orders': orders.length,
            'COD Orders': `${codOrders} (${((codOrders / orders.length) * 100).toFixed(1)}%)`,
            'Prepaid Orders': `${prepaidOrders} (${((prepaidOrders / orders.length) * 100).toFixed(1)}%)`,
            'Total GMV': `₹${(totalValue / 100000).toFixed(2)} Lac`,
            'Avg Order Value': `₹${Math.round(totalValue / orders.length)}`,
        });

    } catch (error) {
        logger.error('Failed to seed orders:', error);
        throw error;
    }
}

/**
 * Get orders for a company
 */
export async function getOrdersForCompany(companyId: mongoose.Types.ObjectId) {
    return Order.find({ companyId, isDeleted: false }).lean();
}

/**
 * Get orders by status
 */
export async function getOrdersByStatus(status: string) {
    return Order.find({ currentStatus: status, isDeleted: false }).lean();
}
