/**
 * Unit Tests for Velocity Split Flow APIs
 * 
 * Tests:
 * - createForwardOrderOnly()
 * - assignCourier()
 * - createReverseOrderOnly()
 * - assignReverseCourier()
 */

import mongoose from 'mongoose';
import { VelocityShipfastProvider } from '../../../src/infrastructure/external/couriers/velocity/velocity-shipfast.provider';
import { CourierShipmentData, CourierReverseShipmentData } from '../../../src/infrastructure/external/couriers/base/courier.adapter';
import Warehouse from '../../../src/infrastructure/database/mongoose/models/logistics/warehouse/structure/warehouse.model';
import { VelocityError } from '../../../src/infrastructure/external/couriers/velocity/velocity.types';
import { VELOCITY_CARRIER_IDS } from '../../../src/infrastructure/external/couriers/velocity/velocity-carrier-ids';

// Mock dependencies
jest.mock('../../../src/infrastructure/external/couriers/velocity/velocity.auth');
jest.mock('../../../src/infrastructure/database/mongoose/models/logistics/warehouse/structure/warehouse.model');

describe('Velocity Split Flow APIs', () => {
    let velocityProvider: VelocityShipfastProvider;
    let mockCompanyId: mongoose.Types.ObjectId;

    beforeEach(() => {
        mockCompanyId = new mongoose.Types.ObjectId();
        velocityProvider = new VelocityShipfastProvider(mockCompanyId, 'https://test.velocity.in');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createForwardOrderOnly', () => {
        it('should create order without courier assignment', async () => {
            const mockShipmentData: CourierShipmentData = {
                origin: {
                    name: 'Test Warehouse',
                    phone: '9876543210',
                    address: '123 Test St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400001',
                    country: 'India'
                },
                destination: {
                    name: 'John Doe',
                    phone: '9123456789',
                    address: '456 Customer Ave',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    country: 'India'
                },
                package: {
                    weight: 1.5,
                    length: 20,
                    width: 15,
                    height: 10,
                    declaredValue: 1000
                },
                orderNumber: 'ORD-12345',
                paymentMode: 'cod',
                codAmount: 1000
            };

            const mockWarehouse = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Main Warehouse',
                contactInfo: {
                    name: 'Warehouse Manager',
                    phone: '9876543210',
                    email: 'warehouse@test.com'
                },
                address: {
                    line1: '123 Test St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postalCode: '400001',
                    country: 'India'
                },
                carrierDetails: {
                    velocityWarehouseId: 'VEL-WH-123'
                }
            };

            (Warehouse.findById as jest.Mock).mockResolvedValue(mockWarehouse);

            // Mock API call
            const mockHttpClient = (velocityProvider as any).httpClient;
            mockHttpClient.post = jest.fn().mockResolvedValue({
                data: {
                    shipment_id: 'VEL-SHIP-123',
                    order_id: 'ORD-12345',
                    order_created: 1,
                    awb_generated: 0,
                    pickup_generated: 0,
                    assigned_date_time: { date: '2026-02-03', timezone_type: 3, timezone: 'UTC' },
                    applied_weight: null,
                    cod: 1,
                    label_url: null,
                    manifest_url: null,
                    routing_code: null,
                    rto_routing_code: null,
                    pickup_token_number: null
                }
            });

            const result = await velocityProvider.createForwardOrderOnly({
                ...mockShipmentData,
                warehouseId: mockWarehouse._id
            } as any);

            expect(result.shipmentId).toBe('VEL-SHIP-123');
            expect(result.orderId).toBe('ORD-12345');
            expect(result.success).toBe(true);
        });

        it('should throw error if warehouse not found', async () => {
            (Warehouse.findById as jest.Mock).mockResolvedValue(null);

            const mockShipmentData: any = {
                orderNumber: 'ORD-12345',
                warehouseId: new mongoose.Types.ObjectId(),
                destination: { name: 'Test', phone: '9123456789', pincode: '110001' },
                package: { weight: 1 }
            };

            await expect(
                velocityProvider.createForwardOrderOnly(mockShipmentData)
            ).rejects.toThrow(VelocityError);
        });

        it('should validate shipment data', async () => {
            const invalidData: any = {
                orderNumber: '',  // Invalid - empty
                destination: { phone: '123' },  // Invalid phone
                package: { weight: -1 }  // Invalid weight
            };

            await expect(
                velocityProvider.createForwardOrderOnly(invalidData)
            ).rejects.toThrow(VelocityError);
        });
    });

    describe('assignCourier', () => {
        it('should assign courier with specific carrier_id', async () => {
            const mockHttpClient = (velocityProvider as any).httpClient;
            mockHttpClient.post = jest.fn().mockResolvedValue({
                data: {
                    shipment_id: 'VEL-SHIP-123',
                    order_id: 'ORD-12345',
                    awb_code: 'VEL123456789',
                    courier_name: 'Bluedart',
                    courier_company_id: VELOCITY_CARRIER_IDS.BLUEDART_STANDARD,
                    label_url: 'https://s3.amazonaws.com/label.pdf',
                    status: 'created',
                    frwd_charges: {
                        shipping_charges: '50.00',
                        cod_charges: '20.00'
                    },
                    awb_generated: 1,
                    label_generated: 1
                }
            });

            const result = await velocityProvider.assignCourier('VEL-SHIP-123', VELOCITY_CARRIER_IDS.BLUEDART_STANDARD);

            expect(result.trackingNumber).toBe('VEL123456789');
            expect(result.labelUrl).toBe('https://s3.amazonaws.com/label.pdf');
            expect(result.cost).toBe(70); // 50 + 20
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/custom/api/v1/forward-order-shipment',
                expect.objectContaining({
                    shipment_id: 'VEL-SHIP-123',
                    carrier_id: VELOCITY_CARRIER_IDS.BLUEDART_STANDARD
                })
            );
        });

        it('should auto-assign if carrier_id is blank', async () => {
            const mockHttpClient = (velocityProvider as any).httpClient;
            mockHttpClient.post = jest.fn().mockResolvedValue({
                data: {
                    shipment_id: 'VEL-SHIP-123',
                    awb_code: 'VEL987654321',
                    courier_name: 'DTDC',
                    label_url: 'https://s3.amazonaws.com/label2.pdf',
                    frwd_charges: {}
                }
            });

            const result = await velocityProvider.assignCourier('VEL-SHIP-123');

            expect(result.trackingNumber).toBe('VEL987654321');
            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/custom/api/v1/forward-order-shipment',
                expect.objectContaining({
                    shipment_id: 'VEL-SHIP-123',
                    carrier_id: undefined
                })
            );
        });
    });

    describe('createReverseOrderOnly', () => {
        it('should create reverse order without courier assignment', async () => {
            const mockReverseData: CourierReverseShipmentData = {
                orderId: 'ORD-12345',
                pickupAddress: {
                    name: 'John Doe',
                    phone: '9123456789',
                    address: '456 Customer Ave',
                    city: 'Delhi',
                    state: 'Delhi',
                    pincode: '110001',
                    country: 'India',
                    email: 'customer@test.com'
                },
                returnWarehouseId: 'warehouse-123',
                package: {
                    weight: 1.5,
                    length: 20,
                    width: 15,
                    height: 10
                }
            };

            const mockWarehouse = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Main Warehouse',
                contactInfo: {
                    name: 'Warehouse Manager',
                    phone: '9876543210',
                    email: 'warehouse@test.com'
                },
                address: {
                    line1: '123 Test St',
                    line2: '',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postalCode: '400001',
                    country: 'India'
                },
                carrierDetails: {
                    velocityWarehouseId: 'VEL-WH-123'
                }
            };

            (Warehouse.findById as jest.Mock).mockResolvedValue(mockWarehouse);

            const mockHttpClient = (velocityProvider as any).httpClient;
            mockHttpClient.post = jest.fn().mockResolvedValue({
                data: {
                    return_id: 'RTO-VEL-123',
                    order_id: 'RTO-ORD-12345',
                    order_created: 1,
                    awb_generated: 0,
                    pickup_generated: 0,
                    pickup_scheduled_date: null,
                    assigned_date_time: { date: '2026-02-03', timezone_type: 3, timezone: 'UTC' },
                    cod: 0
                }
            });

            const result = await velocityProvider.createReverseOrderOnly(mockReverseData);

            expect(result.returnId).toBe('RTO-VEL-123');
            expect(result.orderId).toBe('RTO-ORD-12345');
            expect(result.success).toBe(true);
        });
    });

    describe('assignReverseCourier', () => {
        it('should assign courier to reverse order', async () => {
            const mockWarehouse = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Main Warehouse',
                contactInfo: {
                    name: 'Warehouse Manager',
                    phone: '9876543210',
                    email: 'warehouse@test.com'
                },
                address: {
                    line1: '123 Test St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postalCode: '400001',
                    country: 'India'
                },
                carrierDetails: { velocityWarehouseId: 'VEL-WH-123' }
            };

            (Warehouse.findById as jest.Mock).mockResolvedValue(mockWarehouse);

            const mockHttpClient = (velocityProvider as any).httpClient;
            mockHttpClient.post = jest.fn().mockResolvedValue({
                data: {
                    shipment_id: 'VEL-RTO-SHIP-123',
                    order_id: 'RTO-ORD-12345',
                    awb_code: 'RTO123456789',
                    courier_name: 'Bluedart',
                    courier_company_id: VELOCITY_CARRIER_IDS.BLUEDART_STANDARD,
                    label_url: 'https://s3.amazonaws.com/rto-label.pdf'
                }
            });

            const result = await (velocityProvider as any).assignReverseCourier(
                'RTO-VEL-123',
                mockWarehouse._id.toString(),
                VELOCITY_CARRIER_IDS.BLUEDART_STANDARD
            );

            expect(result.trackingNumber).toBe('RTO123456789');
            expect(result.labelUrl).toBe('https://s3.amazonaws.com/rto-label.pdf');
            expect(result.courierName).toBe('Bluedart');
        });

        it('should construct label URL if missing', async () => {
            const mockWarehouse = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Main Warehouse',
                contactInfo: {
                    name: 'Warehouse Manager',
                    phone: '9876543210',
                    email: 'warehouse@test.com'
                },
                address: {
                    line1: '123 Test St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postalCode: '400001',
                    country: 'India'
                },
                carrierDetails: { velocityWarehouseId: 'VEL-WH-123' }
            };

            (Warehouse.findById as jest.Mock).mockResolvedValue(mockWarehouse);

            const mockHttpClient = (velocityProvider as any).httpClient;
            mockHttpClient.post = jest.fn().mockResolvedValue({
                data: {
                    awb_code: 'RTO999888777',
                    courier_name: 'Delhivery',
                    label_url: null  // Missing label URL
                }
            });

            const result = await (velocityProvider as any).assignReverseCourier(
                'RTO-VEL-123',
                mockWarehouse._id.toString()
            );

            expect(result.labelUrl).toContain('RTO999888777');
            expect(result.labelUrl).toContain('velocity-shazam-prod.s3.ap-south-1.amazonaws.com');
        });
    });
});
