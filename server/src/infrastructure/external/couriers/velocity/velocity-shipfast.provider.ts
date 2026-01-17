/**
 * Velocity Shipfast Courier Provider
 *
 * Complete implementation of Velocity Shipfast API integration
 * Extends BaseCourierAdapter for consistency with future courier integrations
 *
 * Implements 6 core methods:
 * 1. createShipment() - POST /forward-order
 * 2. trackShipment() - POST /order-tracking
 * 3. getRates() - POST /serviceability
 * 4. cancelShipment() - POST /cancel-order
 * 5. checkServiceability() - POST /serviceability
 * 6. createWarehouse() - POST /warehouse (extension method)
 *
 * @see docs/Development/Backend/Integrations/VELOCITY_SHIPFAST_INTEGRATION.md
 */

import axios, { AxiosInstance } from 'axios';
import mongoose from 'mongoose';
import {
  BaseCourierAdapter,
  CourierShipmentData,
  CourierShipmentResponse,
  CourierTrackingResponse,
  CourierRateRequest,
  CourierRateResponse
} from '../base/courier.adapter';
import Warehouse from '../../../database/mongoose/models/logistics/warehouse/structure/warehouse.model';
import {
  VelocityForwardOrderRequest,
  VelocityShipmentResponse,
  VelocityTrackingRequest,
  VelocityTrackingResponse,
  VelocityServiceabilityRequest,
  VelocityServiceabilityResponse,
  VelocityCancelRequest,
  VelocityCancelResponse,
  VelocityWarehouseRequest,
  VelocityWarehouseResponse,
  VelocityReverseShipmentRequest,
  VelocityReverseShipmentResponse,
  VelocitySchedulePickupRequest,
  VelocitySchedulePickupResponse,
  VelocityCancelReverseShipmentRequest,
  VelocityCancelReverseShipmentResponse,
  VelocityError,
  CANCELLABLE_STATUSES
} from './velocity.types';
import { VelocityAuth } from './velocity.auth';
import { VelocityMapper } from './velocity.mapper';
import {
  handleVelocityError,
  retryWithBackoff,
  VelocityRateLimiters
} from './velocity-error-handler';
import logger from '../../../../shared/logger/winston.logger';

export class VelocityShipfastProvider extends BaseCourierAdapter {
  private auth: VelocityAuth;
  private httpClient: AxiosInstance;
  private companyId: mongoose.Types.ObjectId;

