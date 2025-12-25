/**
 * Array Validators
 * 
 * WHY: Prevent unbounded array growth that causes production incidents
 * 
 * Issue: MongoDB documents have a 16MB size limit. Unbounded arrays can:
 * - Cause "document too large" errors
 * - Degrade query performance (scanning 10,000+ items)
 * - Exhaust memory when loading documents
 * - Block database indexes from being effective
 * 
 * Reference: docs/Backend-Fixes-Suggestions.md, Section 4 - Critical: Unbounded Arrays
 * 
 * Example incident scenarios:
 * - Order with 500+ products → query timeout
 * - Shipment webhook firing 1000x → memory exhaustion
 * - Marketing coupon with 100,000 user IDs → 16MB limit breach
 */

/**
 * Creates a validator function that limits array length
 * 
 * @param max - Maximum allowed array length
 * @returns Mongoose validator function
 * 
 * @example
 * products: {
 *   type: [...],
 *   validate: [arrayLimit(200), 'Maximum 200 products per order']
 * }
 */
export function arrayLimit(max: number) {
    return function (val: any[]): boolean {
        return val.length <= max;
    };
}
