import { Shipment, Order, Company, User, CourierName, Status } from '@/types/admin';

// Deterministic generic data helpers
const couriers: CourierName[] = ['Delhivery', 'Xpressbees', 'DTDC', 'Bluedart', 'EcomExpress'];
const cities = [
    { city: 'Mumbai', state: 'Maharashtra' },
    { city: 'Delhi', state: 'Delhi' },
    { city: 'Bangalore', state: 'Karnataka' },
    { city: 'Chennai', state: 'Tamil Nadu' },
    { city: 'Hyderabad', state: 'Telangana' },
    { city: 'Pune', state: 'Maharashtra' },
    { city: 'Ahmedabad', state: 'Gujarat' },
    { city: 'Kolkata', state: 'West Bengal' },
    { city: 'Jaipur', state: 'Rajasthan' },
    { city: 'Lucknow', state: 'Uttar Pradesh' },
];

const customerNames = [
    'Aarav Patel', 'Vihaan Sharma', 'Aditya Verma', 'Sai Kumar', 'Reyansh Gupta',
    'Ananya Singh', 'Diya Rao', 'Isha Mehta', 'Saanvi Reddy', 'Myra Malhotra',
    'Arjun Nair', 'Rohan Das', 'Kabir Joshi', 'Ishaan Choudhury', 'Vivaan Jain'
];

const statuses: Status[] = ['delivered', 'in-transit', 'pending', 'ndr', 'rto', 'cancelled'];

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - getRandomInt(0, daysAgo));
    return date.toISOString();
};

export const generateShipments = (count: number): Shipment[] => {
    return Array.from({ length: count }).map((_, i) => {
        const origin = getRandomElement(cities);
        let destination = getRandomElement(cities);
        while (destination.city === origin.city) destination = getRandomElement(cities);

        return {
            id: `SHP-${getRandomInt(10000, 99999)}`,
            awb: `AWB${getRandomInt(100000000, 999999999)}`,
            orderNumber: `ORD-${Date.now()}-${i}`,
            customer: {
                name: getRandomElement(customerNames),
                phone: `+91 ${getRandomInt(60000, 99999)} ${getRandomInt(10000, 99999)}`,
                email: `customer${i}@example.com`,
            },
            courier: getRandomElement(couriers),
            status: getRandomElement(statuses),
            origin: { ...origin, line1: `${getRandomInt(1, 100)}, Market Road`, pincode: `${getRandomInt(110000, 800000)}` },
            destination: { ...destination, line1: `${getRandomInt(1, 100)}, Residency Park`, pincode: `${getRandomInt(110000, 800000)}` },
            weight: parseFloat((Math.random() * 5).toFixed(1)),
            codAmount: getRandomInt(500, 5000),
            paymentMode: Math.random() > 0.4 ? 'cod' : 'prepaid',
            createdAt: getRandomDate(7),
        };
    });
};

export const generateOrders = (count: number): Order[] => {
    return Array.from({ length: count }).map((_, i) => {
        const isPaid = Math.random() > 0.3;
        return {
            id: `ORD-${getRandomInt(100000, 999999)}`,
            customer: {
                name: getRandomElement(customerNames),
                phone: `+91 ${getRandomInt(7000000000, 9999999999)}`,
                email: `user${i}@mail.com`
            },
            productName: getRandomElement(['Wireless Keybaord', 'Gaming Mouse', 'monitor Stand', 'USB-C Hub', 'Laptop Sleeve', 'Webcam']),
            quantity: getRandomInt(1, 3),
            amount: getRandomInt(499, 15000),
            paymentStatus: isPaid ? 'paid' : (Math.random() > 0.5 ? 'pending' : 'failed'),
            shipmentStatus: isPaid ? (Math.random() > 0.5 ? 'shipped' : 'unshipped') : 'unshipped',
            createdAt: getRandomDate(10)
        }
    })
}

export const generateCompanies = (count: number): Company[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `COMP-${getRandomInt(100, 999)}`,
        name: `${getRandomElement(['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega'])} Logistics ${i + 1}`,
        tier: getRandomElement(['Starter', 'Growth', 'Enterprise']),
        walletBalance: getRandomInt(100, 50000),
        activeUsers: getRandomInt(1, 50),
        totalOrders: getRandomInt(50, 5000),
        status: Math.random() > 0.1 ? 'active' : 'inactive',
    }));
};

