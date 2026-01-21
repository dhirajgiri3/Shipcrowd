/**
 * Generate Orders for Admin Test User
 */

const { ObjectId } = require('mongodb');
const {
    randomInt,
    randomFloat,
    selectRandom,
    randomDate,
    addDays,
    PRODUCT_CATALOG,
    CITIES,
    CUSTOMER_NAMES,
} = require('./helpers');

function generateOrders(companyId, warehouseIds, count = 300) {
    const orders = [];
    const allProducts = [...PRODUCT_CATALOG.electronics, ...PRODUCT_CATALOG.fashion];

    for (let i = 1; i <= count; i++) {
        const orderDate = randomDate(365); // Spread over last 12 months
        const paymentMethod = Math.random() < 0.45 ? 'prepaid' : 'cod';
        const customerCity = selectRandom(CITIES);

        // Select 1-3 products
        const itemCount = randomInt(1, 3);
        const selectedProducts = [];
        for (let j = 0; j < itemCount; j++) {
            selectedProducts.push(selectRandom(allProducts));
        }

        const subtotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
        const tax = Math.round(subtotal * 0.18);
        const shippingCost = randomInt(50, 150);
        const discount = subtotal > 50000 ? Math.round(subtotal * 0.1) : 0;
        const total = subtotal + tax + shippingCost - discount;

        const order = {
            _id: new ObjectId(),
            orderNumber: `ADMIN-2025${String(i).padStart(4, '0')}`,
            companyId: companyId,
            customerInfo: {
                name: selectRandom(CUSTOMER_NAMES),
                email: `customer${i}@example.com`,
                phone: `+91-${randomInt(7000000000, 9999999999)}`,
                address: {
                    line1: `${randomInt(1, 999)} ${selectRandom(['MG Road', 'Park Street', 'Main Road'])}`,
                    city: customerCity.name,
                    state: customerCity.state,
                    country: 'India',
                    postalCode: customerCity.pincode,
                },
            },
            products: selectedProducts.map(p => ({
                name: p.name,
                sku: p.sku,
                quantity: 1,
                price: p.price,
                weight: p.weight,
            })),
            shippingDetails: {
                shippingCost: shippingCost,
            },
            paymentStatus: paymentMethod === 'prepaid' ? 'paid' : (Math.random() < 0.9 ? 'paid' : 'pending'),
            paymentMethod: paymentMethod,
            source: selectRandom(['manual', 'shopify', 'api']),
            warehouseId: selectRandom(warehouseIds),
            statusHistory: [{
                status: 'pending',
                timestamp: orderDate,
                comment: 'Order placed',
            }],
            currentStatus: 'pending',
            totals: {
                subtotal: subtotal,
                tax: tax,
                shipping: shippingCost,
                discount: discount,
                total: total,
            },
            isDeleted: false,
            createdAt: orderDate,
            updatedAt: orderDate,
        };

        orders.push(order);
    }

    return orders;
}

module.exports = { generateOrders };
