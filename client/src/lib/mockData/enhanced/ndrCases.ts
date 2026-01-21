/**
 * Mock NDR (Non-Delivery Report) Cases Data
 * Realistic Indian e-commerce delivery scenarios
 */

import { subDays, subHours, subMinutes } from 'date-fns';

export interface NDRCase {
    id: string;
    awb: string;
    orderId: string;
    customerName: string;
    customerPhone: string;
    address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        pincode: string;
    };
    status: 'open' | 'in_progress' | 'customer_action' | 'reattempt_scheduled' | 'resolved' | 'escalated' | 'converted_to_rto';
    reason: 'address_incomplete' | 'address_incorrect' | 'consignee_unavailable' | 'refused_to_accept' | 'customer_requested_reschedule' | 'payment_issue' | 'consignee_shifted' | 'out_of_delivery_area' | 'other';
    attempts: number;
    lastAttemptDate: string;
    daysSinceNDR: number;
    slaBreached: boolean;
    slaDaysRemaining: number;
    courierPartner: string;
    deliveryInstructions?: string;
    customerCommunications: number;
    lastCommunicationDate?: string;
    lastCommunicationChannel?: 'sms' | 'email' | 'whatsapp' | 'call';
    rtoRisk: 'low' | 'medium' | 'high';
    orderValue: number;
    codAmount?: number;
    nextAction?: string;
    nextActionDate?: string;
}

const now = new Date();

