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
} from '../base/CourierAdapter';
import Warehouse from '../../../database/mongoose/models/Warehouse';
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
  VelocityError,
  CANCELLABLE_STATUSES
} from './VelocityTypes';
import { VelocityAuth } from './VelocityAuth';
import { VelocityMapper } from './VelocityMapper';
import {
  handleVelocityError,
  retryWithBackoff,
  VelocityRateLimiters
} from './VelocityErrorHandler';
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
        address: warehouse.address as any
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
