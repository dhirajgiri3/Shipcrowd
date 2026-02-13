/**
 * Velocity Shipfast Courier Provider
 *
 * Complete implementation of Velocity Shipfast API integration (100% Coverage)
 * Extends BaseCourierAdapter for consistency with future courier integrations
 *
 * Core Methods (14 total):
 * 1. createShipment() - POST /forward-order-orchestration
 * 2. trackShipment() - POST /order-tracking
 * 3. getRates() - POST /serviceability (serviceability-derived rates + fallback estimates)
 * 4. cancelShipment() - POST /cancel-order
 * 5. checkServiceability() - POST /serviceability
 * 6. createWarehouse() - POST /warehouse
 * 7. createForwardOrderOnly() - POST /forward-order (Split Flow Step 1)
 * 8. assignCourier() - POST /forward-order-shipment (Split Flow Step 2)
 * 9. createReverseShipment() - POST /reverse-order-orchestration
 * 10. cancelReverseShipment() - POST /cancel-reverse-order
 * 11. schedulePickup() - POST /forward-order-shipment
 * 12. updateDeliveryAddress() - PUT /order
 * 13. requestReattempt() - POST /reattempt-delivery
 * 14. getSettlementStatus() - POST /settlement-status
 *
 * Split Flow Support:
 * - createOrderOnly() / assignCourierToOrder() (Forward)
 * - createReverseOrderOnly() / assignCourierToReverseOrder() (Reverse)
 *
 * Reports & Analytics:
 * - getSummaryReport() - POST /reports (NEW)
 *
 * @see docs/Resources/API/Courier/Shipfast/Shipfast_Integration_Plan.md
 * @see docs/Resources/API/Courier/Shipfast/Implementation_Verification_Report.md
 */

import axios, { AxiosInstance } from 'axios';
import mongoose from 'mongoose';
import {
  BaseCourierAdapter,
  CourierShipmentData,
  CourierShipmentResponse,
  CourierTrackingResponse,
  CourierRateRequest,
  CourierRateResponse,
  CourierReverseShipmentData,
  CourierReverseShipmentResponse,
  CourierPODResponse
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
  VelocitySettlementRequest,
  VelocitySettlementResponse,
  VelocityForwardOrderOnlyResponse,
  VelocityAssignCourierRequest,
  VelocityReverseOrderOnlyResponse,
  VelocityAssignReverseCourierRequest,
  VelocityReportsRequest,
  VelocityReportsResponse,
  VelocityError,
  VELOCITY_STATUS_MAP
} from './velocity.types';
import { VelocityAuth } from './velocity.auth';
import { VelocityMapper } from './velocity.mapper';
import {
  VELOCITY_CARRIER_IDS,
  isDeprecatedVelocityId,
  normalizeVelocityCarrierId
} from './velocity-carrier-ids';
import { handleVelocityError } from './velocity-error-handler';
import { CircuitBreaker, retryWithBackoff } from '../../../../shared/utils/circuit-breaker.util';
import { CourierStatusMapping, StatusMapperService } from '../../../../core/application/services/courier/status-mappings/status-mapper.service';
import { RateLimiterService } from '../../../../core/application/services/courier/rate-limiter-configs/rate-limiter.service';
import { VELOCITY_RATE_LIMITER_CONFIG } from '../../../../core/application/services/courier/rate-limiter-configs/index';
import { VELOCITY_STATUS_MAPPINGS } from '../../../../core/application/services/courier/status-mappings/velocity-status-mappings';
import logger from '../../../../shared/logger/winston.logger';

export class VelocityShipfastProvider extends BaseCourierAdapter {
  private static readonly RATE_FALLBACK_MULTIPLIER: Record<string, number> = {
    [VELOCITY_CARRIER_IDS.BLUEDART_AIR]: 1.35,
    [VELOCITY_CARRIER_IDS.BLUEDART_STANDARD]: 1.2,
    [VELOCITY_CARRIER_IDS.DELHIVERY_EXPRESS]: 1.2,
    [VELOCITY_CARRIER_IDS.DELHIVERY_STANDARD]: 1.1,
    [VELOCITY_CARRIER_IDS.AMAZON_TRANSPORTATION]: 1.15,
    [VELOCITY_CARRIER_IDS.EKART_STANDARD]: 1.05,
    [VELOCITY_CARRIER_IDS.SHADOWFAX_STANDARD]: 1,
  };
  private static readonly warnedDeprecatedCarrierIds = new Set<string>();

  private auth: VelocityAuth;
  private httpClient: AxiosInstance;
  private companyId: mongoose.Types.ObjectId;
  private rateLimiter: RateLimiterService;
  private circuitBreaker: CircuitBreaker;
  private static readonly CANCELLABLE_INTERNAL_STATUSES = new Set([
    'pending',
    'created',
    'pickup_scheduled',
    'out_for_pickup',
    'picked_up',
    'in_transit',
    'manifested'
  ]);
  private static readonly RATE_TIMEOUT_MS = Number(process.env.VELOCITY_RATE_TIMEOUT_MS || 12000);
  private static readonly SERVICEABILITY_TIMEOUT_MS = Number(process.env.VELOCITY_SERVICEABILITY_TIMEOUT_MS || 8000);

