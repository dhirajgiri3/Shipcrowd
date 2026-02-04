/**
 * Delhivery Provider Comprehensive Unit Tests
 * 
 * Complete test coverage for all Delhivery B2C features including:
 * - Forward shipments (Prepaid & COD)
 * - Reverse shipments (RVP)
 * - Multi-Piece Shipments (MPS)
 * - Warehouse operations
 * - Tracking & status mapping
 * - Serviceability
 * - Rate calculation
 * - Cancellation
 * - Address updates
 * - Reattempt requests
 * - NDR status polling
 * - POD retrieval
 * - Error handling
 * - Retry logic
 */

import axios, { AxiosError } from 'axios';
import mongoose from 'mongoose';
import { DelhiveryProvider } from '../../../src/infrastructure/external/couriers/delhivery/delhivery.provider';
import { DelhiveryMapper } from '../../../src/infrastructure/external/couriers/delhivery/delhivery.mapper';
import { StatusMapperService } from '../../../src/core/application/services/courier/status-mappings/status-mapper.service';
import { DELHIVERY_STATUS_MAPPINGS } from '../../../src/core/application/services/courier/status-mappings/delhivery-status-mappings';
import { CourierShipmentData, CourierReverseShipmentData } from '../../../src/infrastructure/external/couriers/base/courier.adapter';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Warehouse model
jest.mock('../../../src/infrastructure/database/mongoose/models/logistics/warehouse/structure/warehouse.model', () => ({
    findById: jest.fn(),
}));

import Warehouse from '../../../src/infrastructure/database/mongoose/models/logistics/warehouse/structure/warehouse.model';
const MockedWarehouse = Warehouse as jest.Mocked<typeof Warehouse>;

