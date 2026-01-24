import { Order } from '@/src/types/domain/order';

export const generateMockOrders = (): Order[] => {
    const statuses = ['delivered', 'in_transit', 'shipped', 'pending', 'cancelled', 'rto', 'ready_to_ship', 'ndr'];
    const paymentStatuses = ['paid', 'pending', 'failed'];
    const productsList = [
        'Wireless Noise Cancelling Headphones', 'Smart Fitness Watch Gen 4', 'Ergonomic Office Chair',
        'Mechanical Gaming Keyboard', 'USB-C Docking Station', 'Ultra-Wide Monitor 34"',
        'Bluetooth Portable Speaker', 'Laptop Stand Adjustable', 'Vegan Leather Backpack', 'Smart Home Hub'
    ];
    const customers = [
        'Aarav Patel', 'Vihaan Sharma', 'Aditya Verma', 'Sai Kumar', 'Ananya Singh', 'Diya Rao',
        'Isha Mehta', 'Arjun Nair', 'Meera Reddy', 'Kabir Das', 'Rohan Gupta', 'Sanya Malhotra'
    ];

    return Array.from({ length: 45 }).map((_, i) => {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        // const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
        const product = productsList[Math.floor(Math.random() * productsList.length)];
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const amount = Math.floor(Math.random() * 15000) + 999;

        return {
            _id: `ORD-${2024000 + i}`,
            orderNumber: `ORD-${2024000 + i}`,
            customerInfo: {
                name: customer,
                phone: `+91 ${9000000000 + Math.floor(Math.random() * 999999999)}`,
                email: `${customer.toLowerCase().replace(' ', '.')}@example.com`
            },
            products: [
                {
                    name: product,
                    quantity: Math.floor(Math.random() * 3) + 1,
                    price: amount
                }
            ],
            currentStatus: status,
            paymentStatus: paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)] as 'paid' | 'pending' | 'failed',
            paymentMethod: i % 3 === 0 ? 'cod' : 'prepaid',
            totals: {
                subtotal: amount,
                tax: amount * 0.18,
                shipping: 100,
                total: amount + (amount * 0.18) + 100
            },
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString()
        } as Order;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
