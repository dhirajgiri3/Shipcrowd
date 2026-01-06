/**
 * Product Catalog
 * 
 * Realistic product data for different business categories.
 */

import { selectRandom, randomInt, randomFloat } from '../utils/random.utils';
import { BusinessType } from '../config';

export interface ProductData {
    name: string;
    sku: string;
    price: number;
    weight: number; // in kg
    category: string;
    hsnCode: string;
}

// Product catalog by business type
export const PRODUCT_CATALOG: Record<BusinessType, ProductData[]> = {
    fashion: [
        { name: 'Cotton Kurti', sku: 'FASH-KUR-001', price: 599, weight: 0.3, category: 'Ethnic Wear', hsnCode: '6204' },
        { name: 'Silk Saree', sku: 'FASH-SAR-001', price: 2499, weight: 0.6, category: 'Ethnic Wear', hsnCode: '6106' },
        { name: 'Designer Saree', sku: 'FASH-SAR-002', price: 4999, weight: 0.8, category: 'Ethnic Wear', hsnCode: '6106' },
        { name: 'Denim Jeans', sku: 'FASH-JNS-001', price: 1299, weight: 0.5, category: 'Western Wear', hsnCode: '6203' },
        { name: 'Formal Shirt', sku: 'FASH-SHT-001', price: 899, weight: 0.3, category: 'Formal Wear', hsnCode: '6205' },
        { name: 'Casual T-Shirt', sku: 'FASH-TSH-001', price: 499, weight: 0.2, category: 'Casual Wear', hsnCode: '6109' },
        { name: 'Party Dress', sku: 'FASH-DRS-001', price: 1899, weight: 0.4, category: 'Western Wear', hsnCode: '6204' },
        { name: 'Ethnic Lehenga', sku: 'FASH-LEH-001', price: 4999, weight: 1.2, category: 'Ethnic Wear', hsnCode: '6104' },
        { name: 'Palazzo Pants', sku: 'FASH-PAL-001', price: 799, weight: 0.35, category: 'Bottom Wear', hsnCode: '6204' },
        { name: 'Anarkali Suit', sku: 'FASH-ANK-001', price: 2299, weight: 0.8, category: 'Ethnic Wear', hsnCode: '6204' },
        { name: 'Cotton Kurta Set', sku: 'FASH-KRT-001', price: 1199, weight: 0.5, category: 'Ethnic Wear', hsnCode: '6204' },
        { name: 'Dupatta', sku: 'FASH-DUP-001', price: 399, weight: 0.2, category: 'Accessories', hsnCode: '6214' },
        { name: 'Formal Trousers', sku: 'FASH-TRS-001', price: 1099, weight: 0.4, category: 'Formal Wear', hsnCode: '6203' },
        { name: 'Sports Track Pants', sku: 'FASH-TRK-001', price: 699, weight: 0.3, category: 'Sportswear', hsnCode: '6211' },
        { name: 'Sleepwear Set', sku: 'FASH-SLP-001', price: 599, weight: 0.3, category: 'Nightwear', hsnCode: '6208' },
    ],
    electronics: [
        { name: 'Bluetooth Headphones', sku: 'ELEC-HDP-001', price: 1999, weight: 0.3, category: 'Audio', hsnCode: '8518' },
        { name: 'Wireless Earbuds', sku: 'ELEC-EBD-001', price: 2999, weight: 0.1, category: 'Audio', hsnCode: '8518' },
        { name: 'Smartphone 64GB', sku: 'ELEC-PHN-001', price: 15999, weight: 0.2, category: 'Mobile', hsnCode: '8517' },
        { name: 'Smartphone 128GB', sku: 'ELEC-PHN-002', price: 22999, weight: 0.22, category: 'Mobile', hsnCode: '8517' },
        { name: 'Laptop 8GB RAM', sku: 'ELEC-LAP-001', price: 45999, weight: 2.5, category: 'Computer', hsnCode: '8471' },
        { name: 'Laptop 16GB RAM', sku: 'ELEC-LAP-002', price: 65999, weight: 2.8, category: 'Computer', hsnCode: '8471' },
        { name: 'Smart Watch', sku: 'ELEC-WCH-001', price: 3999, weight: 0.1, category: 'Wearables', hsnCode: '9102' },
        { name: 'Fitness Band', sku: 'ELEC-FIT-001', price: 1499, weight: 0.05, category: 'Wearables', hsnCode: '9102' },
        { name: 'Wireless Mouse', sku: 'ELEC-MSE-001', price: 599, weight: 0.1, category: 'Accessories', hsnCode: '8471' },
        { name: 'Mechanical Keyboard', sku: 'ELEC-KBD-001', price: 2499, weight: 0.8, category: 'Accessories', hsnCode: '8471' },
        { name: 'Power Bank 10000mAh', sku: 'ELEC-PWR-001', price: 1499, weight: 0.3, category: 'Accessories', hsnCode: '8507' },
        { name: 'Power Bank 20000mAh', sku: 'ELEC-PWR-002', price: 2299, weight: 0.45, category: 'Accessories', hsnCode: '8507' },
        { name: 'USB-C Cable', sku: 'ELEC-CBL-001', price: 299, weight: 0.05, category: 'Cables', hsnCode: '8544' },
        { name: 'Webcam HD', sku: 'ELEC-WEB-001', price: 2999, weight: 0.2, category: 'Computer', hsnCode: '8525' },
        { name: 'Tablet 10 inch', sku: 'ELEC-TAB-001', price: 18999, weight: 0.5, category: 'Mobile', hsnCode: '8471' },
    ],
    b2b: [
        { name: 'Office Stationery Bundle', sku: 'B2B-STA-001', price: 2500, weight: 5.0, category: 'Office Supplies', hsnCode: '4820' },
        { name: 'Industrial Tools Set', sku: 'B2B-TLS-001', price: 15000, weight: 15.0, category: 'Tools', hsnCode: '8205' },
        { name: 'Packaging Material Box', sku: 'B2B-PKG-001', price: 3500, weight: 10.0, category: 'Packaging', hsnCode: '4819' },
        { name: 'Safety Equipment Kit', sku: 'B2B-SFT-001', price: 8500, weight: 8.0, category: 'Safety', hsnCode: '6506' },
        { name: 'Printer Paper Ream (500)', sku: 'B2B-PPR-001', price: 650, weight: 2.5, category: 'Office Supplies', hsnCode: '4802' },
        { name: 'Cleaning Supplies Kit', sku: 'B2B-CLN-001', price: 4500, weight: 12.0, category: 'Cleaning', hsnCode: '3402' },
        { name: 'First Aid Kit Commercial', sku: 'B2B-FAK-001', price: 5500, weight: 3.0, category: 'Safety', hsnCode: '3006' },
        { name: 'LED Tube Lights (Box of 10)', sku: 'B2B-LED-001', price: 3000, weight: 4.0, category: 'Lighting', hsnCode: '9405' },
        { name: 'Plastic Containers Set', sku: 'B2B-CON-001', price: 2800, weight: 6.0, category: 'Storage', hsnCode: '3923' },
        { name: 'Industrial Fan', sku: 'B2B-FAN-001', price: 7500, weight: 8.0, category: 'HVAC', hsnCode: '8414' },
        { name: 'Office Furniture Bundle', sku: 'B2B-FUR-001', price: 35000, weight: 50.0, category: 'Furniture', hsnCode: '9403' },
        { name: 'Electrical Wiring Kit', sku: 'B2B-ELE-001', price: 12000, weight: 15.0, category: 'Electrical', hsnCode: '8544' },
        { name: 'Plumbing Supplies Kit', sku: 'B2B-PLB-001', price: 8000, weight: 20.0, category: 'Plumbing', hsnCode: '3917' },
        { name: 'Safety Gloves (Box of 100)', sku: 'B2B-GLV-001', price: 3500, weight: 5.0, category: 'Safety', hsnCode: '6116' },
        { name: 'Industrial Adhesive Set', sku: 'B2B-ADH-001', price: 4000, weight: 8.0, category: 'Chemicals', hsnCode: '3506' },
    ],
};

