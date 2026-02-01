/**
 * Admin Test User - Helper Functions
 * 
 * Shared utility functions for generating test data
 */

const { ObjectId } = require('mongodb');

// Helper functions
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function selectRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - randomInt(0, daysAgo));
    date.setHours(randomInt(9, 20), randomInt(0, 59), randomInt(0, 59));
    return date;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function addHours(date, hours) {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
}

// Product catalog for orders
const PRODUCT_CATALOG = {
    electronics: [
        { name: 'iPhone 15 Pro', sku: 'IP15P-128-BLK', price: 129900, weight: 0.5, category: 'phones' },
        { name: 'Samsung Galaxy S24', sku: 'SGS24-256-WHT', price: 89900, weight: 0.45, category: 'phones' },
        { name: 'MacBook Air M2', sku: 'MBA-M2-256', price: 114900, weight: 1.5, category: 'laptops' },
        { name: 'iPad Air', sku: 'IPAD-AIR5-64', price: 59900, weight: 0.8, category: 'tablets' },
        { name: 'Sony Headphones', sku: 'SONY-WH1000XM5', price: 29990, weight: 0.3, category: 'audio' },
        { name: 'Smart Watch', sku: 'SW-FITBIT', price: 18990, weight: 0.2, category: 'wearables' },
        { name: 'Wireless Earbuds', sku: 'WEB-TWS-001', price: 2499, weight: 0.15, category: 'audio' },
        { name: 'Power Bank 20000mAh', sku: 'PB-20K-BLK', price: 1999, weight: 0.4, category: 'accessories' },
    ],
    fashion: [
        { name: 'Mens Formal Shirt', sku: 'MS-BLU-L', price: 1299, weight: 0.25, category: 'mens' },
        { name: 'Womens Kurti', sku: 'WK-RED-M', price: 899, weight: 0.2, category: 'womens' },
        { name: 'Running Shoes', sku: 'NIKE-RUN-10', price: 5999, weight: 0.6, category: 'footwear' },
        { name: 'Formal Trousers', sku: 'FT-BLK-32', price: 1599, weight: 0.35, category: 'mens' },
        { name: 'Leather Wallet', sku: 'LW-BRN-001', price: 799, weight: 0.1, category: 'accessories' },
        { name: 'Designer Saree', sku: 'DS-SLK-001', price: 4999, weight: 0.4, category: 'womens' },
        { name: 'Casual T-Shirt', sku: 'CT-WHT-M', price: 599, weight: 0.18, category: 'unisex' },
    ],
};

// Indian cities for addresses
const CITIES = [
    { name: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    { name: 'Delhi', state: 'Delhi', pincode: '110001' },
    { name: 'Bangalore', state: 'Karnataka', pincode: '560001' },
    { name: 'Hyderabad', state: 'Telangana', pincode: '500001' },
    { name: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
    { name: 'Kolkata', state: 'West Bengal', pincode: '700001' },
    { name: 'Pune', state: 'Maharashtra', pincode: '411001' },
    { name: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
];

// Customer names
const CUSTOMER_NAMES = [
    'Amit Patel', 'Priya Sharma', 'Rahul Verma', 'Sneha Gupta', 'Vikram Singh',
    'Anjali Reddy', 'Rajesh Kumar', 'Pooja Desai', 'Arjun Nair', 'Kavya Iyer',
    'Suresh Rao', 'Divya Krishnan', 'Karan Mehta', 'Neha Joshi', 'Varun Chopra',
];

// Carriers
const CARRIERS = ['Delhivery', 'Bluedart', 'DTDC', 'Xpressbees', 'Ecom Express'];

module.exports = {
    randomInt,
    randomFloat,
    selectRandom,
    randomDate,
    addDays,
    addHours,
    PRODUCT_CATALOG,
    CITIES,
    CUSTOMER_NAMES,
    CARRIERS,
};
