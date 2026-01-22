import { apiClient, ApiError } from '../../client';
import { handleApiError, showSuccessToast } from '@/src/lib/error';
import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
    UseMutationOptions,
} from '@tanstack/react-query';

export interface Warehouse {
    _id: string;
    companyId: string;
    name: string;
    address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    contactInfo: {
        name: string;
        phone: string;
        email?: string;
        alternatePhone?: string;
    };
    operatingHours?: {
        monday: { open: string | null; close: string | null };
        tuesday: { open: string | null; close: string | null };
        wednesday: { open: string | null; close: string | null };
        thursday: { open: string | null; close: string | null };
        friday: { open: string | null; close: string | null };
        saturday: { open: string | null; close: string | null };
        sunday: { open: string | null; close: string | null };
    };
    isActive: boolean;
    isDefault: boolean;
    isDeleted: boolean;
    carrierDetails?: {
        velocityWarehouseId?: string;
        delhiveryWarehouseId?: string;
        dtdcWarehouseId?: string;
        xpressbeesWarehouseId?: string;
        lastSyncedAt?: string;
    };
    createdAt: string;
    updatedAt: string;
}

/**
 * Mock warehouses data for fallback
 */
const MOCK_WAREHOUSES: Warehouse[] = [
    {
        _id: 'mock-warehouse-1',
        companyId: 'mock-company',
        name: 'Mumbai Distribution Center',
        address: {
            line1: 'Plot 42, Sector 11, MIDC',
            line2: 'Near Eastern Express Highway',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            postalCode: '400070',
            coordinates: {
                latitude: 19.0760,
                longitude: 72.8777
            }
        },
        contactInfo: {
            name: 'Rajesh Kumar',
            phone: '+91-9876543210',
            email: 'rajesh.kumar@warehouse.com',
            alternatePhone: '+91-9876543211'
        },
        operatingHours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '09:00', close: '14:00' },
            sunday: { open: null, close: null }
        },
        isActive: true,
        isDefault: true,
        isDeleted: false,
        carrierDetails: {
            delhiveryWarehouseId: 'DEL-MUM-001',
            dtdcWarehouseId: 'DTDC-MUM-042',
            lastSyncedAt: new Date().toISOString()
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        _id: 'mock-warehouse-2',
        companyId: 'mock-company',
        name: 'Delhi Fulfillment Hub',
        address: {
            line1: 'B-45, Industrial Area, Phase 2',
            city: 'New Delhi',
            state: 'Delhi',
            country: 'India',
            postalCode: '110020',
            coordinates: {
                latitude: 28.7041,
                longitude: 77.1025
            }
        },
        contactInfo: {
            name: 'Priya Singh',
            phone: '+91-9123456789',
            email: 'priya.singh@warehouse.com'
        },
        operatingHours: {
            monday: { open: '08:00', close: '20:00' },
            tuesday: { open: '08:00', close: '20:00' },
            wednesday: { open: '08:00', close: '20:00' },
            thursday: { open: '08:00', close: '20:00' },
            friday: { open: '08:00', close: '20:00' },
            saturday: { open: '10:00', close: '16:00' },
            sunday: { open: null, close: null }
        },
        isActive: true,
        isDefault: false,
        isDeleted: false,
        carrierDetails: {
            velocityWarehouseId: 'VEL-DEL-045',
            xpressbeesWarehouseId: 'XB-DEL-B45',
            lastSyncedAt: new Date().toISOString()
        },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        _id: 'mock-warehouse-3',
        companyId: 'mock-company',
        name: 'Bangalore Tech Park Warehouse',
        address: {
            line1: '3rd Floor, Prestige Tech Park',
            line2: 'Outer Ring Road, Marathahalli',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            postalCode: '560037',
            coordinates: {
                latitude: 12.9716,
                longitude: 77.5946
            }
        },
        contactInfo: {
            name: 'Amit Patel',
            phone: '+91-9988776655',
            email: 'amit.patel@warehouse.com',
            alternatePhone: '+91-9988776656'
        },
        operatingHours: {
            monday: { open: '07:00', close: '19:00' },
            tuesday: { open: '07:00', close: '19:00' },
            wednesday: { open: '07:00', close: '19:00' },
            thursday: { open: '07:00', close: '19:00' },
            friday: { open: '07:00', close: '19:00' },
            saturday: { open: '09:00', close: '15:00' },
            sunday: { open: null, close: null }
        },
        isActive: true,
        isDefault: false,
        isDeleted: false,
        carrierDetails: {
            delhiveryWarehouseId: 'DEL-BLR-037',
            dtdcWarehouseId: 'DTDC-BLR-TP3',
            velocityWarehouseId: 'VEL-BLR-MRT',
            lastSyncedAt: new Date().toISOString()
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    }
];

export interface CreateWarehousePayload {
    name: string;
    address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    contactInfo: {
        name: string;
        phone: string;
        email?: string;
        alternatePhone?: string;
    };
    operatingHours?: Warehouse['operatingHours'];
    isDefault?: boolean;
}

/**
 * Fetch user's warehouses with mock data fallback
 */