export const mockNDRCases: NDRCase[] = [
    // SLA Breached - High Priority
    {
        id: 'NDR-001',
        awb: 'VEL8821923',
        orderId: 'ORD-12845',
        customerName: 'Priya Sharma',
        customerPhone: '+91 98765 43210',
        address: {
            line1: 'Flat 304, Sunshine Apartments',
            line2: 'Near City Mall',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001'
        },
        status: 'open',
        reason: 'consignee_unavailable',
        attempts: 3,
        lastAttemptDate: subDays(now, 4).toISOString(),
        daysSinceNDR: 4,
        slaBreached: true,
        slaDaysRemaining: -1,
        courierPartner: 'Delhivery',
        customerCommunications: 6,
        lastCommunicationDate: subHours(now, 12).toISOString(),
        lastCommunicationChannel: 'whatsapp',
        rtoRisk: 'high',
        orderValue: 2499,
        codAmount: 2499
    },
    {
        id: 'NDR-002',
        awb: 'DTD9923441',
        orderId: 'ORD-12844',
        customerName: 'Amit Patel',
        customerPhone: '+91 87654 32109',
        address: {
            line1: 'B-204, Greenwood Society',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560001'
        },
        status: 'customer_action',
        reason: 'address_incomplete',
        attempts: 2,
        lastAttemptDate: subDays(now, 3).toISOString(),
        daysSinceNDR: 3,
        slaBreached: true,
        slaDaysRemaining: -1,
        courierPartner: 'Blue Dart',
        customerCommunications: 4,
        lastCommunicationDate: subHours(now, 8).toISOString(),
        lastCommunicationChannel: 'sms',
        rtoRisk: 'high',
        orderValue: 1899,
        deliveryInstructions: 'Customer provided incomplete address, requested full details'
    },

    // In Progress - Medium Priority
    {
        id: 'NDR-003',
        awb: 'DTDC5544332',
        orderId: 'ORD-12843',
        customerName: 'Rahul Verma',
        customerPhone: '+91 76543 21098',
        address: {
            line1: 'House No. 45, Sector 12',
            line2: 'Near DLF Mall',
            city: 'Gurgaon',
            state: 'Haryana',
            pincode: '122001'
        },
        status: 'in_progress',
        reason: 'customer_requested_reschedule',
        attempts: 1,
        lastAttemptDate: subDays(now, 2).toISOString(),
        daysSinceNDR: 2,
        slaBreached: false,
        slaDaysRemaining: 1,
        courierPartner: 'DTDC',
        customerCommunications: 2,
        lastCommunicationDate: subHours(now, 4).toISOString(),
        lastCommunicationChannel: 'call',
        rtoRisk: 'medium',
        orderValue: 3499,
        nextAction: 'Reattempt Delivery',
        nextActionDate: subDays(now, -1).toISOString() // Tomorrow
    },
    {
        id: 'NDR-004',
        awb: 'ECOM7788990',
        orderId: 'ORD-12842',
        customerName: 'Sneha Reddy',
        customerPhone: '+91 65432 10987',
        address: {
            line1: 'Villa 23, Prestige Layout',
            city: 'Hyderabad',
            state: 'Telangana',
            pincode: '500001'
        },
        status: 'reattempt_scheduled',
        reason: 'consignee_unavailable',
        attempts: 1,
        lastAttemptDate: subDays(now, 1).toISOString(),
        daysSinceNDR: 1,
        slaBreached: false,
        slaDaysRemaining: 2,
        courierPartner: 'Ecom Express',
        customerCommunications: 1,
        lastCommunicationDate: subMinutes(now, 120).toISOString(),
        lastCommunicationChannel: 'whatsapp',
        rtoRisk: 'low',
        orderValue: 899,
        codAmount: 899,
        nextAction: 'Delivery Scheduled',
        nextActionDate: subDays(now, -1).toISOString() // Tomorrow
    },

    // Open - Low Priority
    {
        id: 'NDR-005',
        awb: 'XPB2233445',
        orderId: 'ORD-12841',
        customerName: 'Karan Singh',
        customerPhone: '+91 54321 09876',
        address: {
            line1: '101, Krishna Towers',
            line2: 'MG Road',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411001'
        },
        status: 'open',
        reason: 'address_incorrect',
        attempts: 1,
        lastAttemptDate: subHours(now, 18).toISOString(),
        daysSinceNDR: 1,
        slaBreached: false,
        slaDaysRemaining: 2,
        courierPartner: 'Xpressbees',
        customerCommunications: 1,
        lastCommunicationDate: subHours(now, 16).toISOString(),
        lastCommunicationChannel: 'email',
        rtoRisk: 'low',
        orderValue: 1299
    },
    {
        id: 'NDR-006',
        awb: 'SHD4455667',
        orderId: 'ORD-12840',
        customerName: 'Anjali Desai',
        customerPhone: '+91 43210 98765',
        address: {
            line1: 'Shop 12, Lajpat Nagar Market',
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110024'
        },
        status: 'open',
        reason: 'refused_to_accept',
        attempts: 1,
        lastAttemptDate: subHours(now, 12).toISOString(),
        daysSinceNDR: 0,
        slaBreached: false,
        slaDaysRemaining: 3,
        courierPartner: 'Shadowfax',
        customerCommunications: 0,
        rtoRisk: 'medium',
        orderValue: 599,
        codAmount: 599,
        deliveryInstructions: 'Customer refused citing quality concerns'
    },

    // Escalated
    {
        id: 'NDR-007',
        awb: 'DEL5566778',
        orderId: 'ORD-12839',
        customerName: 'Vikram Malhotra',
        customerPhone: '+91 32109 87654',
        address: {
            line1: 'Tower C, 1502, DLF Cyber City',
            city: 'Gurgaon',
            state: 'Haryana',
            pincode: '122002'
        },
        status: 'escalated',
        reason: 'out_of_delivery_area',
        attempts: 2,
        lastAttemptDate: subDays(now, 5).toISOString(),
        daysSinceNDR: 5,
        slaBreached: true,
        slaDaysRemaining: -2,
        courierPartner: 'Delhivery',
        customerCommunications: 8,
        lastCommunicationDate: subHours(now, 2).toISOString(),
        lastCommunicationChannel: 'call',
        rtoRisk: 'high',
        orderValue: 4999
    },

    // Resolved
    {
        id: 'NDR-008',
        awb: 'BDT8899001',
        orderId: 'ORD-12838',
        customerName: 'Meera Joshi',
        customerPhone: '+91 21098 76543',
        address: {
            line1: 'Flat 501, Ocean View Apartments',
            line2: 'Marine Drive',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400002'
        },
        status: 'resolved',
        reason: 'consignee_unavailable',
        attempts: 2,
        lastAttemptDate: subDays(now, 6).toISOString(),
        daysSinceNDR: 6,
        slaBreached: false,
        slaDaysRemaining: 0,
        courierPartner: 'Blue Dart',
        customerCommunications: 3,
        lastCommunicationDate: subDays(now, 5).toISOString(),
        lastCommunicationChannel: 'whatsapp',
        rtoRisk: 'low',
        orderValue: 1599,
        codAmount: 1599
    }
];

// Mock NDR Metrics
export const mockNDRMetrics = {
    open: 3,
    inProgress: 2,
    slaBreach: 3,
    resolutionRate: 0.67, // 67%
    totalCases: 8,
    resolved: 1,
    escalated: 1,
    avgResolutionTime: 2.5, // days
    rtoConversionRate: 0.12 // 12%
};

// Mock NDR Reason Distribution
export const mockNDRReasonDistribution = [
    { reason: 'Consignee Unavailable', count: 3, percentage: 37.5 },
    { reason: 'Address Incomplete', count: 1, percentage: 12.5 },
    { reason: 'Address Incorrect', count: 1, percentage: 12.5 },
    { reason: 'Refused to Accept', count: 1, percentage: 12.5 },
    { reason: 'Customer Reschedule', count: 1, percentage: 12.5 },
    { reason: 'Out of Delivery Area', count: 1, percentage: 12.5 }
];
