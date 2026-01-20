/**
 * Transaction History - Wallet transactions with Indian context
 * Psychology: Transparency & trust - clear transaction details
 */

// Removed unused imports

export interface Transaction {
    id: string;
    type: 'credit' | 'debit';
    category: 'recharge' | 'shipping_charge' | 'refund' | 'cod_remittance' | 'penalty' | 'bonus';
    amount: number;
    balanceAfter: number;
    description: string;
    context?: {
        orderId?: string;
        awb?: string;
        courierName?: string;
        paymentMethod?: string;
        utrNumber?: string;
    };
    status: 'completed' | 'pending' | 'failed';
    timestamp: string;
}

// Generate realistic transaction history
export function generateTransactionHistory(count: number = 30): Transaction[] {
    const transactions: Transaction[] = [];
    let currentBalance = 45230; // Starting balance

    const now = new Date();

    // Transaction templates with realistic Indian context
    const templates = [
        // Recharges
        {
            type: 'credit' as const,
            category: 'recharge' as const,
            amounts: [1000, 2000, 5000, 10000],
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            description: (_amount: number, method: string, _utr: string) =>
                `Wallet recharge via ${method}`,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            context: (_amount: number) => ({
                paymentMethod: ['UPI', 'Net Banking', 'Credit Card'][Math.floor(Math.random() * 3)],
                utrNumber: `UTR${Math.random().toString().slice(2, 14)}`
            })
        },

        // Shipping charges
        {
            type: 'debit' as const,
            category: 'shipping_charge' as const,
            amounts: [45, 65, 87, 120, 150],
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            description: (_amount: number, orderId: string, _courier: string) =>
                `Shipping charge - Order #${orderId}`,
            context: () => ({
                orderId: `ORD${Math.random().toString().slice(2, 10)}`,
                awb: `AWB${Math.random().toString().slice(2, 14)}`,
                courierName: ['Delhivery', 'BlueDart', 'DTDC', 'Ecom Express'][Math.floor(Math.random() * 4)]
            })
        },

        // COD Remittance
        {
            type: 'credit' as const,
            category: 'cod_remittance' as const,
            amounts: [850, 1200, 1500, 2300, 3400],
            description: (_amount: number, orderId: string) =>
                `COD collected - Order #${orderId}`,
            context: () => ({
                orderId: `ORD${Math.random().toString().slice(2, 10)}`,
                awb: `AWB${Math.random().toString().slice(2, 14)}`
            })
        },

        // Refunds
        {
            type: 'credit' as const,
            category: 'refund' as const,
            amounts: [45, 65, 87],
            description: (_amount: number, orderId: string) =>
                `Shipping refund - Cancelled Order #${orderId}`,
            context: () => ({
                orderId: `ORD${Math.random().toString().slice(2, 10)}`
            })
        },

        // Penalties
        {
            type: 'debit' as const,
            category: 'penalty' as const,
            amounts: [50, 100, 150],
            description: (_amount: number, reason: string) =>
                `Penalty - ${reason}`,
            context: () => ({
                orderId: `ORD${Math.random().toString().slice(2, 10)}`
            })
        },

        // Bonuses
        {
            type: 'credit' as const,
            category: 'bonus' as const,
            amounts: [100, 200, 500],
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            description: (_amount: number) =>
                `Cashback - Volume milestone achieved`,
            context: () => ({})
        }
    ];

    // Generate transactions going backwards in time
    for (let i = 0; i < count; i++) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        const amount = template.amounts[Math.floor(Math.random() * template.amounts.length)];

        // Update balance
        if (template.type === 'credit') {
            currentBalance -= amount; // Going backwards, so subtract credits
        } else {
            currentBalance += amount; // Going backwards, so add debits
        }

        const context = template.context(amount);
        const description = template.description(
            amount,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (context as any).orderId || '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (context as any).courierName || ''
        );

        // Calculate timestamp (going backwards)
        const daysAgo = Math.floor(i / 3); // ~3 transactions per day
        const hoursAgo = Math.floor(Math.random() * 24);
        const timestamp = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);

        transactions.push({
            id: `TXN${Date.now()}${i}`,
            type: template.type,
            category: template.category,
            amount,
            balanceAfter: currentBalance + (template.type === 'credit' ? amount : -amount), // Actual balance after this transaction
            description,
            context,
            status: i < 2 && Math.random() > 0.8 ? 'pending' : 'completed', // Recent transactions might be pending
            timestamp: timestamp.toISOString()
        });
    }

    // Reverse to get chronological order (oldest first)
    return transactions.reverse();
}

