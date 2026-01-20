/**
 * Order Data - Realistic Indian shipping scenarios
 * Psychology: Real-world context for better decision making
 */

import { getRandomIndianName, getRandomCity, getRandomPincode, getRandomProduct, getRandomCourier } from './indianData';

export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'pickup_scheduled'
    | 'picked_up'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'rto_initiated'
    | 'rto_in_transit'
    | 'rto_delivered'
    | 'cancelled';

export type PaymentMode = 'COD' | 'Prepaid';

export interface OrderAddress {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
}

export interface Order {
    id: string;
    orderId: string; // Customer-facing order ID
    awb?: string; // Airway Bill number
    status: OrderStatus;
    paymentMode: PaymentMode;
    orderValue: number;
    codAmount?: number;
    shippingCharge: number;
    weight: number; // in kg
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    product: {
        name: string;
        category: string;
        quantity: number;
        sku?: string;
    };
    customer: OrderAddress;
    pickup: OrderAddress;
    courier: {
        name: string;
        serviceType: 'Express' | 'Standard' | 'Surface';
    };
    zone: 'A' | 'B' | 'C' | 'D' | 'E';
    estimatedDelivery?: string;
    actualDelivery?: string;
    timeline: {
        ordered: string;
        confirmed?: string;
        pickupScheduled?: string;
        pickedUp?: string;
        inTransit?: string;
        outForDelivery?: string;
        delivered?: string;
        rtoInitiated?: string;
        rtoDelivered?: string;
    };
    priority: 'urgent' | 'normal' | 'low';
    tags?: string[];
    notes?: string;
    rtoReason?: string;
    attempts?: number;
}

