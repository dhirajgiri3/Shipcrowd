/**
 * Velocity Shipfast Integration Tests
 *
 * End-to-end tests for complete Velocity integration flow
 * Tests: Order → Shipment creation, tracking, cancellation, warehouse sync
 * Coverage targets: 80%+
 */

import axios from 'axios';
import mongoose from 'mongoose';
import { CourierFactory } from '../../../src/core/application/services/courier/courier.factory';
import { Integration, Warehouse } from '../../../src/infrastructure/database/mongoose/models';
import { CourierShipmentData } from '../../../src/infrastructure/external/couriers/base/courier.adapter';
import { VelocityShipfastProvider } from '../../../src/infrastructure/external/couriers/velocity/velocity-shipfast.provider';
import { encryptData } from '../../../src/shared/utils/encryption';

// Mock axios for controlled API responses
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Velocity Shipfast Integration', () => {
  let testCompanyId: mongoose.Types.ObjectId;
  let testWarehouseId: mongoose.Types.ObjectId;
  let testIntegrationId: mongoose.Types.ObjectId;
  let provider: VelocityShipfastProvider;

  beforeAll(async () => {
    // Ensure MongoDB connection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd_test');
    }
  });

  beforeEach(async () => {
    // Clear collections
    await Integration.deleteMany({});
    await Warehouse.deleteMany({});

    // Create test company ID
    testCompanyId = new mongoose.Types.ObjectId();
    testWarehouseId = new mongoose.Types.ObjectId();
    testIntegrationId = new mongoose.Types.ObjectId();

    // Create test warehouse
    const warehouse = await Warehouse.create({
      _id: testWarehouseId,
      companyId: testCompanyId,
      name: 'Test Warehouse',
      contactInfo: {
        name: 'Warehouse Manager',
        phone: '+919876543210',
        email: 'warehouse@test.com'
      },
      address: {
        line1: '123 Main St',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India'
      }
    });
void warehouse;

    // Create test integration with encrypted credentials
    const integration = await Integration.create({
      _id: testIntegrationId,
      companyId: testCompanyId,
      type: 'courier',
      provider: 'velocity-shipfast',
      credentials: {
        username: encryptData('+918860606061'),
        password: encryptData('Velocity@123')
      },
      settings: {
        isActive: true,
        isPrimary: true
      },
      metadata: {
        testWarehouseId: 'WHTEST123'
      }
    });
void integration;

    // Setup axios mock defaults
    mockedAxios.create = jest.fn().mockReturnValue(mockedAxios);
    mockedAxios.interceptors = {
      request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() }
    } as any;

    // Create provider instance
    provider = new VelocityShipfastProvider(testCompanyId);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await Integration.deleteMany({});
    await Warehouse.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Authentication Flow', () => {
    it('should authenticate and cache token', async () => {
      const mockAuthResponse = {
        data: {
          token: 'test-auth-token-12345',
          expires_in: 86400
        }
      };

      mockedAxios.post = jest.fn().mockResolvedValueOnce(mockAuthResponse);

      const token = await (provider as any).auth.authenticate();

      expect(token).toBe('test-auth-token-12345');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth-token'),
        expect.any(Object)
      );

      // Verify token was stored in database
      const updatedIntegration = await Integration.findById(testIntegrationId);
      expect(updatedIntegration?.credentials?.accessToken).toBeDefined();
      expect(updatedIntegration?.metadata?.tokenExpiresAt).toBeDefined();
    });

    it('should use cached token on subsequent calls', async () => {
      const futureExpiry = new Date(Date.now() + 5 * 60 * 60 * 1000);

      // Seed token via auth writer path to stay compatible with encrypted credentials storage.
      await (provider as any).auth['storeToken']('cached-token', futureExpiry);

      const token = await (provider as any).auth.getValidToken();

      expect(token).toBe('cached-token');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should refresh token when expiring soon', async () => {
      const soonExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Set expiring token
      await Integration.findByIdAndUpdate(testIntegrationId, {
        $set: {
          'credentials.accessToken': encryptData('expiring-token'),
          'metadata.tokenExpiresAt': soonExpiry
        }
      });

      const mockAuthResponse = {
        data: {
          token: 'refreshed-token',
          expires_in: 86400
        }
      };

      mockedAxios.post = jest.fn().mockResolvedValueOnce(mockAuthResponse);

      const token = await (provider as any).auth.getValidToken();

      expect(token).toBe('refreshed-token');
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  describe('Warehouse Synchronization', () => {
    it('should create warehouse on Velocity when not synced', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockWarehouseResponse = {
        data: {
          status: 'SUCCESS',
          payload: {
            warehouse_id: 'WHVEL123',
            name: 'Test Warehouse',
            status: 'active'
          }
        }
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce(mockWarehouseResponse); // Warehouse creation

      const warehouse = await Warehouse.findById(testWarehouseId);
      const result = await provider.createWarehouse(warehouse as any);

      expect(result.warehouse_id).toBe('WHVEL123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/warehouse'),
        expect.objectContaining({
          name: 'Test Warehouse',
          phone_number: '9876543210'
        })
      );

      // Verify warehouse was updated with Velocity ID
      const updatedWarehouse = await Warehouse.findById(testWarehouseId);
      expect(updatedWarehouse?.carrierDetails?.velocity?.warehouseId).toBe('WHVEL123');
    });

    it('should use existing Velocity warehouse ID if already synced', async () => {
      // Pre-sync warehouse
      await Warehouse.findByIdAndUpdate(testWarehouseId, {
        $set: {
          'carrierDetails.velocity.warehouseId': 'WHVEL123',
          'carrierDetails.velocity.status': 'synced',
          'carrierDetails.velocity.lastSyncedAt': new Date()
        }
      });

      const warehouse = await Warehouse.findById(testWarehouseId);
      expect(warehouse?.carrierDetails?.velocity?.warehouseId).toBe('WHVEL123');

      // Should not call create warehouse API again
      const mockShipmentData: CourierShipmentData = {
        orderNumber: 'ORD-123',
        origin: {
          name: 'Test Warehouse',
          phone: '9876543210',
          address: '123 Main St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          country: 'India'
        },
        destination: {
          name: 'John Doe',
          phone: '9123456789',
          address: '456 Park Ave',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India'
        },
        package: {
          weight: 1.5,
          length: 20,
          width: 15,
          height: 10,
          declaredValue: 1000
        },
        paymentMode: 'prepaid',
        warehouseId: testWarehouseId
      } as any;

      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockShipmentResponse = {
        data: {
          awb: 'SHPHYB123456789',
          label_url: 'https://labels.velocity.in/AWB123.pdf',
          courier_name: 'BlueDart',
          estimated_delivery: '2025-12-30'
        }
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce(mockShipmentResponse);

      const result = await provider.createShipment(mockShipmentData);
void result;

      // Warehouse creation endpoint should not be called
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Only shipment (Auth skipped in mock)
      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/warehouse'),
        expect.any(Object)
      );
    });
  });

  describe('Shipment Creation Flow', () => {
    let mockShipmentData: CourierShipmentData;

    beforeEach(async () => {
      // Pre-sync warehouse to simplify tests
      await Warehouse.findByIdAndUpdate(testWarehouseId, {
        $set: {
          'carrierDetails.velocity.warehouseId': 'WHVEL123',
          'carrierDetails.velocity.status': 'synced'
        }
      });

      mockShipmentData = {
        orderNumber: 'ORD-12345',
        origin: {
          name: 'Test Warehouse',
          phone: '9876543210',
          address: '123 Main St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          country: 'India'
        },
        destination: {
          name: 'John Doe',
          phone: '9123456789',
          address: '456 Park Ave',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India'
        },
        package: {
          weight: 1.5,
          length: 20,
          width: 15,
          height: 10,
          declaredValue: 1000
        },
        paymentMode: 'prepaid',
        warehouseId: testWarehouseId
      } as any;
    });

    it('should create shipment successfully', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockShipmentResponse = {
        data: {
          status: 1,
          payload: {
            awb_code: 'SHPHYB123456789',
            label_url: 'https://labels.velocity.in/AWB123.pdf',
            courier_name: 'BlueDart',
            order_id: 'ORD-123',
            shipment_id: 'SHP-123'
          }
        }
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce(mockShipmentResponse);

      const result = await provider.createShipment(mockShipmentData);

      expect(result.trackingNumber).toBe('SHPHYB123456789');
      expect(result.labelUrl).toBe('https://labels.velocity.in/AWB123.pdf');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/forward-order-orchestration'),
        expect.objectContaining({
          order_id: 'ORD-12345',
          payment_method: 'Prepaid',
          warehouse_id: 'WHVEL123'
        })
      );
    });

    it('should create COD shipment with correct amount', async () => {
      const codData = {
        ...mockShipmentData,
        paymentMode: 'cod' as const,
        codAmount: 1500
      };

      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockShipmentResponse = {
        data: {
          status: 1,
          payload: {
            awb_code: 'SHPHYB987654321',
            label_url: 'https://labels.velocity.in/AWB456.pdf',
            courier_name: 'Delhivery',
            order_id: 'ORD-12345-COD',
            shipment_id: 'SHP-987'
          }
        }
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce(mockShipmentResponse);

      const result = await provider.createShipment(codData);

      expect(result.trackingNumber).toBe('SHPHYB987654321');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/forward-order-orchestration'),
        expect.objectContaining({
          payment_method: 'COD',
          cod_collectible: 1500
        })
      );
    });

    it('should throw error for missing warehouse', async () => {
      const dataWithoutWarehouse = {
        ...mockShipmentData,
        warehouseId: undefined
      } as any;

      await expect(provider.createShipment(dataWithoutWarehouse)).rejects.toThrow(
        'Warehouse ID is required'
      );
    });

    it('should throw error for invalid shipment data', async () => {
      const invalidData = {
        ...mockShipmentData,
        destination: {
          ...mockShipmentData.destination,
          phone: '123' // Invalid phone
        }
      };

      await expect(provider.createShipment(invalidData)).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      mockedAxios.post = jest.fn()
        .mockRejectedValueOnce({
          response: {
            status: 400,
            data: {
              message: 'Invalid pincode',
              errors: { pincode: 'Pincode not serviceable' }
            }
          }
        });

      await expect(provider.createShipment(mockShipmentData)).rejects.toThrow();
    });
  });

  describe('Tracking Flow', () => {
    it('should track shipment successfully', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockTrackingResponse = {
        data: {
          result: {
            'SHPHYB123456789': {
              tracking_data: {
                awb_code: 'SHPHYB123456789',
                status: 'IT',
                current_location: 'Delhi Hub',
                estimated_delivery: '2025-12-30',
                shipment_track: [
                  {
                    status: 'NEW',
                    description: 'Shipment created',
                    location: 'Mumbai Hub',
                    timestamp: '2025-12-25 10:00'
                  },
                  {
                    status: 'PKP',
                    description: 'Package picked up',
                    location: 'Mumbai Hub',
                    timestamp: '2025-12-26 14:30'
                  },
                  {
                    status: 'IT',
                    description: 'In transit to destination',
                    location: 'Delhi Hub',
                    timestamp: '2025-12-27 08:15'
                  }
                ]
              }
            }
          }
        }
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce(mockTrackingResponse);

      const result = await provider.trackShipment('SHPHYB123456789');

      expect(result.trackingNumber).toBe('SHPHYB123456789');
      expect(result.status).toBe('in_transit');
      expect(result.currentLocation).toBe('Delhi Hub');
      expect(result.timeline).toHaveLength(3);
      expect(result.timeline[0].status).toBe('created');
      expect(result.timeline[1].status).toBe('picked_up');
      expect(result.timeline[2].status).toBe('in_transit');
    });

    it('should throw error for non-existent tracking number', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockTrackingResponse = {
        data: {
          result: {
            'INVALID123': {
              tracking_data: {
                error: 'Shipment not found'
              }
            }
          }
        }
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce(mockTrackingResponse);

      await expect(provider.trackShipment('INVALID123')).rejects.toThrow(
        'Shipment not found'
      );
    });
  });

  describe('Cancellation Flow', () => {
    it('should cancel shipment successfully', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockTrackingResponse = {
        data: {
          result: {
            'SHPHYB123456789': {
              tracking_data: {
                awb_code: 'SHPHYB123456789',
                status: 'NEW',
                shipment_track: []
              }
            }
          }
        }
      };

      const mockCancelResponse = {
        data: {
          status: 'CANCELLED',
          message: 'Order cancelled successfully'
        }
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce(mockTrackingResponse) // Tracking check
        .mockResolvedValueOnce(mockCancelResponse); // Cancel

      const result = await provider.cancelShipment('SHPHYB123456789');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/cancel-order'),
        expect.objectContaining({
          awbs: ['SHPHYB123456789']
        })
      );
    });

    it('should reject cancellation for delivered shipment', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockTrackingResponse = {
        data: {
          result: {
            'SHPHYB123456789': {
              tracking_data: {
                awb_code: 'SHPHYB123456789',
                status: 'DEL',
                shipment_track: []
              }
            }
          }
        }
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce(mockTrackingResponse);

      await expect(provider.cancelShipment('SHPHYB123456789')).rejects.toThrow(
        'not cancellable'
      );
    });
  });

  describe('Serviceability Check', () => {
    it('should return true for serviceable pincode', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockServiceabilityResponse = {
        data: {
          status: 'SUCCESS',
          result: {
            zone: 'zone_a',
            serviceability_results: [
              { carrier_name: 'BlueDart', rate: 50, estimated_delivery_days: 3 }
            ]
          }
        }
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce(mockServiceabilityResponse);

      const result = await provider.checkServiceability('400001');

      expect(result).toBe(true);
    });

    it('should return false for non-serviceable pincode', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      mockedAxios.post = jest.fn()
        .mockRejectedValueOnce({
          response: {
            status: 422,
            data: { message: 'Pincode not serviceable' }
          }
        });

      const result = await provider.checkServiceability('999999');

      expect(result).toBe(false);
    });
  });

  describe('Rate Fetching', () => {
    it('should fetch and sort rates successfully', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockRatesResponse = {
        data: {
          status: 'SUCCESS',
          result: {
            zone: 'zone_a',
            serviceability_results: [
              {
                carrier_name: 'Delhivery',
                rate: 70,
                estimated_delivery_days: 4
              },
              {
                carrier_name: 'BlueDart',
                rate: 50,
                estimated_delivery_days: 3
              },
              {
                carrier_name: 'DTDC',
                rate: 60,
                estimated_delivery_days: 5
              }
            ]
          }
        }
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce(mockRatesResponse);

      const result = await provider.getRates({
        origin: { pincode: '110001' },
        destination: { pincode: '400001' },
        package: { weight: 1.5, length: 10, width: 10, height: 10 },
        paymentMode: 'prepaid'
      });

      expect(result).toHaveLength(3);
      expect(result[0].total).toBe(50); // BlueDart (cheapest)
      expect(result[1].total).toBe(60); // DTDC
      expect(result[2].total).toBe(70); // Delhivery
      expect(result[0].serviceType).toBe('BlueDart');
    });

    it('should throw error when no carriers available', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockRatesResponse = {
        data: {
          status: 'SUCCESS',
          result: {
            serviceability_results: []
          }
        }
      };

      mockedAxios.post = jest.fn()
        .mockResolvedValueOnce(mockRatesResponse);

      await expect(
        provider.getRates({
          origin: { pincode: '110001' },
          destination: { pincode: '999999' },
          package: { weight: 1.5, length: 10, width: 10, height: 10 },
          paymentMode: 'prepaid'
        })
      ).rejects.toThrow('not serviceable');
    });
  });

  describe('CourierFactory Integration', () => {
    it('should create and cache provider instance', async () => {
      const provider1 = await CourierFactory.getProvider('velocity-shipfast', testCompanyId);
      const provider2 = await CourierFactory.getProvider('velocity-shipfast', testCompanyId);

      expect(provider1).toBe(provider2); // Same instance (cached)
      expect(provider1).toBeInstanceOf(VelocityShipfastProvider);
    });

    it('should throw error for inactive integration', async () => {
      // Deactivate integration
      await Integration.findByIdAndUpdate(testIntegrationId, {
        $set: { 'settings.isActive': false }
      });

      await expect(
        CourierFactory.getProvider('velocity-shipfast', testCompanyId)
      ).rejects.toThrow('not found or not active');
    });

    it('should clear cache when requested', async () => {
      const provider1 = await CourierFactory.getProvider('velocity-shipfast', testCompanyId);

      CourierFactory.clearCache(testCompanyId, 'velocity-shipfast');

      const provider2 = await CourierFactory.getProvider('velocity-shipfast', testCompanyId);

      // Should be different instances after cache clear
      expect(provider1).not.toBe(provider2);
    });
  });

  describe('Error Retry Logic', () => {
    it('should retry on server error and succeed', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      const mockSuccessResponse = {
        data: {
          status: 'SUCCESS',
          result: {
            serviceability_results: [
              { carrier_name: 'Delhivery', carrier_id: '18' }
            ]
          }
        }
      };

      mockedAxios.post = jest.fn()
        .mockRejectedValueOnce({ // First attempt fails
          response: { status: 503, data: { error: 'Service unavailable' } }
        })
        .mockResolvedValueOnce(mockSuccessResponse); // Second attempt succeeds

      const result = await provider.checkServiceability('400001');

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2); // 2 attempts, no auth
    });

    it('should not retry on validation error', async () => {
      const mockAuthResponse = {
        data: { token: 'test-token', expires_in: 86400 }
      };
void mockAuthResponse;

      mockedAxios.post = jest.fn()
        .mockRejectedValueOnce({
          response: {
            status: 400,
            data: { message: 'Invalid request' }
          }
        });

      await expect(provider.checkServiceability('INVALID')).rejects.toThrow();

      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // 1 attempt (no retry), no auth
    });
  });
});