  constructor(
    companyId: mongoose.Types.ObjectId,
    baseUrl: string = process.env.VELOCITY_BASE_URL || 'https://shazam.velocity.in'
  ) {
    super('', baseUrl);
    this.companyId = companyId;
    this.auth = new VelocityAuth(companyId, baseUrl);
    this.rateLimiter = new RateLimiterService(VELOCITY_RATE_LIMITER_CONFIG);
    this.circuitBreaker = new CircuitBreaker({
      name: 'VelocityProvider',
      failureThreshold: 5,
      cooldownMs: 60000
    });
    this.ensureStatusMappingsRegistered();

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

  private ensureStatusMappingsRegistered(): void {
    if (StatusMapperService.getRegisteredCouriers().includes('velocity')) {
      return;
    }
    StatusMapperService.register(VELOCITY_STATUS_MAPPINGS);
  }

  private mapVelocityStatus(externalStatus: string): CourierStatusMapping {
    const normalized = String(externalStatus || '').trim();
    try {
      const mapped = StatusMapperService.map('velocity', normalized);
      if (mapped.internalStatus !== 'unknown') {
        return mapped;
      }
    } catch (error) {
      logger.warn('Velocity status mapper unavailable, using fallback map', { externalStatus });
    }

    const mappedInternal = VELOCITY_STATUS_MAP[normalized.toUpperCase()];
    if (mappedInternal) {
      const isTerminal = ['delivered', 'rto', 'lost', 'damaged', 'cancelled'].includes(mappedInternal);
      const statusCategory: CourierStatusMapping['statusCategory'] =
        mappedInternal === 'delivered'
          ? 'delivered'
          : ['rto'].includes(mappedInternal)
            ? 'rto'
            : ['cancelled'].includes(mappedInternal)
              ? 'cancelled'
              : ['lost', 'damaged', 'ndr'].includes(mappedInternal)
                ? 'failed'
                : ['picked_up', 'in_transit', 'out_for_delivery'].includes(mappedInternal)
                  ? 'in_transit'
                  : 'pending';
      return {
        externalStatus: normalized,
        internalStatus: mappedInternal,
        statusCategory,
        isTerminal,
        allowsReattempt: mappedInternal === 'ndr',
        allowsCancellation: VelocityShipfastProvider.CANCELLABLE_INTERNAL_STATUSES.has(mappedInternal),
      };
    }

    return {
      externalStatus: normalized || 'unknown',
      internalStatus: 'unknown',
      statusCategory: 'pending',
      isTerminal: false,
      allowsReattempt: false,
      allowsCancellation: false,
    };
  }

  /**
   * Unwrap Velocity API response from wrapper format
   * Handles both orchestration ({payload:...}) and query ({result:...}) formats
   */
  private unwrapResponse<T>(responseData: any): T {
    // Case 1: Orchestration format { status: 1, payload: {...} }
    if (responseData && typeof responseData === 'object' && 'payload' in responseData) {
      return responseData.payload as T;
    }
    // Case 2: Query format { status: "SUCCESS", result: {...} }
    if (responseData && typeof responseData === 'object' && 'result' in responseData) {
      return responseData.result as T;
    }
    // Case 3: Direct data (no wrapper)
    return responseData as T;
  }

  private buildLabelUrl(labelUrl: unknown, awbCode: unknown): string | undefined {
    if (typeof labelUrl === 'string' && labelUrl.trim()) {
      return labelUrl.trim();
    }
    if (typeof awbCode === 'string' && awbCode.trim()) {
      return `https://velocity-shazam-prod.s3.ap-south-1.amazonaws.com/${awbCode.trim()}_shipping_label.pdf`;
    }
    return undefined;
  }

  private isMalformedVelocityResponse(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error || '');
    const lower = message.toLowerCase();
    return (
      lower.includes('unexpected end of json input') ||
      lower.includes('invalid json') ||
      lower.includes('json parse')
    );
  }

  private async createShipmentViaSplitFlow(
    data: CourierShipmentData,
    carrierId: string | undefined,
    reason: string
  ): Promise<CourierShipmentResponse> {
    logger.warn('Falling back to Velocity split shipment flow', {
      orderId: data.orderNumber,
      companyId: this.companyId.toString(),
      reason,
      carrierId
    });

    const forwardOrder = await this.createForwardOrderOnly(data);
    return this.assignCourier(forwardOrder.shipmentId, carrierId);
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
    let velocityWarehouseId = warehouse.carrierDetails?.velocity?.warehouseId;

    if (!velocityWarehouseId) {
      logger.info('Warehouse not synced with Velocity, creating', {
        warehouseId: (warehouse._id as mongoose.Types.ObjectId).toString(),
        warehouseName: warehouse.name
      });

      const velocityWarehouse = await this.createWarehouse(warehouse as any);
      velocityWarehouseId = velocityWarehouse.warehouse_id;
    }

    // Map data to Velocity format
    const velocityRequest = {
      ...VelocityMapper.mapToForwardOrder(
        data,
        warehouse.name,
        velocityWarehouseId,
        {
          email: warehouse.contactInfo.email || 'noreply@Shipcrowd.com',
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
      ),
      // ✅ Add idempotency key if provided
      idempotency_key: data.idempotencyKey
    };

    // Validate carrier ID if provided
    if (velocityRequest.carrier_id) {
      this.validateCarrierId(velocityRequest.carrier_id);
    }

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/forward-order-orchestration');

    // Make API call with retry
    let response: { data: VelocityShipmentResponse };
    try {
      response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{ data: VelocityShipmentResponse }>(
          async () => {
            logger.info('Creating Velocity shipment', {
              orderId: data.orderNumber,
              companyId: this.companyId.toString(),
              idempotencyKey: data.idempotencyKey
            });

            return await this.httpClient.post<VelocityShipmentResponse>(
              '/custom/api/v1/forward-order-orchestration',
              velocityRequest
            );
          },
          3,
          1000
        );
      });
    } catch (error) {
      if (this.isMalformedVelocityResponse(error)) {
        return this.createShipmentViaSplitFlow(
          data,
          velocityRequest.carrier_id,
          'malformed_or_empty_orchestration_response'
        );
      }
      throw handleVelocityError(error, 'Velocity createShipment');
    }

    const shipment = this.unwrapResponse<VelocityShipmentResponse>(response.data);
    if (!shipment?.awb_code) {
      return this.createShipmentViaSplitFlow(
        data,
        velocityRequest.carrier_id,
        'orchestration_response_missing_awb'
      );
    }
    const resolvedLabelUrl = this.buildLabelUrl(shipment.label_url, shipment.awb_code);

    logger.info('Velocity shipment created successfully', {
      orderId: data.orderNumber,
      awb: shipment.awb_code,
      courier: shipment.courier_name,
      labelUrl: resolvedLabelUrl
    });

