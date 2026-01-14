import { Shipment, Order, Company, Status } from '@/src/types/admin';

// --- SHIPMENT MOCK DATA ---
export const MOCK_SHIPMENTS: Shipment[] = [
    {
        id: 'SHP-88214',
        awb: 'AWB982374123',
        orderNumber: 'ORD-1709821-0',
        customer: {
            name: 'Aarav Patel',
            phone: '+91 98765 43210',
            email: 'aarav.patel@example.com',
        },
        courier: 'Delhivery',
        status: 'delivered',
        origin: { city: 'Mumbai', state: 'Maharashtra', line1: '42, Market Road', pincode: '400001' },
        destination: { city: 'Delhi', state: 'Delhi', line1: '12, Residency Park', pincode: '110001' },
        weight: 1.2,
        codAmount: 1250,
        paymentMode: 'prepaid',
        createdAt: '2024-03-10T10:00:00Z',
    },
    {
        id: 'SHP-99215',
        awb: 'AWB982374124',
        orderNumber: 'ORD-1709821-1',
        customer: {
            name: 'Vihaan Sharma',
            phone: '+91 98765 43211',
            email: 'vihaan.sharma@example.com',
        },
        courier: 'Xpressbees',
        status: 'in-transit',
        origin: { city: 'Bangalore', state: 'Karnataka', line1: '88, Tech Park', pincode: '560001' },
        destination: { city: 'Hyderabad', state: 'Telangana', line1: '34, Jubilee Hills', pincode: '500033' },
        weight: 2.5,
        codAmount: 3400,
        paymentMode: 'cod',
        createdAt: '2024-03-12T14:30:00Z',
    },
    {
        id: 'SHP-77326',
        awb: 'AWB982374125',
        orderNumber: 'ORD-1709821-2',
        customer: {
            name: 'Aditya Verma',
            phone: '+91 98765 43212',
            email: 'aditya.verma@example.com',
        },
        courier: 'DTDC',
        status: 'pending',
        origin: { city: 'Delhi', state: 'Delhi', line1: '55, Connaught Place', pincode: '110001' },
        destination: { city: 'Mumbai', state: 'Maharashtra', line1: '99, Bandra West', pincode: '400050' },
        weight: 0.8,
        codAmount: 800,
        paymentMode: 'prepaid',
        createdAt: '2024-03-14T09:15:00Z',
    },
    {
        id: 'SHP-66437',
        awb: 'AWB982374126',
        orderNumber: 'ORD-1709821-3',
        customer: {
            name: 'Sai Kumar',
            phone: '+91 98765 43213',
            email: 'sai.kumar@example.com',
        },
        courier: 'Bluedart',
        status: 'delivered',
        origin: { city: 'Chennai', state: 'Tamil Nadu', line1: '23, Anna Salai', pincode: '600002' },
        destination: { city: 'Kolkata', state: 'West Bengal', line1: '45, Park Street', pincode: '700016' },
        weight: 3.1,
        codAmount: 4500,
        paymentMode: 'cod',
        createdAt: '2024-03-08T11:45:00Z',
    },
    {
        id: 'SHP-55548',
        awb: 'AWB982374127',
        orderNumber: 'ORD-1709821-4',
        customer: {
            name: 'Ananya Singh',
            phone: '+91 98765 43214',
            email: 'ananya.singh@example.com',
        },
        courier: 'EcomExpress',
        status: 'rto',
        origin: { city: 'Pune', state: 'Maharashtra', line1: '12, Koregaon Park', pincode: '411001' },
        destination: { city: 'Ahmedabad', state: 'Gujarat', line1: '67, CG Road', pincode: '380009' },
        weight: 1.5,
        codAmount: 1200,
        paymentMode: 'cod',
        createdAt: '2024-03-11T16:20:00Z',
    },
    {
        id: 'SHP-44659',
        awb: 'AWB982374128',
        orderNumber: 'ORD-1709821-5',
        customer: {
            name: 'Diya Rao',
            phone: '+91 98765 43215',
            email: 'diya.rao@example.com',
        },
        courier: 'Delhivery',
        status: 'ndr',
        origin: { city: 'Hyderabad', state: 'Telangana', line1: '89, Banjara Hills', pincode: '500034' },
        destination: { city: 'Bangalore', state: 'Karnataka', line1: '12, Indiranagar', pincode: '560038' },
        weight: 0.5,
        codAmount: 600,
        paymentMode: 'prepaid',
        createdAt: '2024-03-13T13:10:00Z',
    },
    {
        id: 'SHP-33760',
        awb: 'AWB982374129',
        orderNumber: 'ORD-1709821-6',
        customer: {
            name: 'Isha Mehta',
            phone: '+91 98765 43216',
            email: 'isha.mehta@example.com',
        },
        courier: 'Xpressbees',
        status: 'in-transit',
        origin: { city: 'Jaipur', state: 'Rajasthan', line1: '34, MI Road', pincode: '302001' },
        destination: { city: 'Lucknow', state: 'Uttar Pradesh', line1: '56, Hazratganj', pincode: '226001' },
        weight: 4.2,
        codAmount: 5200,
        paymentMode: 'cod',
        createdAt: '2024-03-15T08:00:00Z',
    },
    {
        id: 'SHP-22871',
        awb: 'AWB982374130',
        orderNumber: 'ORD-1709821-7',
        customer: {
            name: 'Arjun Nair',
            phone: '+91 98765 43217',
            email: 'arjun.nair@example.com',
        },
        courier: 'DTDC',
        status: 'delivered',
        origin: { city: 'Kolkata', state: 'West Bengal', line1: '78, Salt Lake', pincode: '700091' },
        destination: { city: 'Mumbai', state: 'Maharashtra', line1: '23, Andheri East', pincode: '400069' },
        weight: 2.0,
        codAmount: 2100,
        paymentMode: 'prepaid',
        createdAt: '2024-03-09T15:40:00Z',
    }
];