// Generate realistic order data
export function generateOrder(overrides?: Partial<Order>): Order {
    const customerCity = getRandomCity();
    const pickupCity = getRandomCity();
    const customerName = getRandomIndianName();
    const product = getRandomProduct();
    const courier = getRandomCourier();
    const paymentMode: PaymentMode = Math.random() < 0.65 ? 'COD' : 'Prepaid'; // 65% COD

    const orderValue = Math.floor(Math.random() * 3000) + 500; // ₹500-₹3500
    const weight = Math.random() < 0.7 ? 0.5 : Math.random() < 0.9 ? 1 : 2; // Most orders 0.5kg

    // Calculate zone based on cities
    const zones: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
    const zone = zones[Math.floor(Math.random() * zones.length)];

    // Calculate shipping charge based on zone and weight
    const baseRates = { A: 40, B: 60, C: 80, D: 100, E: 120 };
    const shippingCharge = baseRates[zone] + (weight > 0.5 ? (weight - 0.5) * 20 : 0);

    const now = new Date();
    const orderedDate = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    const statuses: OrderStatus[] = [
        'pending', 'confirmed', 'pickup_scheduled', 'picked_up',
        'in_transit', 'out_for_delivery', 'delivered'
    ];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const order: Order = {
        id: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
        orderId: `#${Math.floor(Math.random() * 90000) + 10000}`,
        awb: status !== 'pending' && status !== 'confirmed' ? `AWB${Math.random().toString().slice(2, 14)}` : undefined,
        status,
        paymentMode,
        orderValue,
        codAmount: paymentMode === 'COD' ? orderValue : undefined,
        shippingCharge,
        weight,
        dimensions: {
            length: 20,
            width: 15,
            height: 10
        },
        product: {
            name: product,
            category: 'Fashion',
            quantity: 1,
            sku: `SKU${Math.floor(Math.random() * 10000)}`
        },
        customer: {
            name: customerName.fullName,
            phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
            addressLine1: `${Math.floor(Math.random() * 500) + 1}, ${['MG Road', 'Park Street', 'Main Road', 'Station Road'][Math.floor(Math.random() * 4)]}`,
            addressLine2: `${['Sector', 'Block', 'Phase'][Math.floor(Math.random() * 3)]} ${Math.floor(Math.random() * 50) + 1}`,
            city: customerCity.name,
            state: customerCity.state,
            pincode: getRandomPincode(),
            landmark: ['Near Metro Station', 'Opposite Mall', 'Behind Temple'][Math.floor(Math.random() * 3)]
        },
        pickup: {
            name: 'ShipCrowd Warehouse',
            phone: '+91 9876543210',
            addressLine1: 'Plot 45, Industrial Area',
            city: pickupCity.name,
            state: pickupCity.state,
            pincode: getRandomPincode()
        },
        courier: {
            name: courier,
            serviceType: Math.random() < 0.6 ? 'Express' : Math.random() < 0.8 ? 'Standard' : 'Surface'
        },
        zone,
        estimatedDelivery: new Date(orderedDate.getTime() + (zone === 'A' ? 2 : zone === 'B' ? 3 : 4) * 24 * 60 * 60 * 1000).toISOString(),
        timeline: {
            ordered: orderedDate.toISOString(),
            confirmed: status !== 'pending' ? new Date(orderedDate.getTime() + 2 * 60 * 60 * 1000).toISOString() : undefined,
            pickupScheduled: ['pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(status)
                ? new Date(orderedDate.getTime() + 4 * 60 * 60 * 1000).toISOString() : undefined,
            pickedUp: ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'].includes(status)
                ? new Date(orderedDate.getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined,
            inTransit: ['in_transit', 'out_for_delivery', 'delivered'].includes(status)
                ? new Date(orderedDate.getTime() + 48 * 60 * 60 * 1000).toISOString() : undefined,
            outForDelivery: ['out_for_delivery', 'delivered'].includes(status)
                ? new Date(orderedDate.getTime() + 72 * 60 * 60 * 1000).toISOString() : undefined,
            delivered: status === 'delivered'
                ? new Date(orderedDate.getTime() + 96 * 60 * 60 * 1000).toISOString() : undefined
        },
        priority: status === 'pending' || status === 'confirmed' ? 'urgent' : 'normal',
        tags: paymentMode === 'COD' ? ['COD'] : [],
        ...overrides
    };

    return order;
}

// Predefined realistic orders with specific scenarios
export const mockOrders: Order[] = [
    // Urgent - Pending pickup
    {
        ...generateOrder(),
        id: 'ORD001',
        orderId: '#45892',
        status: 'confirmed',
        priority: 'urgent',
        paymentMode: 'COD',
        orderValue: 1250,
        codAmount: 1250,
        timeline: {
            ordered: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            confirmed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        tags: ['COD', 'Urgent'],
        notes: 'Customer requested urgent delivery'
    },

    // In transit - Normal
    {
        ...generateOrder(),
        id: 'ORD002',
        orderId: '#45891',
        awb: 'AWB1234567890123',
        status: 'in_transit',
        priority: 'normal',
        paymentMode: 'Prepaid',
        orderValue: 2100,
        courier: {
            name: 'Delhivery',
            serviceType: 'Express'
        },
        timeline: {
            ordered: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            confirmed: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
            pickupScheduled: new Date(Date.now() - 44 * 60 * 60 * 1000).toISOString(),
            pickedUp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            inTransit: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        }
    },

    // Out for delivery - High value COD
    {
        ...generateOrder(),
        id: 'ORD003',
        orderId: '#45890',
        awb: 'AWB9876543210987',
        status: 'out_for_delivery',
        priority: 'urgent',
        paymentMode: 'COD',
        orderValue: 3400,
        codAmount: 3400,
        courier: {
            name: 'BlueDart',
            serviceType: 'Express'
        },
        timeline: {
            ordered: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
            confirmed: new Date(Date.now() - 70 * 60 * 60 * 1000).toISOString(),
            pickupScheduled: new Date(Date.now() - 68 * 60 * 60 * 1000).toISOString(),
            pickedUp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            inTransit: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            outForDelivery: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        tags: ['COD', 'High Value'],
        attempts: 1
    },

    // RTO - Customer refused
    {
        ...generateOrder(),
        id: 'ORD004',
        orderId: '#45880',
        awb: 'AWB1122334455667',
        status: 'rto_initiated',
        priority: 'normal',
        paymentMode: 'COD',
        orderValue: 850,
        codAmount: 850,
        courier: {
            name: 'DTDC',
            serviceType: 'Standard'
        },
        timeline: {
            ordered: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
            confirmed: new Date(Date.now() - 118 * 60 * 60 * 1000).toISOString(),
            pickupScheduled: new Date(Date.now() - 116 * 60 * 60 * 1000).toISOString(),
            pickedUp: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
            inTransit: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
            outForDelivery: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            rtoInitiated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        rtoReason: 'Customer refused to accept',
        attempts: 3,
        tags: ['COD', 'RTO']
    },

    // Delivered successfully
    {
        ...generateOrder(),
        id: 'ORD005',
        orderId: '#45870',
        awb: 'AWB7788990011223',
        status: 'delivered',
        priority: 'normal',
        paymentMode: 'Prepaid',
        orderValue: 1800,
        courier: {
            name: 'Ecom Express',
            serviceType: 'Express'
        },
        timeline: {
            ordered: new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString(),
            confirmed: new Date(Date.now() - 166 * 60 * 60 * 1000).toISOString(),
            pickupScheduled: new Date(Date.now() - 164 * 60 * 60 * 1000).toISOString(),
            pickedUp: new Date(Date.now() - 144 * 60 * 60 * 1000).toISOString(),
            inTransit: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
            outForDelivery: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
            delivered: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
        },
        actualDelivery: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    }
];

// Generate bulk orders
export function generateBulkOrders(count: number): Order[] {
    return Array.from({ length: count }, () => generateOrder());
}

// Helper functions
export function getOrdersByStatus(status: OrderStatus): Order[] {
    return mockOrders.filter(order => order.status === status);
}

export function getOrdersByPaymentMode(mode: PaymentMode): Order[] {
    return mockOrders.filter(order => order.paymentMode === mode);
}

export function getUrgentOrders(): Order[] {
    return mockOrders.filter(order => order.priority === 'urgent');
}

export function getPendingPickups(): Order[] {
    return mockOrders.filter(order =>
        order.status === 'confirmed' || order.status === 'pickup_scheduled'
    );
}

export function getActiveOrders(): Order[] {
    return mockOrders.filter(order =>
        !['delivered', 'rto_delivered', 'cancelled'].includes(order.status)
    );
}

export function getRTOOrders(): Order[] {
    return mockOrders.filter(order =>
        order.status === 'rto_initiated' || order.status === 'rto_in_transit'
    );
}
