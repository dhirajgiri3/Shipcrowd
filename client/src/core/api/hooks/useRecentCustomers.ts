import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface RecentCustomer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    city: string;
    state: string;
    postalCode: string;
    addressLine1: string;
    addressLine2?: string;
    country?: string;
    totalOrders: number;
    lastOrderDate: string;
    avgOrderValue: number;
    preferredPayment: 'cod' | 'prepaid';
}

// Mock data for development and testing
const mockRecentCustomers: RecentCustomer[] = [
    {
        id: '1',
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul@example.com',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        addressLine1: '123 MG Road, Andheri West',
        totalOrders: 12,
        lastOrderDate: '2024-12-22',
        avgOrderValue: 1299,
        preferredPayment: 'prepaid',
    },
    {
        id: '2',
        name: 'Priya Patel',
        phone: '9123456789',
        email: 'priya@example.com',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        addressLine1: '456 Connaught Place',
        totalOrders: 8,
        lastOrderDate: '2024-12-21',
        avgOrderValue: 2499,
        preferredPayment: 'cod',
    },
    {
        id: '3',
        name: 'Amit Kumar',
        phone: '9988776655',
        email: 'amit@example.com',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
        addressLine1: '789 MG Road, Indiranagar',
        totalOrders: 5,
        lastOrderDate: '2024-12-20',
        avgOrderValue: 899,
        preferredPayment: 'prepaid',
    },
    {
        id: '4',
        name: 'Sneha Reddy',
        phone: '8899776655',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
        addressLine1: '321 Banjara Hills',
        totalOrders: 15,
        lastOrderDate: '2024-12-19',
        avgOrderValue: 1799,
        preferredPayment: 'cod',
    },
    {
        id: '5',
        name: 'Vikram Singh',
        phone: '7788996655',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        addressLine1: '567 Koregaon Park',
        totalOrders: 3,
        lastOrderDate: '2024-12-18',
        avgOrderValue: 599,
        preferredPayment: 'prepaid',
    },
];

interface UseRecentCustomersOptions {
    limit?: number;
    useMockData?: boolean;
}

/**
 * Hook to fetch recent customers for Quick Create feature
 * Uses mock data as fallback if API is unavailable
 */
export const useRecentCustomers = (options: UseRecentCustomersOptions = {}) => {
    const { limit = 5, useMockData = false } = options;

    return useQuery<RecentCustomer[]>({
        queryKey: ['customers', 'recent', limit],
        queryFn: async () => {
            // Use mock data if explicitly requested
            if (useMockData) {
                return mockRecentCustomers.slice(0, limit);
            }

            try {
                const response = await apiClient.get('/analytics/recent-customers', {
                    params: { limit },
                });
                return response.data.customers as RecentCustomer[];
            } catch (error) {
                // Fallback to mock data if API fails
                console.warn('Falling back to mock recent customers data');
                return mockRecentCustomers.slice(0, limit);
            }
        },
        staleTime: 300000, // 5 minutes
        retry: 1,
    });
};

export default useRecentCustomers;