    // Map response to generic format
    const shippingCharges = parseFloat(String(shipment.frwd_charges?.shipping_charges || 0));
    const codCharges = parseFloat(String(shipment.frwd_charges?.cod_charges || 0));
    const totalCost = shippingCharges + codCharges;

    return {
      trackingNumber: shipment.awb_code,
      labelUrl: resolvedLabelUrl,
      estimatedDelivery: undefined, // Not provided in create response
      cost: totalCost || 0,
      providerShipmentId: shipment.shipment_id
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
    await this.rateLimiter.acquire('/custom/api/v1/order-tracking');

    // Make API call with retry
    let response: { data: VelocityTrackingResponse[] };
    try {
      response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{ data: VelocityTrackingResponse[] }>(
          async () => {
            logger.debug('Tracking Velocity shipment', { trackingNumber });

            return await this.httpClient.post<VelocityTrackingResponse[]>(
              '/custom/api/v1/order-tracking',
              request
            );
          },
          3,
          1000
        );
      });
    } catch (error) {
      throw handleVelocityError(error, 'Velocity trackShipment');
    }

    // Velocity returns a keyed object: { result: { [AWB]: { tracking_data: ... } } }
    const trackingMap = this.unwrapResponse<Record<string, {
      tracking_data?: {
        shipment_status?: string;
        status?: string;
        status_code?: string;
        current_location?: string;
        location?: string;
        estimated_delivery?: string;
        shipment_track_activities?: any[];
        shipment_track?: any[];
        tracking_history?: any[];
        awb_code?: string;
        error?: string;
      };
    }>>(response.data);

    // Initial API structure might be direct, or inside the wrapper.
    // Based on bug report: { "AWB_NUMBER": { tracking_data: {...} } }
    const shipmentData = trackingMap[trackingNumber];

    if (!shipmentData || !shipmentData.tracking_data) {
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

    const tracking = shipmentData.tracking_data;

    const rawCurrentStatus =
      tracking.shipment_status ||
      tracking.status ||
      tracking.status_code;

    if (!rawCurrentStatus || tracking.error) {
      throw new VelocityError(
        404,
        {
          message: tracking.error || 'Shipment not found',
          error: `No valid tracking status for AWB: ${trackingNumber}`,
          status_code: 404
        },
        false
      );
    }

    // Map status using centralized StatusMapperService
    const statusMapping = this.mapVelocityStatus(rawCurrentStatus);

    // Map tracking history to timeline
    const activityEvents =
      tracking.shipment_track_activities ||
      tracking.shipment_track ||
      tracking.tracking_history ||
      [];

    const timeline = activityEvents.map((event: any) => {
      const rawEventStatus =
        event.activity ||
        event.status ||
        event.status_code ||
        '';
      const eventDateTime =
        event.timestamp ||
        `${event.date || ''} ${event.time || '00:00:00'}`.trim();
      const parsedDate = eventDateTime ? new Date(eventDateTime) : new Date();
      return {
        status: this.mapVelocityStatus(rawEventStatus).internalStatus,
        message: event.activity || event.description || rawEventStatus || '',
        location: event.location || event.current_location || '',
        timestamp: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate
      };
    });

    return {
      trackingNumber: tracking.awb_code || trackingNumber,
      status: statusMapping.internalStatus,
      currentLocation: tracking.current_location || tracking.location || '',
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
      from: request.origin.pincode,
      to: request.destination.pincode,
      payment_mode: request.paymentMode === 'cod' ? 'cod' : 'prepaid',
      shipment_type: request.shipmentType || 'forward'
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/serviceability');

    // Make API call with retry
    let response: { data: VelocityServiceabilityResponse };
    try {
      response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{ data: VelocityServiceabilityResponse }>(
          async () => {
            logger.debug('Checking Velocity serviceability', {
              from: request.origin.pincode,
              to: request.destination.pincode,
              paymentMode: request.paymentMode
            });

            return await this.httpClient.post<VelocityServiceabilityResponse>(
              '/custom/api/v1/serviceability',
              serviceabilityRequest,
              { timeout: VelocityShipfastProvider.RATE_TIMEOUT_MS }
            );
          },
          1,
          500
        );
      });
    } catch (error) {
      throw handleVelocityError(error, 'Velocity getRates');
    }

    const serviceabilityData = this.unwrapResponse<{
      serviceability_results: Array<{
        carrier_id: string;
        carrier_name: string;
      }>;
      zone?: string;
    }>(response.data);
    logger.debug('Velocity serviceability response parsed', {
      from: request.origin.pincode,
      to: request.destination.pincode,
      carriersCount: serviceabilityData.serviceability_results?.length || 0,
      zone: serviceabilityData.zone,
    });

    // Check if any carriers are returned
    if (!serviceabilityData.serviceability_results || serviceabilityData.serviceability_results.length === 0) {
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
    const rates: CourierRateResponse[] = [];

    // Prioritize high-performance carriers based on Velocity Carrier IDs
    const prioritizeCarriers = (carriers: any[]) => {
      const priorityMap: Record<string, number> = {
        [VELOCITY_CARRIER_IDS.DELHIVERY_STANDARD]: 100,
        [VELOCITY_CARRIER_IDS.DELHIVERY_EXPRESS]: 95,
        [VELOCITY_CARRIER_IDS.BLUEDART_STANDARD]: 90,
        [VELOCITY_CARRIER_IDS.BLUEDART_AIR]: 85,
        [VELOCITY_CARRIER_IDS.AMAZON_TRANSPORTATION]: 80,
        [VELOCITY_CARRIER_IDS.SHADOWFAX_STANDARD]: 70,
        [VELOCITY_CARRIER_IDS.EKART_STANDARD]: 60,
      };

      return [...carriers].sort((a, b) => {
        const priorityA = priorityMap[normalizeVelocityCarrierId(a.carrier_id)] || 0;
        const priorityB = priorityMap[normalizeVelocityCarrierId(b.carrier_id)] || 0;

        // If priorities are different, use them
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }

        // If priorities same, fallback to original order (often cheapest)
        return 0;
      });
    };

    const sortedCarriers = prioritizeCarriers(serviceabilityData.serviceability_results);

    for (const carrier of sortedCarriers) {
      try {
        const normalizedCarrierId = normalizeVelocityCarrierId(carrier.carrier_id);

        // Log warning if carrier is deprecated
        if (
          isDeprecatedVelocityId(carrier.carrier_id) &&
          !VelocityShipfastProvider.warnedDeprecatedCarrierIds.has(carrier.carrier_id)
        ) {
          VelocityShipfastProvider.warnedDeprecatedCarrierIds.add(carrier.carrier_id);
          logger.warn('Received deprecated carrier ID in serviceability', {
            carrierId: carrier.carrier_id,
            normalizedCarrierId,
            carrierName: carrier.carrier_name
          });
        }

        const explicitRate = Number((carrier as any).rate || 0);
        const estimatedDays = Number((carrier as any).estimated_delivery_days || 3);
        const total = explicitRate > 0
          ? explicitRate
          : this.estimateFallbackRate(request.package.weight, normalizedCarrierId);

        rates.push({
          basePrice: total,
          taxes: 0,
          total,
          currency: 'INR',
          serviceType: carrier.carrier_name,
          carrierId: normalizedCarrierId,
          zone: serviceabilityData.zone,
          estimatedDeliveryDays: estimatedDays
        });
      } catch (pricingError) {
        logger.warn('Failed to derive carrier rate from serviceability result', {
          carrier: carrier.carrier_name,
          error: pricingError instanceof Error ? pricingError.message : 'Unknown error'
        });
        const normalizedCarrierId = normalizeVelocityCarrierId(carrier.carrier_id);
        const total = this.estimateFallbackRate(request.package.weight, normalizedCarrierId);
        rates.push({
          basePrice: total,
          taxes: 0,
          total,
          currency: 'INR',
          serviceType: carrier.carrier_name,
          carrierId: normalizedCarrierId,
          zone: serviceabilityData.zone,
          estimatedDeliveryDays: 3
        });
      }
    }

    // Sort by total price ascending
    return rates.sort((a, b) => a.total - b.total);
  }

  private estimateFallbackRate(weightKg: number, carrierId?: string): number {
    const safeWeight = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0.5;
    const base = 45 + safeWeight * 18;
    const multiplier = carrierId
      ? VelocityShipfastProvider.RATE_FALLBACK_MULTIPLIER[carrierId] || 1
      : 1;
    return Math.round(base * multiplier * 100) / 100;
  }

  /**
   * 4. Cancel Shipment
   * Maps to: POST /custom/api/v1/cancel-order
   */
  async cancelShipment(trackingNumber: string): Promise<boolean> {
    // First, check if shipment can be cancelled
    try {
      const tracking = await this.trackShipment(trackingNumber);

      const canCancel = VelocityShipfastProvider.CANCELLABLE_INTERNAL_STATUSES.has(
        tracking.status.toLowerCase()
      );

      if (!canCancel) {
        throw new VelocityError(
          400,
          {
            message: 'Shipment is not cancellable in current status',
            error: `Shipment status '${tracking.status}' is not cancellable`,
            status_code: 400
          },
          false
        );
      }
    } catch (error) {
      if (
        error instanceof VelocityError &&
        error.statusCode === 400 &&
        (error.velocityError?.message?.toLowerCase().includes('not cancellable') ||
          error.velocityError?.error?.toLowerCase().includes('not cancellable'))
      ) {
        throw error;
      }
      // If tracking fails, still attempt cancellation
      logger.warn('Could not verify shipment status before cancellation', {
        trackingNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const request: VelocityCancelRequest = {
      awbs: [trackingNumber]
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/cancel-order');

    // Make API call with retry
    let response: { data: VelocityCancelResponse };
    try {
      response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{ data: VelocityCancelResponse }>(
          async () => {
            logger.info('Cancelling Velocity shipment', { trackingNumber });

            return await this.httpClient.post<VelocityCancelResponse>(
              '/custom/api/v1/cancel-order',
              request
            );
          },
          3,
          1000
        );
      });
    } catch (error) {
      throw handleVelocityError(error, 'Velocity cancelShipment');
    }

    const result = this.unwrapResponse<{ message: string }>(response.data);

    logger.info('Velocity shipment cancelled', {
      trackingNumber,
      message: result.message
    });

    // If we got a successful response (either message present or just 200 OK), consider it cancelled
    // The API returns strings like "Bulk Shipment cancellation is in progress..."
    return !!result.message;
  }

  /**
   * 5. Check Serviceability
   * Maps to: POST /custom/api/v1/serviceability
   */
  async checkServiceability(pincode: string, type: 'delivery' | 'pickup' = 'delivery'): Promise<boolean> {
    // Use default origin pincode for check
    const defaultOrigin = process.env.VELOCITY_DEFAULT_ORIGIN_PINCODE || '110001';

    const request: VelocityServiceabilityRequest = {
      from: type === 'delivery' ? defaultOrigin : pincode,
      to: type === 'delivery' ? pincode : defaultOrigin, // Assume return to origin for pickup check
      payment_mode: 'cod',
      shipment_type: type === 'pickup' ? 'return' : 'forward'
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/serviceability');

    try {
      const response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{ data: VelocityServiceabilityResponse }>(
          async () => {
            return await this.httpClient.post<VelocityServiceabilityResponse>(
              '/custom/api/v1/serviceability',
              request,
              { timeout: VelocityShipfastProvider.SERVICEABILITY_TIMEOUT_MS }
            );
          },
          1,
          500
        );
      });

      const serviceabilityData = this.unwrapResponse<{ serviceability_results: any[] }>(response.data);
      return !!(serviceabilityData.serviceability_results && serviceabilityData.serviceability_results.length > 0);
    } catch (error: any) {
      // If pincode not serviceable, API returns 422
      const velocityError = handleVelocityError(error, 'Velocity checkServiceability');
      if (velocityError.statusCode === 422) {
        return false;
      }
      throw velocityError;
    }
  }

  /**
   * 6. Create Warehouse (Extension Method)
   * Maps to: POST /custom/api/v1/warehouse
   */
  async createWarehouse(warehouse: any): Promise<VelocityWarehouseResponse> {
    const request = VelocityMapper.mapToWarehouseRequest(warehouse);

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/warehouse');

    // Make API call with retry
    // Make API call with retry
    let response: { data: VelocityWarehouseResponse };
    try {
      response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{ data: VelocityWarehouseResponse }>(
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
          1000
        );
      });
    } catch (error) {
      throw handleVelocityError(error, 'Velocity createWarehouse');
    }

    const velocityWarehouse = this.unwrapResponse<VelocityWarehouseResponse>(response.data);

    // Store Velocity warehouse ID in local warehouse model
    await Warehouse.findByIdAndUpdate(warehouse._id, {
      $set: {
        'carrierDetails.velocity.warehouseId': velocityWarehouse.warehouse_id,
        'carrierDetails.velocity.status': 'synced',
        'carrierDetails.velocity.lastSyncedAt': new Date()
      }
    });

    logger.info('Velocity warehouse created and synced', {
      warehouseId: warehouse._id.toString(),
      velocityWarehouseId: velocityWarehouse.warehouse_id
    });

    return velocityWarehouse;
  }

  /**
   * Step 1: Create Forward Order Only (no courier assignment)
   * Endpoint: POST /custom/api/v1/forward-order
   */
  async createForwardOrderOnly(data: CourierShipmentData): Promise<{
    shipmentId: string;
    orderId: string;
    success: boolean;
  }> {
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

    // Get warehouse details
    const warehouseId = (data as any).warehouseId;
    if (!warehouseId) {
      throw new VelocityError(400, { message: 'Warehouse ID is required', status_code: 400 }, false);
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new VelocityError(404, { message: 'Warehouse not found', status_code: 404 }, false);
    }

    let velocityWarehouseId = warehouse.carrierDetails?.velocity?.warehouseId;
    if (!velocityWarehouseId) {
      const velocityWarehouse = await this.createWarehouse(warehouse as any);
      velocityWarehouseId = velocityWarehouse.warehouse_id;
    }

    // Map data to Velocity format
    const velocityRequest = {
      ...VelocityMapper.mapToForwardOrder(
        data,
        warehouse.name,
        velocityWarehouseId,
        {
          email: warehouse.contactInfo.email || 'noreply@Shipcrowd.com',
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
      ),
      idempotency_key: data.idempotencyKey
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/forward-order');

    // Make API call with retry
    // Make API call with retry
    const response = await this.circuitBreaker.execute(async () => {
      return await retryWithBackoff<{ data: VelocityForwardOrderOnlyResponse }>(
        async () => {
          logger.info('Creating Velocity forward order only', {
            orderId: data.orderNumber,
            companyId: this.companyId.toString()
          });

          return await this.httpClient.post<VelocityForwardOrderOnlyResponse>(
            '/custom/api/v1/forward-order',
            velocityRequest
          );
        },
        3,
        1000
      );
    });

    const result = this.unwrapResponse<VelocityForwardOrderOnlyResponse>(response.data);

    return {
      shipmentId: result.shipment_id,
      orderId: result.order_id,
      success: !!result.order_created
    };
  }

  /**
   * Step 2: Assign Courier to Existing Order
   * Endpoint: POST /custom/api/v1/forward-order-shipment
   */
  async assignCourier(shipmentId: string, carrierId?: string): Promise<CourierShipmentResponse> {
    if (carrierId) {
      this.validateCarrierId(carrierId);
    }

    const request: VelocityAssignCourierRequest = {
      shipment_id: shipmentId,
      carrier_id: carrierId
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/forward-order-shipment');

    // Make API call with retry
    // Make API call with retry
    const response = await this.circuitBreaker.execute(async () => {
      return await retryWithBackoff<{ data: VelocityShipmentResponse }>(
        async () => {
          logger.info('Assigning courier to Velocity shipment', { shipmentId, carrierId });

          return await this.httpClient.post<VelocityShipmentResponse>(
            '/custom/api/v1/forward-order-shipment',
            request
          );
        },
        3,
        1000
      );
    });

    const shipment = this.unwrapResponse<VelocityShipmentResponse>(response.data);

    const shippingCharges = parseFloat(String(shipment.frwd_charges?.shipping_charges || 0));
    const codCharges = parseFloat(String(shipment.frwd_charges?.cod_charges || 0));
    const totalCost = shippingCharges + codCharges;
    const resolvedLabelUrl = this.buildLabelUrl(shipment.label_url, shipment.awb_code);

    return {
      trackingNumber: shipment.awb_code,
      labelUrl: resolvedLabelUrl,
      estimatedDelivery: undefined,
      cost: totalCost || 0,
      providerShipmentId: shipment.shipment_id
    };
  }

  /**
   * 7. Create Reverse Shipment (RTO Pickup)
   * Maps to: POST /custom/api/v1/reverse-order-orchestration
   *
   * NOTE: Reverse pickup is supported via orchestration. Mock fallback is disabled in production.
   */
  async createReverseShipment(data: CourierReverseShipmentData): Promise<CourierReverseShipmentResponse> {
    const { originalAwb, pickupAddress, returnWarehouseId, package: packageDetails, orderId, reason } = data;
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
    let velocityWarehouseId = warehouse.carrierDetails?.velocity?.warehouseId;
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
      // Pickup Details (Original Destination / Customer)
      pickup_customer_name: pickupAddress.name.split(' ')[0],
      pickup_last_name: pickupAddress.name.split(' ').slice(1).join(' ') || '',
      pickup_address: pickupAddress.address,
      pickup_city: pickupAddress.city,
      pickup_pincode: pickupAddress.pincode,
      pickup_state: pickupAddress.state,
      pickup_country: pickupAddress.country,
      pickup_phone: pickupAddress.phone,
      pickup_email: pickupAddress.email,
      pickup_isd_code: '91',

      // Shipping Details (Return Destination / Warehouse)
      shipping_customer_name: warehouse.contactInfo.name.split(' ')[0],
      shipping_last_name: warehouse.contactInfo.name.split(' ').slice(1).join(' ') || '',
      shipping_address: warehouse.address.line1,
      shipping_address_2: warehouse.address.line2 || '',
      shipping_city: warehouse.address.city,
      shipping_state: warehouse.address.state,
      shipping_country: warehouse.address.country,
      shipping_pincode: warehouse.address.postalCode,
      shipping_phone: warehouse.contactInfo.phone,
      shipping_email: warehouse.contactInfo.email || 'noreply@Shipcrowd.com',
      shipping_isd_code: '91',

      warehouse_id: velocityWarehouseId,

      // Items & Defaults
      order_items: [{
        name: 'Return Item',
        sku: 'RET-ITEM',
        units: 1,
        selling_price: 100,
        discount: 0
      }],
      payment_method: 'Prepaid',
      sub_total: 100,
      total_discount: 0,
      request_pickup: true,

      length: packageDetails.length,
      breadth: packageDetails.width,
      height: packageDetails.height,
      weight: packageDetails.weight,

      channel_id: process.env.VELOCITY_CHANNEL_ID || '27202',
      order_date: VelocityMapper.formatDate(new Date()).split(' ')[0] // Format: YYYY-MM-DD
    } as any; // Cast as any because type definition might be missing these fields

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/reverse-shipment');

    try {
      // Attempt real API call (with retry logic)
      // Attempt real API call (with retry logic)
      const response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{ data: VelocityReverseShipmentResponse }>(
          async () => {
            logger.info('Creating Velocity reverse shipment (RTO)', {
              originalAwb,
              orderId,
              companyId: this.companyId.toString()
            });

            return await this.httpClient.post<VelocityReverseShipmentResponse>(
              '/custom/api/v1/reverse-order-orchestration',
              reverseRequest
            );
          },
          3,
          1000
        );
      });

      const reverseShipment = this.unwrapResponse<VelocityReverseShipmentResponse>(response.data);

      // Manual fallback for label_url if API doesn't return it (it might not for RTOs immediately)
      // Attempt to construct it or leave undefined
      const shipmentResponse = {
        ...reverseShipment,
        original_awb: originalAwb, // Attach for reference
        // Construct label URL if missing but AWB exists (Standard Velocity Pattern)
        label_url: reverseShipment.label_url ||
          (reverseShipment.awb_code ? `https://velocity-shazam-prod.s3.ap-south-1.amazonaws.com/${reverseShipment.awb_code}_shipping_label.pdf` : undefined)
      };

      logger.info('Velocity reverse shipment created successfully', {
        originalAwb,
        reverseAwb: shipmentResponse.awb_code,
        courier: shipmentResponse.courier_name,
        labelUrl: shipmentResponse.label_url
      });

      return {
        trackingNumber: shipmentResponse.awb_code,
        labelUrl: shipmentResponse.label_url,
        orderId: shipmentResponse.order_id,
        courierName: shipmentResponse.courier_name
      };
    } catch (error) {
      logger.error('Velocity reverse shipment API failed', {
        originalAwb,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw handleVelocityError(error, 'Velocity createReverseShipment');
    }
  }

  /**
   * 8. Schedule Pickup for Shipment (using Forward Order Shipment)
   * Maps to: POST /custom/api/v1/forward-order-shipment
   */
  async schedulePickup(data: { providerShipmentId: string }): Promise<any> {
    if (!data.providerShipmentId) {
      logger.warn('Cannot schedule pickup: Missing providerShipmentId');
      return { status: 'failed', message: 'Missing providerShipmentId' };
    }

    const request = {
      shipment_id: data.providerShipmentId
    };

    // Apply rate limiting (reuse schedulePickup limiter or creating new one if needed, using schedulePickup for now)
    await this.rateLimiter.acquire('/custom/api/v1/schedule-pickup');

    try {
      logger.info('Scheduling pickup via Forward Order Shipment', { shipmentId: data.providerShipmentId });

      const response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{ data: any }>(
          async () => {
            return await this.httpClient.post(
              '/custom/api/v1/forward-order-shipment',
              request
            );
          },
          3,
          1000
        );
      });

      logger.info('Velocity pickup scheduled successfully', {
        shipmentId: data.providerShipmentId,
        response: response.data
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to schedule pickup', {
        shipmentId: data.providerShipmentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Allow throwing to indicate failure
      throw error;
    }
  }

  /**
   * 9. Cancel Reverse Shipment
   * Maps to: POST /custom/api/v1/cancel-reverse-order
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
    await this.rateLimiter.acquire('/custom/api/v1/cancel-reverse-shipment');

    try {
      // Attempt real API call
      // Attempt real API call
      const response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{ data: VelocityCancelReverseShipmentResponse }>(
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
          1000
        );
      });

      const cancellation = response.data;

      logger.info('Velocity reverse shipment cancelled', {
        reverseAwb,
        status: cancellation.status
      });

      return cancellation.status === 'CANCELLED';
    } catch (error) {
      logger.error('Velocity cancel reverse shipment API failed', {
        reverseAwb,
        originalAwb,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw handleVelocityError(error, 'Velocity cancelReverseShipment');
    }
  }

  /**
   * Schedule reverse pickup
   * Velocity auto-schedules pickup during reverse order orchestration.
   */
  async scheduleReversePickup(data: {
    reverseAwb?: string;
    originalAwb?: string;
    pickupDate?: Date;
    timeSlot?: string;
    pickupAddress?: {
      address: string;
      pincode: string;
      phone: string;
    };
  }): Promise<{ success: boolean; message?: string; pickupId?: string }> {
    logger.info('Velocity reverse pickup auto-scheduled at creation', {
      reverseAwb: data.reverseAwb,
      originalAwb: data.originalAwb
    });

    return {
      success: true,
      message: 'Reverse pickup is automatically scheduled by Velocity on creation'
    };
  }

  /**
   * Proof of Delivery (POD) retrieval
   * Velocity API does not provide POD download as per current docs.
   */
  async getProofOfDelivery(trackingNumber: string): Promise<CourierPODResponse> {
    return {
      source: 'not_supported',
      message: 'POD download not supported by Velocity API'
    };
  }


  /**
   * 12. Update Delivery Address
   * Maps to: PUT /custom/api/v1/order (Maps to Order Update)
   */
  async updateDeliveryAddress(
    awb: string,
    newAddress: {
      line1: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
    },
    orderId: string, // Required for PUT /order
    phone?: string
  ): Promise<{ success: boolean; message: string }> {
    // We need to map this to "Order Update" which requires full payload structure
    // Since we only want to update address, we send just the fields allowed in update
    const request = {
      order_id: orderId,
      billing_address: newAddress.line1,
      billing_city: newAddress.city,
      billing_state: newAddress.state,
      billing_pincode: newAddress.pincode,
      billing_country: newAddress.country,
      billing_phone: phone, // Optional update
      shipping_is_billing: true // Assume shipping matches billing for update simplicity
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/forward-order-orchestration');

    try {
      const response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{ data: { status: string; message: string } }>(
          async () => {
            logger.info('Updating Velocity delivery address', { awb, orderId });
            return await this.httpClient.put(
              '/custom/api/v1/order',
              request
            );
          },
          3,
          1000
        );
      });

      return {
        success: true,
        message: 'Address updated successfully via Courier API'
      };
    } catch (error) {
      logger.error('Velocity address update failed', {
        awb,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: false, message: 'Failed to update address via Courier API' };
    }
  }

  /**
   * 13. Request Delivery Reattempt
   * Maps to: POST /custom/api/v1/reattempt-delivery
   * Used for NDR (Non-Delivery Report) scenarios where customer wants to reattempt delivery
   */
  async requestReattempt(
    awb: string,
    preferredDate?: Date,
    remarks?: string
  ): Promise<{ success: boolean; message: string; reattemptId?: string }> {
    const request: any = {
      awb,
    };

    if (preferredDate) {
      request.preferred_date = preferredDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    // Velocity API uses 'notes' for remarks according to types
    if (remarks) {
      request.notes = remarks;
    }

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/order-tracking'); // Reuse tracking limiter

    try {
      const response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{
          data: {
            status: string;
            message: string;
            reattempt_id?: string;
          };
        }>(
          async () => {
            logger.info('Requesting Velocity delivery reattempt', { awb, preferredDate });
            return await this.httpClient.post('/custom/api/v1/reattempt-delivery', request);
          },
          3,
          1000
        );
      });

      return {
        success: response.data.status === 'success',
        message: response.data.message || 'Reattempt requested successfully',
        reattemptId: response.data.reattempt_id,
      };
    } catch (error) {
      logger.error('Velocity reattempt request failed', {
        awb,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        message: 'Failed to request reattempt via Courier API',
      };
    }
  }

  /**
   * 14. Get Settlement Status
   * Maps to: POST /custom/api/v1/settlement-status
   * Used for COD remittance tracking
   */
  async getSettlementStatus(remittanceId: string): Promise<VelocitySettlementResponse> {
    const request: VelocitySettlementRequest = {
      remittance_id: remittanceId,
    };

    // Apply rate limiting
    // Using serviceability limiter as it's a general info request, or tracking
    await this.rateLimiter.acquire('/custom/api/v1/order-tracking');

    try {
      const response = await this.circuitBreaker.execute(async () => {
        return await retryWithBackoff<{ data: VelocitySettlementResponse }>(
          async () => {
            logger.info('Fetching Velocity settlement status', { remittanceId });
            return await this.httpClient.post<VelocitySettlementResponse>(
              '/custom/api/v1/settlement-status',
              request
            );
          },
          3,
          1000
        );
      });

      const settlement = response.data;

      logger.info('Velocity settlement status fetched', {
        remittanceId,
        settlementId: settlement.settlement_id,
        status: settlement.status
      });

      return settlement;
    } catch (error) {
      logger.error('Velocity settlement status fetch failed', {
        remittanceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new VelocityError(
        500,
        {
          message: 'Failed to fetch settlement status from Velocity',
          status_code: 500,
        },
        false
      );
    }
  }

  /**
   * Step 1: Create Reverse Order Only (no courier assignment)
   * Endpoint: POST /custom/api/v1/reverse-order
   */
  private async createReverseOrderOnlyInternal(data: CourierReverseShipmentData): Promise<{
    returnId: string;
    orderId: string;
    success: boolean;
  }> {
    const { returnWarehouseId, pickupAddress, package: packageDetails, orderId } = data;

    const warehouse = await Warehouse.findById(returnWarehouseId);
    if (!warehouse) {
      throw new VelocityError(404, { message: 'Return warehouse not found', status_code: 404 }, false);
    }

    let velocityWarehouseId = warehouse.carrierDetails?.velocity?.warehouseId;
    if (!velocityWarehouseId) {
      const velocityWarehouse = await this.createWarehouse(warehouse as any);
      velocityWarehouseId = velocityWarehouse.warehouse_id;
    }

    const reverseRequest = {
      order_id: `RTO-${orderId}`,
      pickup_customer_name: pickupAddress.name.split(' ')[0],
      pickup_last_name: pickupAddress.name.split(' ').slice(1).join(' ') || '',
      pickup_address: pickupAddress.address,
      pickup_city: pickupAddress.city,
      pickup_pincode: pickupAddress.pincode,
      pickup_state: pickupAddress.state,
      pickup_country: pickupAddress.country,
      pickup_phone: pickupAddress.phone,
      pickup_email: pickupAddress.email,
      pickup_isd_code: '91',
      shipping_customer_name: warehouse.contactInfo.name.split(' ')[0],
      shipping_last_name: warehouse.contactInfo.name.split(' ').slice(1).join(' ') || '',
      shipping_address: warehouse.address.line1,
      shipping_address_2: warehouse.address.line2 || '',
      shipping_city: warehouse.address.city,
      shipping_state: warehouse.address.state,
      shipping_country: warehouse.address.country,
      shipping_pincode: warehouse.address.postalCode,
      shipping_phone: warehouse.contactInfo.phone,
      shipping_email: warehouse.contactInfo.email || 'noreply@Shipcrowd.com',
      shipping_isd_code: '91',
      warehouse_id: velocityWarehouseId,
      order_items: [{ name: 'Return Item', sku: 'RET-ITEM', units: 1, selling_price: 100, discount: 0 }],
      payment_method: 'Prepaid',
      sub_total: 100,
      total_discount: 0,
      length: packageDetails.length,
      breadth: packageDetails.width,
      height: packageDetails.height,
      weight: packageDetails.weight,
      channel_id: process.env.VELOCITY_CHANNEL_ID || '27202',
      order_date: VelocityMapper.formatDate(new Date()).split(' ')[0]
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/reverse-order');

    // Make API call with retry
    const response = await this.circuitBreaker.execute(async () => {
      return await retryWithBackoff<{ data: VelocityReverseOrderOnlyResponse }>(
        async () => {
          logger.info('Creating Velocity reverse order only', { orderId });

          return await this.httpClient.post<VelocityReverseOrderOnlyResponse>(
            '/custom/api/v1/reverse-order',
            reverseRequest
          );
        },
        3,
        1000
      );
    });

    const result = this.unwrapResponse<VelocityReverseOrderOnlyResponse>(response.data);

    return {
      returnId: result.return_id,
      orderId: result.order_id,
      success: !!result.order_created
    };
  }

  /**
   * Step 2: Assign Courier to Reverse Order
   * Endpoint: POST /custom/api/v1/reverse-order-shipment
   */
  private async assignReverseCourier(
    returnId: string,
    warehouseId: string,
    carrierId?: string
  ): Promise<CourierReverseShipmentResponse> {
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new VelocityError(404, { message: 'Warehouse not found', status_code: 404 }, false);
    }

    let velocityWarehouseId = warehouse.carrierDetails?.velocity?.warehouseId;
    if (!velocityWarehouseId) {
      const velocityWarehouse = await this.createWarehouse(warehouse as any);
      velocityWarehouseId = velocityWarehouse.warehouse_id;
    }

    const request: VelocityAssignReverseCourierRequest = {
      return_id: returnId,
      warehouse_id: velocityWarehouseId,
      carrier_id: carrierId
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/assign-reverse-courier');

    // Make API call with retry
    const response = await this.circuitBreaker.execute(async () => {
      return await retryWithBackoff<{ data: VelocityReverseShipmentResponse }>(
        async () => {
          logger.info('Assigning courier to Velocity reverse shipment', { returnId, carrierId });

          return await this.httpClient.post<VelocityReverseShipmentResponse>(
            '/custom/api/v1/reverse-order-shipment',
            request
          );
        },
        3,
        1000
      );
    });

    const shipment = this.unwrapResponse<VelocityReverseShipmentResponse>(response.data);

    return {
      trackingNumber: shipment.awb_code,
      labelUrl: shipment.label_url ||
        (shipment.awb_code ? `https://velocity-shazam-prod.s3.ap-south-1.amazonaws.com/${shipment.awb_code}_shipping_label.pdf` : undefined),
      orderId: shipment.order_id,
      courierName: shipment.courier_name
    };
  }

  /**
   * Internal implementation for getSummaryReport
   * Endpoint: POST /custom/api/v1/reports
   */
  private async getSummaryReportInternal(startDate: Date, endDate: Date, type: 'forward' | 'return'): Promise<VelocityReportsResponse> {
    const request: VelocityReportsRequest = {
      start_date_time: startDate.toISOString(),
      end_date_time: endDate.toISOString(),
      shipment_type: type
    };

    // Apply rate limiting
    await this.rateLimiter.acquire('/custom/api/v1/reports');

    // Make API call with retry
    const response = await this.circuitBreaker.execute(async () => {
      return await retryWithBackoff<{ data: VelocityReportsResponse }>(
        async () => {
          logger.info('Fetching Velocity summary report', { startDate, endDate, shipmentType: type });

          return await this.httpClient.post<VelocityReportsResponse>(
            '/custom/api/v1/reports',
            request
          );
        },
        3,
        1000
      );
    });

    return this.unwrapResponse<VelocityReportsResponse>(response.data);
  }

  // ==================== ICourierAdapter Optional Method Implementations ====================

  /**
   * Create order without courier assignment (Split Flow Step 1)
   */
  async createOrderOnly(data: CourierShipmentData) {
    return this.createForwardOrderOnly(data);
  }

  /**
   * Assign courier to existing order (Split Flow Step 2)
   */
  async assignCourierToOrder(shipmentId: string, carrierId?: string) {
    return this.assignCourier(shipmentId, carrierId);
  }

  /**
   * Create reverse order without courier assignment (Split Flow Step 1)
   */
  async createReverseOrderOnly(data: CourierReverseShipmentData) {
    return this.createReverseOrderOnlyInternal(data);
  }

  /**
   * Assign courier to reverse order (Split Flow Step 2)
   */
  async assignCourierToReverseOrder(returnId: string, warehouseId: string, carrierId?: string) {
    return this.assignReverseCourier(returnId, warehouseId, carrierId);
  }

  /**
   * Get summary reports (optional interface method)
   */
  async getSummaryReport(startDate: Date, endDate: Date, type: 'forward' | 'return') {
    return this.getSummaryReportInternal(startDate, endDate, type);
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

  /**
   * Internal validation for carrier IDs
   */
  private validateCarrierId(carrierId: string): void {
    if (
      isDeprecatedVelocityId(carrierId) &&
      !VelocityShipfastProvider.warnedDeprecatedCarrierIds.has(carrierId)
    ) {
      VelocityShipfastProvider.warnedDeprecatedCarrierIds.add(carrierId);
      logger.warn('Using deprecated Velocity carrier ID', {
        carrierId,
        normalizedCarrierId: normalizeVelocityCarrierId(carrierId),
        recommendation: 'Update to latest carrier IDs from documentation'
      });
    }
  }
}