/**
 * Get products for a business type
 */
export function getProductsForBusinessType(businessType: BusinessType): ProductData[] {
    return PRODUCT_CATALOG[businessType];
}

/**
 * Generate order products with quantities
 */
export function generateOrderProducts(
    businessType: BusinessType
): Array<ProductData & { quantity: number; dimensions: { length: number; width: number; height: number } }> {
    const catalog = PRODUCT_CATALOG[businessType];

    // Number of products in order varies by business type
    const productCount = businessType === 'b2b'
        ? randomInt(3, 10)
        : randomInt(1, 4);

    const selectedProducts: Array<ProductData & { quantity: number; dimensions: { length: number; width: number; height: number } }> = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < productCount && i < catalog.length; i++) {
        let index: number;
        do {
            index = randomInt(0, catalog.length - 1);
        } while (usedIndices.has(index));
        usedIndices.add(index);

        const product = catalog[index];
        const quantity = businessType === 'b2b'
            ? randomInt(5, 50)
            : randomInt(1, 3);

        selectedProducts.push({
            ...product,
            quantity,
            dimensions: {
                length: randomInt(10, 50),
                width: randomInt(10, 40),
                height: randomInt(5, 30),
            },
        });
    }

    return selectedProducts;
}

/**
 * Calculate total weight for an order
 */
export function calculateOrderWeight(
    products: Array<{ weight: number; quantity: number }>
): number {
    return products.reduce((sum, p) => sum + p.weight * p.quantity, 0);
}

/**
 * Calculate volumetric weight (LxWxH / 5000)
 */
export function calculateVolumetricWeight(
    dimensions: { length: number; width: number; height: number }
): number {
    return (dimensions.length * dimensions.width * dimensions.height) / 5000;
}

/**
 * Get shipping weight (max of actual and volumetric)
 */
export function getShippingWeight(
    actualWeight: number,
    dimensions: { length: number; width: number; height: number }
): number {
    const volumetric = calculateVolumetricWeight(dimensions);
    return Math.max(actualWeight, volumetric);
}

/**
 * Generate a unique SKU
 */
export function generateSKU(businessType: BusinessType, index: number): string {
    const prefix = businessType.toUpperCase().slice(0, 4);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${random}-${index.toString().padStart(3, '0')}`;
}

/**
 * Get GST rate for a product category
 */
export function getGSTRate(hsnCode: string): number {
    // Simplified GST rates based on HSN code first digit
    const firstDigit = hsnCode[0];

    switch (firstDigit) {
        case '0': // Essential items
        case '1':
            return 0; // Exempt
        case '2': // Dairy, vegetables
        case '3': // Chemicals (some)
            return 5;
        case '4': // Paper
        case '5': // Textiles
        case '6': // Apparel
            return 12;
        case '7': // Electronics
        case '8':
        case '9':
        default:
            return 18;
    }
}