export const MOCK_SHIPMENTS = generateShipments(25);
export const MOCK_ORDERS = generateOrders(20);
export const MOCK_COMPANIES = generateCompanies(10);

// --- AI & PREDICTION MOCK DATA ---
export const MOCK_PREDICTIONS = [
    { date: '2023-12-10', actual: 140, predicted: 145, confidence: 95 },
    { date: '2023-12-11', actual: 155, predicted: 150, confidence: 92 },
    { date: '2023-12-12', actual: 165, predicted: 160, confidence: 94 },
    { date: '2023-12-13', actual: null, predicted: 175, confidence: 88 },
    { date: '2023-12-14', actual: null, predicted: 180, confidence: 85 },
    { date: '2023-12-15', actual: null, predicted: 160, confidence: 90 },
    { date: '2023-12-16', actual: null, predicted: 150, confidence: 92 },
];

export const MOCK_ANOMALIES = [
    { id: 'ANM-001', type: 'Delay Risk', message: 'Shipment #SHP-8821 predicted to be delayed by 2 days due to weather in Delhi.', severity: 'high', timestamp: '10 mins ago' },
    { id: 'ANM-002', type: 'Cost Spike', message: 'Average shipping cost for "South Zone" increased by 12% this week.', severity: 'medium', timestamp: '2 hours ago' },
    { id: 'ANM-003', type: 'RTO Warning', message: 'High RTO probability detected for Order #ORD-9921 (Customer rejected previous 2 orders).', severity: 'critical', timestamp: '5 hours ago' },
    { id: 'ANM-004', type: 'Courier Performance', message: 'DTDC success rate dropped below 80% in Mumbai region.', severity: 'medium', timestamp: '1 day ago' },
];

export const MOCK_AI_INSIGHTS = [
    { title: 'Optimization Opportunity', description: 'Switching 15% of shipments to "EcomExpress" for North Zone can save ₹4,500 this week.', impact: 'High', action: 'Apply Recommendation' },
    { title: 'Inventory Alert', description: 'Stock for "Wireless Earbuds" is predicted to run out in 4 days based on current demand.', impact: 'Medium', action: 'View Inventory' },
    { title: 'Customer Sentiment', description: 'Positive feedback trend detected for "Fast Delivery" mentions.', impact: 'Low', action: 'Read Reviews' },
];

// --- WAREHOUSE MOCK DATA ---
export const MOCK_WAREHOUSES = [
    { id: 'WH-001', name: 'Delhi Central Hub', location: 'Okhla Phase III, New Delhi', capacity: 10000, utilized: 8500, status: 'Active', manager: 'Rajesh Kumar' },
    { id: 'WH-002', name: 'Mumbai Fulfillment Ctr', location: 'Bhiwandi, Mumbai', capacity: 15000, utilized: 12100, status: 'Active', manager: 'Amit Patil' },
    { id: 'WH-003', name: 'Bangalore East', location: 'Whitefield, Bangalore', capacity: 8000, utilized: 3200, status: 'Active', manager: 'Sneha Reddy' },
    { id: 'WH-004', name: 'Kolkata Depot', location: 'Salt Lake, Kolkata', capacity: 5000, utilized: 0, status: 'Inactive', manager: 'Vikram Das' },
];

export const MOCK_INVENTORY = [
    { sku: 'SKU-001', name: 'Wireless Earbuds', quantity: 450, warehouse: 'Delhi Central Hub', status: 'In Stock' },
    { sku: 'SKU-002', name: 'Smart Watch Gen 5', quantity: 120, warehouse: 'Mumbai Fulfillment Ctr', status: 'Low Stock' },
    { sku: 'SKU-003', name: 'Laptop Stand', quantity: 0, warehouse: 'Bangalore East', status: 'Out of Stock' },
    { sku: 'SKU-004', name: 'USB-C Cable', quantity: 850, warehouse: 'Delhi Central Hub', status: 'In Stock' },
    { sku: 'SKU-005', name: 'Bluetooth Speaker', quantity: 35, warehouse: 'Mumbai Fulfillment Ctr', status: 'Low Stock' },
];