// Predefined realistic transaction history
export const mockTransactions: Transaction[] = [
    {
        id: 'TXN001',
        type: 'credit',
        category: 'recharge',
        amount: 10000,
        balanceAfter: 52430,
        description: 'Wallet recharge via UPI',
        context: {
            paymentMethod: 'UPI',
            utrNumber: 'UTR402938475629'
        },
        status: 'completed',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'TXN002',
        type: 'debit',
        category: 'shipping_charge',
        amount: 65,
        balanceAfter: 52365,
        description: 'Shipping charge - Order #ORD45892',
        context: {
            orderId: 'ORD45892',
            awb: 'AWB1234567890123',
            courierName: 'Delhivery'
        },
        status: 'completed',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'TXN003',
        type: 'credit',
        category: 'cod_remittance',
        amount: 1500,
        balanceAfter: 53865,
        description: 'COD collected - Order #ORD45780',
        context: {
            orderId: 'ORD45780',
            awb: 'AWB9876543210987'
        },
        status: 'completed',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'TXN004',
        type: 'debit',
        category: 'shipping_charge',
        amount: 87,
        balanceAfter: 53778,
        description: 'Shipping charge - Order #ORD45893',
        context: {
            orderId: 'ORD45893',
            awb: 'AWB1122334455667',
            courierName: 'BlueDart'
        },
        status: 'completed',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'TXN005',
        type: 'credit',
        category: 'refund',
        amount: 65,
        balanceAfter: 53843,
        description: 'Shipping refund - Cancelled Order #ORD45850',
        context: {
            orderId: 'ORD45850'
        },
        status: 'completed',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'TXN006',
        type: 'debit',
        category: 'penalty',
        amount: 100,
        balanceAfter: 53743,
        description: 'Penalty - Incorrect weight declared',
        context: {
            orderId: 'ORD45820'
        },
        status: 'completed',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'TXN007',
        type: 'credit',
        category: 'bonus',
        amount: 500,
        balanceAfter: 54243,
        description: 'Cashback - Volume milestone achieved',
        context: {},
        status: 'completed',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'TXN008',
        type: 'debit',
        category: 'shipping_charge',
        amount: 120,
        balanceAfter: 54123,
        description: 'Shipping charge - Order #ORD45894',
        context: {
            orderId: 'ORD45894',
            awb: 'AWB7788990011223',
            courierName: 'DTDC'
        },
        status: 'completed',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'TXN009',
        type: 'credit',
        category: 'cod_remittance',
        amount: 2300,
        balanceAfter: 56423,
        description: 'COD collected - Order #ORD45881',
        context: {
            orderId: 'ORD45881',
            awb: 'AWB4455667788990'
        },
        status: 'completed',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
        id: 'TXN010',
        type: 'debit',
        category: 'shipping_charge',
        amount: 45,
        balanceAfter: 56378,
        description: 'Shipping charge - Order #ORD45895',
        context: {
            orderId: 'ORD45895',
            awb: 'AWB3344556677889',
            courierName: 'Ecom Express'
        },
        status: 'pending',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    }
];

// Helper functions
export function getTransactionsByType(type: 'credit' | 'debit'): Transaction[] {
    return mockTransactions.filter(txn => txn.type === type);
}

export function getTransactionsByCategory(category: Transaction['category']): Transaction[] {
    return mockTransactions.filter(txn => txn.category === category);
}

export function getTransactionsByDateRange(startDate: Date, endDate: Date): Transaction[] {
    return mockTransactions.filter(txn => {
        const txnDate = new Date(txn.timestamp);
        return txnDate >= startDate && txnDate <= endDate;
    });
}

export function getTotalCredits(): number {
    return mockTransactions
        .filter(txn => txn.type === 'credit' && txn.status === 'completed')
        .reduce((sum, txn) => sum + txn.amount, 0);
}

export function getTotalDebits(): number {
    return mockTransactions
        .filter(txn => txn.type === 'debit' && txn.status === 'completed')
        .reduce((sum, txn) => sum + txn.amount, 0);
}