// --- ORDER MOCK DATA ---
export const MOCK_ORDERS: Order[] = [
    {
        id: 'ORD-1001',
        customer: { name: 'Aarav Patel', phone: '+91 98765 43210', email: 'aarav@example.com' },
        productName: 'Wireless Keyboard',
        quantity: 1,
        amount: 3499,
        paymentStatus: 'paid',
        shipmentStatus: 'shipped',
        createdAt: '2024-03-10T10:00:00Z'
    },
    {
        id: 'ORD-1002',
        customer: { name: 'Vihaan Sharma', phone: '+91 98765 43211', email: 'vihaan@example.com' },
        productName: 'Gaming Mouse',
        quantity: 2,
        amount: 2599,
        paymentStatus: 'pending',
        shipmentStatus: 'unshipped',
        createdAt: '2024-03-12T14:30:00Z'
    },
    {
        id: 'ORD-1003',
        customer: { name: 'Aditya Verma', phone: '+91 98765 43212', email: 'aditya@example.com' },
        productName: 'Monitor Stand',
        quantity: 1,
        amount: 1299,
        paymentStatus: 'paid',
        shipmentStatus: 'shipped',
        createdAt: '2024-03-14T09:15:00Z'
    },
    {
        id: 'ORD-1004',
        customer: { name: 'Sai Kumar', phone: '+91 98765 43213', email: 'sai@example.com' },
        productName: 'USB-C Hub',
        quantity: 3,
        amount: 4500,
        paymentStatus: 'failed',
        shipmentStatus: 'unshipped',
        createdAt: '2024-03-15T11:20:00Z'
    }
];

// --- COMPANY MOCK DATA ---
export const MOCK_COMPANIES: Company[] = [
    {
        id: 'COMP-001',
        name: 'Alpha Logistics',
        tier: 'Enterprise',
        walletBalance: 45000,
        activeUsers: 42,
        totalOrders: 3500,
        status: 'active',
    },
    {
        id: 'COMP-002',
        name: 'Beta Transport',
        tier: 'Growth',
        walletBalance: 12500,
        activeUsers: 15,
        totalOrders: 1200,
        status: 'active',
    },
    {
        id: 'COMP-003',
        name: 'Gamma Express',
        tier: 'Starter',
        walletBalance: 2500,
        activeUsers: 4,
        totalOrders: 350,
        status: 'inactive',
    }
];

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
