export type Status = 'delivered' | 'in-transit' | 'pending' | 'ndr' | 'rto' | 'cancelled';
export type PaymentMode = 'cod' | 'prepaid';
export type AdminCourierName = 'Delhivery' | 'Xpressbees' | 'DTDC' | 'Bluedart' | 'EcomExpress';

export interface AdminCustomer {
    name: string;
    phone: string;
    email: string;
}

export interface AdminAddress {
    line1: string;
    city: string;
    state: string;
    pincode: string;
}

export interface Shipment {
    id: string;
    awb: string;
    orderNumber: string;
    customer: AdminCustomer;
    courier: AdminCourierName;
    status: Status;
    origin: AdminAddress;
    destination: AdminAddress;
    weight: number;
    codAmount: number;
    paymentMode: PaymentMode;
    createdAt: string; // ISO date string
    estimatedDelivery?: string;
    deliveredAt?: string;
}

export interface AdminOrder {
    id: string;
    adminCustomer: AdminCustomer;
    productName: string;
    quantity: number;
    amount: number;
    paymentStatus: 'paid' | 'pending' | 'failed';
    shipmentStatus: 'unshipped' | 'shipped' | 'delivered';
    createdAt: string;
}

export interface Company {
    id: string;
    name: string;
    tier: 'Starter' | 'Growth' | 'Enterprise';
    walletBalance: number;
    activeUsers: number;
    totalOrders: number;
    status: 'active' | 'inactive';
}

export interface MetricCardData {
    title: string;
    value: string;
    change: number;
    trend: 'up' | 'down' | 'neutral';
    icon: any; // Lucide icon component type
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'ops' | 'finance' | 'support';
    lastActive: string;
    status: 'active' | 'suspended';
}