describe('DelhiveryProvider - Comprehensive Tests', () => {
    let provider: DelhiveryProvider;
    let mockAxiosInstance: any;

    beforeAll(() => {
        StatusMapperService.clear();
        StatusMapperService.register(DELHIVERY_STATUS_MAPPINGS);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        process.env.DELHIVERY_API_TOKEN = 'test-staging-token';
        process.env.DELHIVERY_CLIENT_NAME = 'TestClient';
        process.env.DELHIVERY_BASE_URL = 'https://staging-express.delhivery.com';

        mockAxiosInstance = {
            get: jest.fn(),
            post: jest.fn(),
        };

        mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
        provider = new DelhiveryProvider(
            new mongoose.Types.ObjectId(),
            'https://staging-express.delhivery.com'
        );
    });

    // ========================================
    // SHIPMENT CREATION TESTS
    // ========================================

    describe('Shipment Creation', () => {
        const baseShipmentData: CourierShipmentData = {
            origin: {
                name: 'Test Warehouse',
                phone: '9999999999',
                address: 'Test Origin Address',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001',
                country: 'India',
            },
            destination: {
                name: 'Test Customer',
                phone: '9876543210',
                address: '123 Test Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                country: 'India',
            },
            package: { weight: 1, length: 10, width: 10, height: 10 },
            orderNumber: 'TEST-ORDER-001',
            paymentMode: 'prepaid',
        };

        it('creates prepaid shipment and returns AWB', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { packages: [{ waybill: '1234567890' }] },
            });

            const shipmentData = {
                ...baseShipmentData,
                carrierOptions: { delhivery: { pickupLocationName: 'Test_Warehouse' } },
            } as any;

            const result = await provider.createShipment(shipmentData);

            expect(result.trackingNumber).toBe('1234567890');
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/api/cmu/create.json',
                expect.stringContaining('format=json&data='),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }),
                })
            );
        });

        it('creates COD shipment with COD amount', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { packages: [{ waybill: 'COD123456' }] },
            });

            const codShipmentData = {
                ...baseShipmentData,
                paymentMode: 'cod',
                codAmount: 1500,
                carrierOptions: { delhivery: { pickupLocationName: 'Test_Warehouse' } },
            } as any;

            const result = await provider.createShipment(codShipmentData);

            expect(result.trackingNumber).toBe('COD123456');

            // Verify COD details in payload
            const callArgs = mockAxiosInstance.post.mock.calls[0][1];
            expect(callArgs).toContain('COD');
            expect(callArgs).toContain('1500');
        });

        it('sanitizes special characters in address', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { packages: [{ waybill: 'SANITIZED123' }] },
            });

            const shipmentWithSpecialChars = {
                ...baseShipmentData,
                destination: {
                    ...baseShipmentData.destination,
                    name: 'Test & Customer',
                    address: 'House #123; Street % Area',
                },
                carrierOptions: { delhivery: { pickupLocationName: 'Test_Warehouse' } },
            } as any;

            const result = await provider.createShipment(shipmentWithSpecialChars);

            expect(result.trackingNumber).toBe('SANITIZED123');

            // Verify special characters are removed
            const callArgs = mockAxiosInstance.post.mock.calls[0][1];
            expect(callArgs).not.toContain('&');
            expect(callArgs).not.toContain('#');
            expect(callArgs).not.toContain('%');
            expect(callArgs).not.toContain(';');
        });

        it('throws error when warehouse is missing', async () => {
            const shipmentWithoutWarehouse = {
                ...baseShipmentData,
            } as any;

            await expect(provider.createShipment(shipmentWithoutWarehouse))
                .rejects.toThrow('Delhivery pickup location name is required');
        });

        it('throws error when Delhivery does not return waybill', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { packages: [] }, // No waybill
            });

            const shipmentData = {
                ...baseShipmentData,
                carrierOptions: { delhivery: { pickupLocationName: 'Test_Warehouse' } },
            } as any;

            await expect(provider.createShipment(shipmentData))
                .rejects.toThrow('Delhivery did not return a waybill');
        });

        it('builds MPS fields correctly', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { packages: [{ waybill: 'MPS_CHILD_001' }] },
            });

            const mpsShipmentData = {
                ...baseShipmentData,
                carrierOptions: {
                    delhivery: {
                        pickupLocationName: 'Test_Warehouse',
                        mps: {
                            mps_amount: 2000,
                            mps_children: 2,
                            master_id: 'MPS_MASTER_001',
                            waybill: 'MPS_CHILD_001',
                        },
                    },
                },
            } as any;

            const result = await provider.createShipment(mpsShipmentData);

            expect(result.trackingNumber).toBe('MPS_CHILD_001');

            const callArgs = mockAxiosInstance.post.mock.calls[0][1];
            expect(callArgs).toContain('MPS');
            expect(callArgs).toContain('MPS_MASTER_001');
        });
    });

    // ========================================
    // REVERSE SHIPMENT TESTS
    // ========================================

    describe('Reverse Shipment Creation', () => {
        it('creates reverse shipment with payment mode Pickup', async () => {
            const mockWarehouse = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Return_Warehouse',
                address: {
                    line1: 'Return Address',
                    postalCode: '110001',
                    city: 'Delhi',
                    state: 'Delhi',
                    country: 'India',
                },
                contactInfo: { phone: '9999999999' },
            };

            MockedWarehouse.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockWarehouse),
            } as any);

            mockAxiosInstance.post.mockResolvedValue({
                data: { packages: [{ waybill: 'RVP123456' }] },
            });

            const reverseShipmentData: CourierReverseShipmentData = {
                orderId: 'ORD-RETURN-001',
                returnWarehouseId: mockWarehouse._id.toString(),
                pickupAddress: {
                    name: 'Customer Name',
                    phone: '9876543210',
                    address: 'Customer Address',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400001',
                    country: 'India',
                },
                package: { weight: 1, length: 10, width: 10, height: 10 },
                reason: 'Damaged product',
            };

            const result = await provider.createReverseShipment(reverseShipmentData);

            expect(result.trackingNumber).toBe('RVP123456');
            expect(result.courierName).toBe('delhivery');

            const callArgs = mockAxiosInstance.post.mock.calls[0][1];
            expect(callArgs).toContain('Pickup');
        });

        it('throws error when warehouse not found', async () => {
            MockedWarehouse.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            } as any);

            const reverseShipmentData: CourierReverseShipmentData = {
                orderId: 'ORD-RETURN-001',
                returnWarehouseId: new mongoose.Types.ObjectId().toString(),
                pickupAddress: {
                    name: 'Customer',
                    phone: '9999999999',
                    address: 'Address',
                    city: 'City',
                    state: 'State',
                    pincode: '110001',
                    country: 'India',
                },
                package: { weight: 1, length: 10, width: 10, height: 10 },
            };

            await expect(provider.createReverseShipment(reverseShipmentData))
                .rejects.toThrow('Return warehouse not found');
        });
    });

    // ========================================
    // TRACKING TESTS
    // ========================================

    describe('Shipment Tracking', () => {
        it('tracks shipment and maps status correctly', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: {
                    ShipmentData: [
                        {
                            Shipment: {
                                Status: {
                                    Status: 'DELIVERED',
                                    StatusDateTime: '2026-02-05T12:00:00+05:30',
                                    StatusType: 'DL',
                                    StatusLocation: 'Mumbai',
                                    Instructions: 'Delivered successfully',
                                },
                                AWB: '1234567890',
                            },
                        },
                    ],
                },
            });

            const result = await provider.trackShipment('1234567890');

            expect(result.status).toBe('delivered');
            expect(result.trackingNumber).toBe('1234567890');
            expect(result.currentLocation).toBe('Mumbai');
            expect(result.timeline).toHaveLength(1);
            expect(result.timeline[0].status).toBe('delivered');
        });

        it('handles NDR status with NSL code', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: {
                    ShipmentData: [
                        {
                            Shipment: {
                                Status: {
                                    Status: 'DISPATCHED',
                                    StatusDateTime: '2026-02-05T10:00:00+05:30',
                                    StatusType: 'UD',
                                    StatusLocation: 'Mumbai',
                                    Instructions: 'Address incomplete',
                                },
                                AWB: 'NDR123',
                                NSLCode: 'EOD-74',
                            },
                        },
                    ],
                },
            });

            const result = await provider.trackShipment('NDR123');

            expect(result.status).toBe('ndr');
        });

        it('throws error for non-existent AWB', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: { ShipmentData: [] },
            });

            await expect(provider.trackShipment('NONEXISTENT'))
                .rejects.toThrow('No tracking data for AWB: NONEXISTENT');
        });
    });

    // ========================================
    // SERVICEABILITY TESTS
    // ========================================

    describe('Serviceability Check', () => {
        it('returns true for serviceable pincodes', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: {
                    delivery_codes: [
                        {
                            postal_code: {
                                pre_paid: 'Y',
                                cod: 'Y',
                                pickup: 'Y',
                                remarks: '',
                            },
                        },
                    ],
                },
            });

            const isServiceable = await provider.checkServiceability('110001');

            expect(isServiceable).toBe(true);
        });

        it('returns false for embargo pincodes', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: {
                    delivery_codes: [
                        {
                            postal_code: {
                                pre_paid: 'Y',
                                cod: 'Y',
                                pickup: 'Y',
                                remarks: 'Embargo',
                            },
                        },
                    ],
                },
            });

            const isServiceable = await provider.checkServiceability('110001');

            expect(isServiceable).toBe(false);
        });

        it('checks pickup serviceability correctly', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: {
                    delivery_codes: [
                        {
                            postal_code: {
                                pre_paid: 'N',
                                cod: 'N',
                                pickup: 'Y',
                                remarks: '',
                            },
                        },
                    ],
                },
            });

            const isPickupServiceable = await provider.checkServiceability('110001', 'pickup');

            expect(isPickupServiceable).toBe(true);
        });

        it('returns false for non-existent pincodes', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: { delivery_codes: [] },
            });

            const isServiceable = await provider.checkServiceability('000000');

            expect(isServiceable).toBe(false);
        });
    });

    // ========================================
    // RATE CALCULATION TESTS
    // ========================================

    describe('Rate Calculation', () => {
        it('returns rates with INR currency', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: { total_charge: 125.50 },
            });

            const rates = await provider.getRates({
                origin: { pincode: '110001' },
                destination: { pincode: '400001' },
                package: { weight: 1, length: 10, width: 10, height: 10 },
                paymentMode: 'prepaid',
            });

            expect(rates[0].total).toBe(125.50);
            expect(rates[0].currency).toBe('INR');
            expect(rates[0].serviceType).toBe('Surface');
        });

        it('uses Express mode when specified', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: { total_charge: 200.00 },
            });

            const rates = await provider.getRates({
                origin: { pincode: '110001' },
                destination: { pincode: '400001' },
                package: { weight: 1, length: 10, width: 10, height: 10 },
                paymentMode: 'prepaid',
                serviceType: 'express',
            } as any);

            expect(rates[0].serviceType).toBe('Express');

            const callArgs = mockAxiosInstance.get.mock.calls[0][1].params;
            expect(callArgs.md).toBe('E');
        });

        it('handles zero rates in staging', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: { total_charge: 0 },
            });

            const rates = await provider.getRates({
                origin: { pincode: '110001' },
                destination: { pincode: '400001' },
                package: { weight: 1, length: 10, width: 10, height: 10 },
                paymentMode: 'prepaid',
            });

            expect(rates[0].total).toBe(0);
            expect(rates[0].currency).toBe('INR');
        });
    });

    // ========================================
    // CANCELLATION TESTS
    // ========================================

    describe('Shipment Cancellation', () => {
        it('cancels shipment successfully', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { success: true, message: 'Cancelled' },
            });

            const result = await provider.cancelShipment('1234567890');

            expect(result).toBe(true);
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/api/p/edit',
                { waybill: '1234567890', cancellation: 'true' },
                expect.any(Object)
            );
        });
    });

    // ========================================
    // ADDRESS UPDATE TESTS
    // ========================================

    describe('Address Update', () => {
        it('updates delivery address successfully', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { success: true, message: 'Address updated' },
            });

            const result = await provider.updateDeliveryAddress(
                'AWB123',
                {
                    line1: 'New Address Line 1',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400002',
                    country: 'India',
                },
                'ORDER-001',
                '9999999999'
            );

            expect(result.success).toBe(true);
            expect(result.message).toBe('Address updated');
        });

        it('sanitizes address before sending', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { success: true },
            });

            await provider.updateDeliveryAddress(
                'AWB123',
                {
                    line1: 'House #123 & Street',
                    city: 'Mumbai',
                    state: 'MH',
                    pincode: '400001',
                    country: 'India',
                },
                'ORDER-001'
            );

            const callArgs = mockAxiosInstance.post.mock.calls[0][1];
            expect(callArgs.add).not.toContain('&');
            expect(callArgs.add).not.toContain('#');
        });
    });

    // ========================================
    // REATTEMPT TESTS
    // ========================================

    describe('Reattempt Request', () => {
        it('requests reattempt and returns UPL ID', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { request_id: 'UPL123456', message: 'Reattempt requested' },
            });

            const result = await provider.requestReattempt('AWB123');

            expect(result.success).toBe(true);
            expect(result.uplId).toBe('UPL123456');
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/api/p/update',
                { data: [{ waybill: 'AWB123', act: 'RE-ATTEMPT' }] },
                expect.any(Object)
            );
        });
    });

    // ========================================
    // NDR STATUS POLLING TESTS
    // ========================================

    describe('NDR Status Polling', () => {
        it('polls NDR status successfully', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: { status: 'completed', results: { status: 'DELIVERED' } },
            });

            const result = await provider.getNdrStatus('UPL123456');

            expect(result.status).toBe('completed');
            expect(mockAxiosInstance.get).toHaveBeenCalledWith(
                `/api/cmu/get_bulk_upl/UPL123456`,
                expect.objectContaining({
                    params: { verbose: true },
                })
            );
        });
    });

    // ========================================
    // POD RETRIEVAL TESTS
    // ========================================

    describe('Proof of Delivery', () => {
        it('retrieves POD URL for delivered shipment', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: { url: 'https://delhivery.com/pod/123.pdf' },
            });

            const result = await provider.getProofOfDelivery('DELIVERED123');

            expect(result.url).toBe('https://delhivery.com/pod/123.pdf');
            expect(result.source).toBe('courier_api');
        });

        it('returns not_supported when POD unavailable', async () => {
            mockAxiosInstance.get.mockResolvedValue({
                data: { message: 'POD not available' },
            });

            const result = await provider.getProofOfDelivery('NOTREADY123');

            expect(result.source).toBe('not_supported');
        });
    });

    // ========================================
    // WAREHOUSE TESTS
    // ========================================

    describe('Warehouse Operations', () => {
        it('creates warehouse successfully', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { success: true, warehouse_id: 'WH_001' },
            });

            const warehouseData = {
                name: 'Test_Warehouse',
                contactInfo: { phone: '9999999999', email: 'wh@example.com' },
                address: {
                    line1: 'Warehouse Address',
                    city: 'Delhi',
                    postalCode: '110001',
                    state: 'Delhi',
                    country: 'India',
                },
            };

            const result = await provider.createWarehouse(warehouseData);

            expect(result.success).toBe(true);
            expect(result.warehouse_id).toBe('WH_001');
        });

        it('normalizes phone number before creating warehouse', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { success: true },
            });

            await provider.createWarehouse({
                name: 'Test_WH',
                contactInfo: { phone: '+91-9999999999' },
                address: {
                    line1: 'Address',
                    city: 'Delhi',
                    postalCode: '110001',
                    state: 'Delhi',
                },
            });

            const callArgs = mockAxiosInstance.post.mock.calls[0][1];
            expect(callArgs.phone).toBe('9999999999');
        });
    });

    // ========================================
    // PICKUP SCHEDULING TESTS
    // ========================================

    describe('Pickup Scheduling', () => {
        it('schedules pickup successfully', async () => {
            mockAxiosInstance.post.mockResolvedValue({
                data: { success: true, pickup_id: 'PICKUP_001' },
            });

            const result = await provider.schedulePickup({
                pickupDate: '2026-02-10',
                pickupTime: '14:00',
                pickupLocation: 'Test_Warehouse',
                expectedCount: 5,
            });

            expect(result.success).toBe(true);
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                '/fm/request/new/',
                expect.objectContaining({
                    pickup_date: '2026-02-10',
                    pickup_time: '14:00',
                    pickup_location: 'Test_Warehouse',
                    expected_package_count: 5,
                }),
                expect.any(Object)
            );
        });
    });

    // ========================================
    // ERROR HANDLING TESTS
    // ========================================

    describe('Error Handling', () => {
        it('throws meaningful error for 400 Bad Request', async () => {
            const error = {
                response: {
                    status: 400,
                    data: { message: 'Invalid payload: Missing required field' },
                },
            };
            mockAxiosInstance.post.mockRejectedValue(error);

            await expect(provider.createShipment({
                /* minimal invalid data */
                carrierOptions: { delhivery: { pickupLocationName: 'Test' } },
            } as any)).rejects.toThrow();
        });

        it('handles 401 Unauthorized error', async () => {
            const error = {
                response: {
                    status: 401,
                    data: { message: 'Unauthorized' },
                },
            };
            mockAxiosInstance.get.mockRejectedValue(error);

            await expect(provider.checkServiceability('110001')).rejects.toThrow();
        });
    });

    // ========================================
    // MAPPER UTILITY TESTS
    // ========================================

    describe('DelhiveryMapper Utilities', () => {
        it('normalizes phone numbers correctly', () => {
            expect(DelhiveryMapper.normalizePhone('9999999999')).toBe('9999999999');
            expect(DelhiveryMapper.normalizePhone('+91-9999999999')).toBe('9999999999');
            expect(DelhiveryMapper.normalizePhone('919999999999')).toBe('9999999999');
            expect(DelhiveryMapper.normalizePhone('+919999999999')).toBe('9999999999');
        });

        it('sanitizes forbidden characters', () => {
            expect(DelhiveryMapper.sanitize('House & Street')).toBe('House   Street');
            expect(DelhiveryMapper.sanitize('House #123')).toBe('House  123');
            expect(DelhiveryMapper.sanitize('Street % Area')).toBe('Street   Area');
            expect(DelhiveryMapper.sanitize('Address ; Note')).toBe('Address   Note');
            expect(DelhiveryMapper.sanitize('Path \\ Name')).toBe('Path   Name');
        });

        it('converts weight to grams', () => {
            expect(DelhiveryMapper.toGrams(1)).toBe(1000);
            expect(DelhiveryMapper.toGrams(0.5)).toBe(500);
            expect(DelhiveryMapper.toGrams(2.345)).toBe(2345);
        });
    });
});
