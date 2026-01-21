/**
 * Mock Wallet Transaction Data
 * Realistic Indian seller wallet transaction history
 */

import { type Transaction } from '@/src/components/seller/wallet';
import { subDays, subHours, subMinutes } from 'date-fns';

// Re-export Transaction type for convenience
export type { Transaction };

const now = new Date();

// Generate realistic running balances
let runningBalance = 45820; // Current balance

export const mockTransactions: Transaction[] = [
    // Today
    {
        id: 'TXN-2024-0125',
        type: 'debit',
        amount: 342,
        category: 'order',
        description: 'Shipped order to Mumbai',
        context: {
            orderId: 'ORD-12845',
            awb: 'VEL8821923',
            customerName: 'Priya Sharma'
        },
        timestamp: subMinutes(now, 15).toISOString(),
        runningBalance
    },
    {
        id: 'TXN-2024-0124',
        type: 'debit',
        amount: 287,
        category: 'order',
        description: 'Shipped order to Bangalore',
        context: {
            orderId: 'ORD-12844',
            awb: 'DTD9923441',
            customerName: 'Amit Patel'
        },
        timestamp: subHours(now, 2).toISOString(),
        runningBalance: (runningBalance += 342)
    },
    {
        id: 'TXN-2024-0123',
        type: 'credit',
        amount: 5000,
        category: 'recharge',
        description: 'Wallet recharge via UPI',
        timestamp: subHours(now, 4).toISOString(),
        runningBalance: (runningBalance += 287)
    },

    // Yesterday
    {
        id: 'TXN-2024-0122',
        type: 'credit',
        amount: 8350,
        category: 'cod_remittance',
        description: 'COD remittance - Week 3',
        context: {
            orderId: 'Multiple orders'
        },
        timestamp: subDays(now, 1).toISOString(),
        runningBalance: (runningBalance -= 5000)
    },
    {
        id: 'TXN-2024-0121',
        type: 'debit',
        amount: 520,
        category: 'order',
        description: 'Shipped order to Delhi',
        context: {
            orderId: 'ORD-12843',
            awb: 'BDR7621944',
            customerName: 'Rajesh Kumar'
        },
        timestamp: subDays(now, 1).toISOString(),
        runningBalance: (runningBalance -= 8350)
    },
    {
        id: 'TXN-2024-0120',
        type: 'debit',
        amount: 198,
        category: 'order',
        description: 'Shipped order to Pune',
        context: {
            orderId: 'ORD-12842',
            awb: 'VEL5521883',
            customerName: 'Sneha Desai'
        },
        timestamp: subDays(now, 1).toISOString(),
        runningBalance: (runningBalance += 520)
    },

    // 2 days ago
    {
        id: 'TXN-2024-0119',
        type: 'debit',
        amount: 145,
        category: 'fee',
        description: 'Platform fee - January',
        timestamp: subDays(now, 2).toISOString(),
        runningBalance: (runningBalance += 198)
    },
    {
        id: 'TXN-2024-0118',
        type: 'credit',
        amount: 450,
        category: 'refund',
        description: 'RTO refund for cancelled order',
        context: {
            orderId: 'ORD-12801',
            awb: 'DTD8823992'
        },
        timestamp: subDays(now, 2).toISOString(),
        runningBalance: (runningBalance += 145)
    },
    {
        id: 'TXN-2024-0117',
        type: 'debit',
        amount: 312,
        category: 'order',
        description: 'Shipped order to Hyderabad',
        context: {
            orderId: 'ORD-12841',
            awb: 'VEL9923551',
            customerName: 'Lakshmi Reddy'
        },
        timestamp: subDays(now, 2).toISOString(),
        runningBalance: (runningBalance -= 450)
    },

    // 3 days ago
    {
        id: 'TXN-2024-0116',
        type: 'debit',
        amount: 278,
        category: 'order',
        description: 'Shipped order to Chennai',
        context: {
            orderId: 'ORD-12840',
            awb: 'BDR6621772',
            customerName: 'Karthik Subramaniam'
        },
        timestamp: subDays(now, 3).toISOString(),
        runningBalance: (runningBalance += 312)
    },
    {
        id: 'TXN-2024-0115',
        type: 'credit',
        amount: 10000,
        category: 'recharge',
        description: 'Wallet recharge via Net Banking',
        timestamp: subDays(now, 3).toISOString(),
        runningBalance: (runningBalance += 278)
    },

    // 4 days ago
    {
        id: 'TXN-2024-0114',
        type: 'debit',
        amount: 425,
        category: 'order',
        description: 'Shipped order to Kolkata',
        context: {
            orderId: 'ORD-12839',
            awb: 'DTD7723881',
            customerName: 'Ananya Chatterjee'
        },
        timestamp: subDays(now, 4).toISOString(),
        runningBalance: (runningBalance -= 10000)
    },
    {
        id: 'TXN-2024-0113',
        type: 'debit',
        amount: 189,
        category: 'order',
        description: 'Shipped order to Ahmedabad',
        context: {
            orderId: 'ORD-12838',
            awb: 'VEL4421662',
            customerName: 'Vimal Shah'
        },
        timestamp: subDays(now, 4).toISOString(),
        runningBalance: (runningBalance += 425)
    },

    // 5 days ago
    {
        id: 'TXN-2024-0112',
        type: 'credit',
        amount: 12450,
        category: 'cod_remittance',
        description: 'COD remittance - Week 2',
        timestamp: subDays(now, 5).toISOString(),
        runningBalance: (runningBalance += 189)
    },
    {
        id: 'TXN-2024-0111',
        type: 'debit',
        amount: 356,
        category: 'order',
        description: 'Shipped order to Jaipur',
        context: {
            orderId: 'ORD-12837',
            awb: 'BDR3321551',
            customerName: 'Rohit Meena'
        },
        timestamp: subDays(now, 5).toISOString(),
        runningBalance: (runningBalance -= 12450)
    },

    // 6 days ago
    {
        id: 'TXN-2024-0110',
        type: 'debit',
        amount: 298,
        category: 'order',
        description: 'Shipped order to Surat',
        context: {
            orderId: 'ORD-12836',
            awb: 'VEL2221440',
            customerName: 'Meera Patel'
        },
        timestamp: subDays(now, 6).toISOString(),
        runningBalance: (runningBalance += 356)
    },
    {
        id: 'TXN-2024-0109',
        type: 'debit',
        amount: 412,
        category: 'order',
        description: 'Shipped order to Lucknow',
        context: {
            orderId: 'ORD-12835',
            awb: 'DTD1121329',
            customerName: 'Abhishek Verma'
        },
        timestamp: subDays(now, 6).toISOString(),
        runningBalance: (runningBalance += 298)
    },

    // 7 days ago (1 week)
    {
        id: 'TXN-2024-0108',
        type: 'credit',
        amount: 5000,
        category: 'recharge',
        description: 'Wallet recharge via UPI',
        timestamp: subDays(now, 7).toISOString(),
        runningBalance: (runningBalance += 412)
    },
    {
        id: 'TXN-2024-0107',
        type: 'debit',
        amount: 267,
        category: 'order',
        description: 'Shipped order to Indore',
        context: {
            orderId: 'ORD-12834',
            awb: 'VEL9921218',
            customerName: 'Pooja Jain'
        },
        timestamp: subDays(now, 7).toISOString(),
        runningBalance: (runningBalance -= 5000)
    },

    // Older transactions
    {
        id: 'TXN-2024-0106',
        type: 'debit',
        amount: 334,
        category: 'order',
        description: 'Shipped order to Bhopal',
        context: {
            orderId: 'ORD-12833',
            awb: 'BDR8821107',
            customerName: 'Sanjay Tiwari'
        },
        timestamp: subDays(now, 8).toISOString(),
        runningBalance: (runningBalance += 267)
    },
    {
        id: 'TXN-2024-0105',
        type: 'credit',
        amount: 3850,
        category: 'refund',
        description: 'Bulk RTO refunds',
        timestamp: subDays(now, 9).toISOString(),
        runningBalance: (runningBalance += 334)
    },
    {
        id: 'TXN-2024-0104',
        type: 'debit',
        amount: 499,
        category: 'order',
        description: 'Shipped order to Chandigarh',
        context: {
            orderId: 'ORD-12832',
            awb: 'DTD7720996',
            customerName: 'Gurpreet Singh'
        },
        timestamp: subDays(now, 10).toISOString(),
        runningBalance: (runningBalance -= 3850)
    },
    {
        id: 'TXN-2024-0103',
        type: 'credit',
        amount: 15420,
        category: 'cod_remittance',
        description: 'COD remittance - Week 1',
        timestamp: subDays(now, 12).toISOString(),
        runningBalance: (runningBalance += 499)
    },
    {
        id: 'TXN-2024-0102',
        type: 'debit',
        amount: 223,
        category: 'order',
        description: 'Shipped order to Nagpur',
        context: {
            orderId: 'ORD-12831',
            awb: 'VEL6620885',
            customerName: 'Ashok Bhosale'
        },
        timestamp: subDays(now, 13).toISOString(),
        runningBalance: (runningBalance -= 15420)
    },
    {
        id: 'TXN-2024-0101',
        type: 'credit',
        amount: 10000,
        category: 'recharge',
        description: 'Wallet recharge via Card',
        timestamp: subDays(now, 14).toISOString(),
        runningBalance: (runningBalance += 223)
    },
];