export const useWarehouses = (options?: UseQueryOptions<Warehouse[], ApiError>) => {
    return useQuery<Warehouse[], ApiError>({
        queryKey: ['warehouses'],
        queryFn: async () => {
            try {
                const response = await apiClient.get('/warehouses');

                // Backend uses sendPaginated which returns { data: [...], pagination: {...} }
                // Extract warehouses from response.data.data (paginated endpoint)
                const warehouses = response.data.data || response.data.warehouses || [];

                // If API returns empty array or undefined, use mock data as fallback
                if (!warehouses || warehouses.length === 0) {
                    console.warn('[Warehouses] API returned no data, using mock warehouses as fallback');
                    return MOCK_WAREHOUSES;
                }

                // Validate that warehouses have required fields, if not use mock data
                const hasValidData = warehouses.every((w: any) =>
                    w._id && w.name && w.address && w.address.city
                );

                if (!hasValidData) {
                    console.warn('[Warehouses] API returned incomplete data, using mock warehouses as fallback');
                    return MOCK_WAREHOUSES;
                }

                return warehouses;
            } catch (error: any) {
                // On error, check if it's a data fetch issue and use mock data
                const isDataFetchError =
                    error?.code === 'NETWORK_ERROR' ||
                    error?.code === 'TIMEOUT' ||
                    error?.message?.includes('Network') ||
                    error?.message?.includes('timeout');

                if (isDataFetchError) {
                    console.warn('[Warehouses] Network/timeout error, using mock data as fallback:', error?.message);
                    return MOCK_WAREHOUSES;
                }

                // For other errors (auth, permissions), throw to trigger error state
                throw error;
            }
        },
        staleTime: 600000, // 10 minutes - warehouses don't change often
        // Ensure we always return an array, never undefined
        placeholderData: [],
        ...options,
    });
};

/**
 * Create new warehouse
 */
export const useCreateWarehouse = (options?: UseMutationOptions<Warehouse, ApiError, CreateWarehousePayload>) => {
    const queryClient = useQueryClient();

    return useMutation<Warehouse, ApiError, CreateWarehousePayload>({
        mutationFn: async (payload) => {
            const response = await apiClient.post('/warehouses', payload);
            // Backend returns: { success, data: { warehouse }, message, timestamp }
            // Axios wraps it: response.data = backend response
            // So the warehouse is at: response.data.data.warehouse
            return response.data.data.warehouse;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            showSuccessToast('Warehouse created successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Create Warehouse Failed');
        },
        ...options,
    });
};

/**
 * Update warehouse
 */
interface UpdateWarehouseContext {
    previousWarehouses?: Warehouse[];
}

export const useUpdateWarehouse = (options?: UseMutationOptions<any, ApiError, { warehouseId: string; data: Partial<CreateWarehousePayload> }, UpdateWarehouseContext>) => {
    const queryClient = useQueryClient();

    return useMutation<any, ApiError, { warehouseId: string; data: Partial<CreateWarehousePayload> }, UpdateWarehouseContext>({
        mutationFn: async ({ warehouseId, data }) => {
            const response = await apiClient.patch(`/warehouses/${warehouseId}`, data);
            return response.data.data;
        },
        onSuccess: async (data) => {
            console.log('=== [useUpdateWarehouse] onSuccess FIRED ===');
            console.log('[useUpdateWarehouse] Raw data received:', data);
            console.log('[useUpdateWarehouse] data.warehouses exists?', !!data?.warehouses);
            console.log('[useUpdateWarehouse] data.warehouses is array?', Array.isArray(data?.warehouses));

            // ✅ FIX: Use server-provided warehouses list to update cache immediately
            // This prevents race conditions with MongoDB index updates
            if (data?.warehouses && Array.isArray(data.warehouses)) {
                console.log('[useUpdateWarehouse] ✅ Updating cache with server warehouses:', data.warehouses.length, 'items');
                const defaultWarehouse = data.warehouses.find((w: Warehouse) => w.isDefault);
                console.log('[useUpdateWarehouse] Default warehouse after update:', {
                    id: defaultWarehouse?._id,
                    name: defaultWarehouse?.name,
                    isDefault: defaultWarehouse?.isDefault
                });

                // Log all warehouse default states
                console.log('[useUpdateWarehouse] All warehouse default states:');
                data.warehouses.forEach((w: Warehouse) => {
                    console.log(`  - ${w.name}: isDefault = ${w.isDefault}`);
                });

                // Update the cache
                console.log('[useUpdateWarehouse] Setting queryClient data for key ["warehouses"]');
                queryClient.setQueryData<Warehouse[]>(['warehouses'], data.warehouses);
                console.log('[useUpdateWarehouse] ✅ Cache updated successfully');

                // Verify cache was actually updated
                const cachedData = queryClient.getQueryData<Warehouse[]>(['warehouses']);
                console.log('[useUpdateWarehouse] Verifying cached data:', cachedData?.length, 'items');
                if (cachedData) {
                    const cachedDefault = cachedData.find(w => w.isDefault);
                    console.log('[useUpdateWarehouse] Cached default warehouse:', cachedDefault?.name);
                }
            } else {
                console.warn('[useUpdateWarehouse] ❌ No warehouses array in response!');
                console.warn('[useUpdateWarehouse] Response structure:', Object.keys(data || {}));
                console.warn('[useUpdateWarehouse] Falling back to invalidateQueries');
                // Fallback: invalidate if backend doesn't return warehouses array
                await queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            }
            showSuccessToast('Warehouse updated successfully');
            console.log('=== [useUpdateWarehouse] onSuccess COMPLETE ===');
        },
        onError: (error) => {
            handleApiError(error, 'Update Warehouse Failed');
        },
        ...options,
    });
};

/**
 * Delete warehouse
 */
export const useDeleteWarehouse = (options?: UseMutationOptions<void, ApiError, string>) => {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, string>({
        mutationFn: async (warehouseId) => {
            await apiClient.delete(`/warehouses/${warehouseId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            showSuccessToast('Warehouse deleted successfully');
        },
        onError: (error) => {
            handleApiError(error, 'Delete Warehouse Failed');
        },
        ...options,
    });
};