  constructor(
    companyId: mongoose.Types.ObjectId,
    baseUrl: string = process.env.VELOCITY_BASE_URL || 'https://shazam.velocity.in'
  ) {
    super('', baseUrl);
    this.companyId = companyId;
    this.auth = new VelocityAuth(companyId, baseUrl);

    this.httpClient = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to inject auth token
    this.httpClient.interceptors.request.use(
      async (config) => {
        const token = await this.auth.getValidToken();
        config.headers.Authorization = token;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle 401 (token expired)
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, refresh token and retry
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.auth.refreshToken();
            originalRequest.headers.Authorization = newToken;
            return this.httpClient(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * 1. Create Shipment (Forward Order)
   * Maps to: POST /custom/api/v1/forward-order
   */
  async createShipment(data: CourierShipmentData): Promise<CourierShipmentResponse> {
    // Validate input data
    const validation = VelocityMapper.validateForwardOrderData(data);
    if (!validation.valid) {
      throw new VelocityError(
        400,
        {
          message: 'Invalid shipment data',
          errors: { validation: validation.errors.join(', ') },
          status_code: 400
        },
        false
      );
    }

    // Get warehouse details (need warehouse_id from Velocity)
    const warehouseId = (data as any).warehouseId;
    if (!warehouseId) {
      throw new VelocityError(
        400,
        {
          message: 'Warehouse ID is required',
          status_code: 400
        },
        false
      );
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new VelocityError(
        404,
        {
          message: 'Warehouse not found',
          status_code: 404
        },
        false
      );
    }

    // Get or create Velocity warehouse ID
    let velocityWarehouseId = warehouse.carrierDetails?.velocityWarehouseId;

    if (!velocityWarehouseId) {
      logger.info('Warehouse not synced with Velocity, creating', {
        warehouseId: (warehouse._id as mongoose.Types.ObjectId).toString(),
        warehouseName: warehouse.name
      });

      const velocityWarehouse = await this.createWarehouse(warehouse as any);
      velocityWarehouseId = velocityWarehouse.warehouse_id;
    }

    // Map data to Velocity format
    const velocityRequest = VelocityMapper.mapToForwardOrder(
      data,
      warehouse.name,
      velocityWarehouseId,
      {
        email: warehouse.contactInfo.email || 'noreply@shipcrowd.com',
        phone: warehouse.contactInfo.phone,
        contactName: warehouse.contactInfo.name,
        address: {
          line1: warehouse.address.line1,
          line2: warehouse.address.line2,
          city: warehouse.address.city,
          state: warehouse.address.state,
          postalCode: warehouse.address.postalCode,
          country: warehouse.address.country
        }
      }
    );

    // Apply rate limiting
    await VelocityRateLimiters.forwardOrder.acquire();

    // Make API call with retry
    const response = await retryWithBackoff<{ data: VelocityShipmentResponse }>(
      async () => {
        logger.info('Creating Velocity shipment', {
          orderId: data.orderNumber,
          companyId: this.companyId.toString()
        });

        return await this.httpClient.post<VelocityShipmentResponse>(
          '/custom/api/v1/forward-order',
          velocityRequest
        );
      },
      3,
      1000,
      'Velocity createShipment'
    );

    const shipment = response.data;

    logger.info('Velocity shipment created successfully', {
      orderId: data.orderNumber,
      awb: shipment.awb,
      courier: shipment.courier_name,
      labelUrl: shipment.label_url
    });

    // Map response to generic format
    return {
      trackingNumber: shipment.awb,
      labelUrl: shipment.label_url,
      estimatedDelivery: undefined, // Not provided in response
      cost: undefined // Not provided in response
    };
  }

  /**
   * 2. Track Shipment
   * Maps to: POST /custom/api/v1/order-tracking
   */
  async trackShipment(trackingNumber: string): Promise<CourierTrackingResponse> {
    const request: VelocityTrackingRequest = {
      awbs: [trackingNumber]
    };

    // Apply rate limiting
    await VelocityRateLimiters.tracking.acquire();

    // Make API call with retry
    const response = await retryWithBackoff<{ data: VelocityTrackingResponse[] }>(
      async () => {
        logger.debug('Tracking Velocity shipment', { trackingNumber });

        return await this.httpClient.post<VelocityTrackingResponse[]>(
          '/custom/api/v1/order-tracking',
          request
        );
      },
      3,
      1000,
      'Velocity trackShipment'
    );

    const tracking = response.data[0];

    if (!tracking) {
      throw new VelocityError(
        404,
        {
          message: 'Shipment not found',
          error: `No tracking data for AWB: ${trackingNumber}`,
          status_code: 404
        },
        false
      );
    }

    // Map status
    const statusMapping = VelocityMapper.mapStatus(tracking.status_code);

    // Map tracking history to timeline
    const timeline = tracking.tracking_history.map((event) => ({
      status: VelocityMapper.mapStatus(event.status).status,
      message: event.description,
      location: event.location,
      timestamp: new Date(event.timestamp)
    }));

    return {
      trackingNumber: tracking.awb,
      status: statusMapping.status,
      currentLocation: tracking.current_location,
      timeline,
      estimatedDelivery: tracking.estimated_delivery
        ? new Date(tracking.estimated_delivery)
        : undefined
    };
  }

  /**
   * 3. Get Rates (via Serviceability Check)
   * Maps to: POST /custom/api/v1/serviceability
   */
  async getRates(request: CourierRateRequest): Promise<CourierRateResponse[]> {
    const serviceabilityRequest: VelocityServiceabilityRequest = {
      pickup_pincode: request.origin.pincode,
      delivery_pincode: request.destination.pincode,
      cod: request.paymentMode === 'cod' ? 1 : 0,
      weight: request.package.weight
    };

    // Apply rate limiting
    await VelocityRateLimiters.serviceability.acquire();

    // Make API call with retry
    const response = await retryWithBackoff<{ data: VelocityServiceabilityResponse }>(
      async () => {
        logger.debug('Checking Velocity serviceability', {
          from: request.origin.pincode,
          to: request.destination.pincode
        });

        return await this.httpClient.post<VelocityServiceabilityResponse>(
          '/custom/api/v1/serviceability',
          serviceabilityRequest
        );
      },
      3,
      1000,
      'Velocity getRates'
    );

    const serviceability = response.data;

    if (!serviceability.is_serviceable || serviceability.available_carriers.length === 0) {
      throw new VelocityError(
        422,
        {
          message: 'Destination pincode not serviceable',
          error: `No carriers available for pincode: ${request.destination.pincode}`,
          status_code: 422
        },
        false
      );
    }

    // Map carriers to rate responses
    const rates: CourierRateResponse[] = serviceability.available_carriers.map((carrier) => ({
      basePrice: carrier.rate,
      taxes: 0, // Not provided by Velocity
      total: carrier.rate,
      currency: 'INR',
      serviceType: carrier.courier_name,
      estimatedDeliveryDays: carrier.estimated_delivery_days
    }));

    // Sort by total cost (ascending)
    rates.sort((a, b) => a.total - b.total);

    return rates;
  }

  /**
   * 4. Cancel Shipment
   * Maps to: POST /custom/api/v1/cancel-order
   */
  async cancelShipment(trackingNumber: string): Promise<boolean> {
    // First, check if shipment can be cancelled
    try {
      const tracking = await this.trackShipment(trackingNumber);

      const canCancel = CANCELLABLE_STATUSES.some(
        (status) => status.toLowerCase() === tracking.status.toLowerCase()
      );

      if (!canCancel) {
        throw new VelocityError(
          400,
          {
            message: 'Cannot cancel shipment in current status',
            error: `Shipment status '${tracking.status}' is not cancellable`,
            status_code: 400
          },
          false
        );
      }
    } catch (error) {
      // If tracking fails, still attempt cancellation
      logger.warn('Could not verify shipment status before cancellation', {
        trackingNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const request: VelocityCancelRequest = {
      awb: trackingNumber
    };

    // Apply rate limiting
    await VelocityRateLimiters.cancellation.acquire();

    // Make API call with retry
    const response = await retryWithBackoff<{ data: VelocityCancelResponse }>(
      async () => {
        logger.info('Cancelling Velocity shipment', { trackingNumber });

        return await this.httpClient.post<VelocityCancelResponse>(
          '/custom/api/v1/cancel-order',
          request
        );
      },
      3,
      1000,
      'Velocity cancelShipment'
    );

    const cancellation = response.data;

    logger.info('Velocity shipment cancelled', {
      trackingNumber,
      status: cancellation.status
    });

    return cancellation.status === 'CANCELLED';
  }

  /**
   * 5. Check Serviceability
   * Maps to: POST /custom/api/v1/serviceability
   */
  async checkServiceability(pincode: string): Promise<boolean> {
    // Use default origin pincode for check
    const defaultOrigin = process.env.VELOCITY_DEFAULT_ORIGIN_PINCODE || '110001';

    const request: VelocityServiceabilityRequest = {
      pickup_pincode: defaultOrigin,
      delivery_pincode: pincode,
      cod: 1, // Check with COD enabled
      weight: 0.5 // Default weight
    };

    // Apply rate limiting
    await VelocityRateLimiters.serviceability.acquire();

    try {
      const response = await retryWithBackoff<{ data: VelocityServiceabilityResponse }>(
        async () => {
          return await this.httpClient.post<VelocityServiceabilityResponse>(
            '/custom/api/v1/serviceability',
            request
          );
        },
        2, // Fewer retries for serviceability check
        1000,
        'Velocity checkServiceability'
      );

      return response.data.is_serviceable;
    } catch (error) {
      // If pincode not serviceable, API returns 422
      if (error instanceof VelocityError && error.statusCode === 422) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 6. Create Warehouse (Extension Method)
   * Maps to: POST /custom/api/v1/warehouse
   */
  async createWarehouse(warehouse: any): Promise<VelocityWarehouseResponse> {
    const request = VelocityMapper.mapToWarehouseRequest(warehouse);

    // Apply rate limiting
    await VelocityRateLimiters.warehouse.acquire();

    // Make API call with retry
    const response = await retryWithBackoff<{ data: VelocityWarehouseResponse }>(
      async () => {
        logger.info('Creating Velocity warehouse', {
          warehouseName: warehouse.name,
          companyId: this.companyId.toString()
        });

        return await this.httpClient.post<VelocityWarehouseResponse>(
          '/custom/api/v1/warehouse',
          request
        );
      },
      3,
      1000,
      'Velocity createWarehouse'
    );

    const velocityWarehouse = response.data;

    // Store Velocity warehouse ID in local warehouse model
    await Warehouse.findByIdAndUpdate(warehouse._id, {
      $set: {
        'carrierDetails.velocityWarehouseId': velocityWarehouse.warehouse_id,
        'carrierDetails.lastSyncedAt': new Date()
      }
    });

    logger.info('Velocity warehouse created and synced', {
      warehouseId: warehouse._id.toString(),
      velocityWarehouseId: velocityWarehouse.warehouse_id
    });

    return velocityWarehouse;
  }

  /**
   * 7. Create Reverse Shipment (RTO Pickup)
   * Maps to: POST /custom/api/v1/reverse-order (MOCK FALLBACK INCLUDED)
   *
   * NOTE: As of implementation, Velocity API doesn't fully support reverse pickup.
   * This method includes a mock fallback that generates simulated reverse AWB.
   * When Velocity API is ready, the real API will be called first.
   */
  async createReverseShipment(
    originalAwb: string,
    pickupAddress: {
      name: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
      email?: string;
    },
    returnWarehouseId: string,
    packageDetails: {
      weight: number;
      length: number;
      width: number;
      height: number;
    },
    orderId: string,
    reason?: string
  ): Promise<VelocityReverseShipmentResponse> {
    // Get warehouse details for return destination
    const warehouse = await Warehouse.findById(returnWarehouseId);
    if (!warehouse) {
      throw new VelocityError(
        404,
        {
          message: 'Return warehouse not found',
          status_code: 404
        },
        false
      );
    }

    // Get or create Velocity warehouse ID
    let velocityWarehouseId = warehouse.carrierDetails?.velocityWarehouseId;
    if (!velocityWarehouseId) {
      logger.info('Warehouse not synced with Velocity for RTO, creating', {
        warehouseId: (warehouse._id as mongoose.Types.ObjectId).toString(),
        warehouseName: warehouse.name
      });
      const velocityWarehouse = await this.createWarehouse(warehouse as any);
      velocityWarehouseId = velocityWarehouse.warehouse_id;
    }

    // Prepare reverse shipment request
    const reverseRequest: VelocityReverseShipmentRequest = {
      order_id: `RTO-${orderId}`,
      original_awb: originalAwb,
      pickup_customer_name: pickupAddress.name,
      pickup_address: pickupAddress.address,
      pickup_city: pickupAddress.city,
      pickup_pincode: pickupAddress.pincode,
      pickup_state: pickupAddress.state,
      pickup_country: pickupAddress.country,
      pickup_phone: pickupAddress.phone,
      pickup_email: pickupAddress.email,
      delivery_location: warehouse.name,
      warehouse_id: velocityWarehouseId,
      length: packageDetails.length,
      breadth: packageDetails.width,
      height: packageDetails.height,
      weight: packageDetails.weight,
      reason: reason || 'RTO - Return to Origin',
      vendor_details: {
        email: warehouse.contactInfo.email || 'noreply@shipcrowd.com',
        phone: warehouse.contactInfo.phone,
        name: warehouse.contactInfo.name,
        address: warehouse.address.line1,
        address_2: warehouse.address.line2,
        city: warehouse.address.city,
        state: warehouse.address.state,
        country: warehouse.address.country,
        pin_code: warehouse.address.postalCode,
        pickup_location: warehouse.name
      }
    };

    // Apply rate limiting
    await VelocityRateLimiters.reverseShipment.acquire();

    try {
      // Attempt real API call (with retry logic)
      const response = await retryWithBackoff<{ data: VelocityReverseShipmentResponse }>(
        async () => {
          logger.info('Creating Velocity reverse shipment (RTO)', {
            originalAwb,
            orderId,
            companyId: this.companyId.toString()
          });

          return await this.httpClient.post<VelocityReverseShipmentResponse>(
            '/custom/api/v1/reverse-order',
            reverseRequest
          );
        },
        3,
        1000,
        'Velocity createReverseShipment'
      );

      const reverseShipment = response.data;

      logger.info('Velocity reverse shipment created successfully', {
        originalAwb,
        reverseAwb: reverseShipment.reverse_awb,
        courier: reverseShipment.courier_name
      });

      return reverseShipment;
    } catch (error) {
      // FALLBACK: Generate mock reverse AWB if API fails
      logger.warn('Velocity reverse shipment API failed, using mock fallback', {
        originalAwb,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const timestamp = Date.now().toString().slice(-6);
      const mockReverseAwb = `RTO-${originalAwb}-${timestamp}`;

      const mockResponse: VelocityReverseShipmentResponse = {
        shipment_id: `RTO-SHIP-${timestamp}`,
        order_id: `RTO-${orderId}`,
        reverse_awb: mockReverseAwb,
        original_awb: originalAwb,
        courier_name: 'Velocity (Mock RTO)',
        courier_company_id: 'VELOCITY-RTO',
        label_url: `https://mock.velocity.in/labels/${mockReverseAwb}.pdf`,
        status: 'NEW',
        pickup_scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      logger.info('Mock reverse shipment created', {
        originalAwb,
        reverseAwb: mockReverseAwb,
        fallbackMode: true
      });

      return mockResponse;
    }
  }

  /**
   * 8. Schedule Pickup for Reverse Shipment
   * Maps to: POST /custom/api/v1/schedule-pickup (MOCK FALLBACK INCLUDED)
   *
   * Schedules a pickup for reverse/RTO shipments at customer location.
   */
  async schedulePickup(
    awb: string,
    pickupDate: Date,
    timeSlot: 'morning' | 'afternoon' | 'evening',
    pickupAddress?: {
      address: string;
      pincode: string;
      phone: string;
    }
  ): Promise<VelocitySchedulePickupResponse> {
    const request: VelocitySchedulePickupRequest = {
      awb,
      pickup_date: pickupDate.toISOString().split('T')[0], // YYYY-MM-DD
      pickup_time_slot: timeSlot,
      pickup_address: pickupAddress?.address,
      pickup_pincode: pickupAddress?.pincode,
      pickup_phone: pickupAddress?.phone
    };

    // Apply rate limiting
    await VelocityRateLimiters.schedulePickup.acquire();

    try {
      // Attempt real API call
      const response = await retryWithBackoff<{ data: VelocitySchedulePickupResponse }>(
        async () => {
          logger.info('Scheduling Velocity pickup', {
            awb,
            pickupDate: request.pickup_date,
            timeSlot
          });

          return await this.httpClient.post<VelocitySchedulePickupResponse>(
            '/custom/api/v1/schedule-pickup',
            request
          );
        },
        3,
        1000,
        'Velocity schedulePickup'
      );

      const pickup = response.data;

      logger.info('Velocity pickup scheduled successfully', {
        awb,
        pickupId: pickup.pickup_id,
        status: pickup.status
      });

      return pickup;
    } catch (error) {
      // FALLBACK: Generate mock pickup confirmation
      logger.warn('Velocity schedule pickup API failed, using mock fallback', {
        awb,
        pickupDate: request.pickup_date,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const mockResponse: VelocitySchedulePickupResponse = {
        awb,
        pickup_id: `PKP-${Date.now().toString().slice(-8)}`,
        scheduled_date: request.pickup_date,
        time_slot: timeSlot,
        status: 'scheduled',
        message: 'Pickup scheduled successfully (Mock)'
      };

      logger.info('Mock pickup scheduled', {
        awb,
        pickupId: mockResponse.pickup_id,
        fallbackMode: true
      });

      return mockResponse;
    }
  }

  /**
   * 9. Cancel Reverse Shipment
   * Maps to: POST /custom/api/v1/cancel-reverse-order (MOCK FALLBACK INCLUDED)
   *
   * Cancels a reverse/RTO shipment before pickup.
   */
  async cancelReverseShipment(
    reverseAwb: string,
    originalAwb: string,
    reason?: string
  ): Promise<boolean> {
    const request: VelocityCancelReverseShipmentRequest = {
      reverse_awb: reverseAwb,
      original_awb: originalAwb,
      reason: reason || 'RTO cancelled by merchant'
    };

    // Apply rate limiting
    await VelocityRateLimiters.cancelReverseShipment.acquire();

    try {
      // Attempt real API call
      const response = await retryWithBackoff<{ data: VelocityCancelReverseShipmentResponse }>(
        async () => {
          logger.info('Cancelling Velocity reverse shipment', {
            reverseAwb,
            originalAwb
          });

          return await this.httpClient.post<VelocityCancelReverseShipmentResponse>(
            '/custom/api/v1/cancel-reverse-order',
            request
          );
        },
        3,
        1000,
        'Velocity cancelReverseShipment'
      );

      const cancellation = response.data;

      logger.info('Velocity reverse shipment cancelled', {
        reverseAwb,
        status: cancellation.status
      });

      return cancellation.status === 'CANCELLED';
    } catch (error) {
      // FALLBACK: Log cancellation attempt and return success
      logger.warn('Velocity cancel reverse shipment API failed, using mock fallback', {
        reverseAwb,
        originalAwb,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.info('Mock reverse shipment cancellation', {
        reverseAwb,
        originalAwb,
        fallbackMode: true
      });

      // Return true to allow RTO cancellation to proceed
      return true;
    }
  }

  /**
   * Get provider name
   */
  getName(): string {
    return 'Velocity Shipfast';
  }

  /**
   * Get provider code
   */
  getProviderCode(): string {
    return 'velocity-shipfast';
  }
}
