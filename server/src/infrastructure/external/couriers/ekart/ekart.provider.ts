/**
 * Ekart Logistics Courier Provider
 * 
 * Implements the ICourierAdapter interface for Ekart Logistics.
 * Handles:
 * - Authentication (via EkartAuth)
 * - Shipment Creation (Forward & Reverse)
 * - Tracking
 * - Serviceability Checks
 * - Rate Estimation
 * - Cancellations
 * - Manifesting & Label Generation
 * 
 * @see docs/Resources/API/Courier/Ekart/Ekart_API.md
 */

import axios, { AxiosInstance } from 'axios';
import mongoose from 'mongoose';
import {
CourierRateRequest,
CourierRateResponse,
CourierReverseShipmentData,
CourierReverseShipmentResponse,
CourierShipmentData,
CourierShipmentResponse,
CourierTrackingResponse,
ICourierAdapter
} from '../base/courier.adapter';

import { EkartAuth } from './ekart.auth';
import { EkartMapper } from './ekart.mapper';
import {
EKART_ENDPOINTS,
EKART_STATUS_MAP,
EkartLaneServiceabilityOption,
EkartLaneServiceabilityRequest,
EkartRateRequest,
EkartRateResponse,
EkartRawTrackingResponse,
EkartServiceabilityResponse,
EkartShipmentRequest,
EkartShipmentResponse
} from './ekart.types';

import {
handleEkartError,
waitForRateLimit
} from './ekart-error-handler';

import { CircuitBreaker, retryWithBackoff } from '../../../../shared/utils/circuit-breaker.util';

import logger from '../../../../shared/logger/winston.logger';
import CourierIdempotency from '../../../database/mongoose/models/courier-idempotency.model';

export class EkartProvider implements ICourierAdapter {
    private auth: EkartAuth;
    private axiosInstance: AxiosInstance;
    private circuitBreaker: CircuitBreaker;
    private baseUrl: string;
    private static readonly RATE_TIMEOUT_MS = Number(process.env.EKART_RATE_TIMEOUT_MS || 12000);
    private static readonly SERVICEABILITY_TIMEOUT_MS = Number(process.env.EKART_SERVICEABILITY_TIMEOUT_MS || 8000);

    constructor(
        private companyId: mongoose.Types.ObjectId,
        config?: {
            baseUrl?: string;
            clientId?: string;
            username?: string;
            password?: string;
        }
    ) {
        this.baseUrl = config?.baseUrl || process.env.EKART_BASE_URL || 'https://app.elite.ekartlogistics.in';

        this.auth = new EkartAuth(
            companyId,
            this.baseUrl,
            config?.clientId,
            config?.username,
            config?.password
        );

        this.circuitBreaker = new CircuitBreaker({
            name: 'EkartProvider',
            failureThreshold: 5,
            cooldownMs: 60000
        });

        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000, // 30s timeout
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Add logging interceptors for performance monitoring
        this.axiosInstance.interceptors.request.use((config) => {
            (config as any).metadata = { startTime: Date.now() };
            return config;
        });

        this.axiosInstance.interceptors.response.use(
            (response) => {
                const startTime = (response.config as any).metadata?.startTime;
                const duration = startTime ? Date.now() - startTime : 0;
                logger.info('Ekart API Success', {
                    method: response.config.method?.toUpperCase(),
                    endpoint: response.config.url,
                    duration,
                    status: 'success'
                });
                return response;
            },
            (error) => {
                const startTime = (error.config as any)?.metadata?.startTime;
                const duration = startTime ? Date.now() - startTime : 0;
                logger.error('Ekart API Failure', {
                    method: error.config?.method?.toUpperCase(),
                    endpoint: error.config?.url,
                    duration,
                    status: 'failure',
                    error: error.message
                });
                return Promise.reject(error);
            }
        );

        // Add request interceptor to inject auth token
        this.axiosInstance.interceptors.request.use(async (config) => {
            const token = await this.auth.getValidToken();
            config.headers.Authorization = `Bearer ${token}`;
            return config;
        });
    }

    /**
     * Create a new shipment (Forward)
     */
    async createShipment(data: CourierShipmentData): Promise<CourierShipmentResponse> {
        return this.circuitBreaker.execute(async () => {
            const idempotencyKey = data.idempotencyKey || `ekart-${data.orderNumber}`;

            // Check idempotency
            const existing = await CourierIdempotency.findOne({
                idempotencyKey,
                provider: 'ekart',
                companyId: this.companyId
            });

            if (existing) {
                logger.info('Idempotent shipment creation', {
                    idempotencyKey,
                    trackingNumber: existing.responseData.trackingNumber
                });
                return existing.responseData as CourierShipmentResponse;
            }

            try {
                // Validate data
                EkartMapper.validateForwardShipmentData(data);

                // Map data to Ekart request (pickup/return use Ekart alias from carrierDetails.ekart.warehouseId)
                const ekartRequest: EkartShipmentRequest = EkartMapper.mapToForwardShipment(data, {
                    sellerName: data.carrierOptions?.delhivery?.sellerName || data.origin.name,
                    sellerAddress: data.carrierOptions?.delhivery?.sellerAddress || data.origin.address,
                    sellerGstTin: data.carrierOptions?.delhivery?.sellerInv || '',
                    pickupLocationName: data.carrierOptions?.ekart?.pickupLocationName || data.origin.name,
                    returnLocationName: data.carrierOptions?.ekart?.returnLocationName || data.carrierOptions?.delhivery?.returnAddress?.name,
                    productsDesc: data.package.description,
                    hsnCode: data.carrierOptions?.delhivery?.hsn,
                    totalAmount: data.carrierOptions?.delhivery?.totalAmount,
                    // If COD
                    // Note: sellerGstAmount, etc. should ideally come from data if available
                });

                // Execute request with retry (API doc: Method PUT, single object body)
                const response = await retryWithBackoff(async () => {
                    try {
                        return await this.axiosInstance.put<EkartShipmentResponse>(
                            EKART_ENDPOINTS.CREATE_SHIPMENT,
                            ekartRequest
                        );
                    } catch (error: any) {
                        const ekartError = handleEkartError(error);
                        if (ekartError.response.retryAfter) {
                            await waitForRateLimit(ekartError);
                        }
                        throw ekartError;
                    }
                });

                const apiResponse = response.data;
                const result = Array.isArray(apiResponse) ? apiResponse[0] : apiResponse;

                if (!result.status && result.remark) {
                    throw new Error(`Ekart API Error: ${result.remark}`);
                }

                const shipmentResponse: CourierShipmentResponse = {
                    trackingNumber: result.tracking_id,
                    providerShipmentId: result.tracking_id, // Ekart uses tracking ID as primary ref
                    // Label URL usually comes from a separate API call or is not provided immediately
                };

                // Save idempotency record
                await CourierIdempotency.create({
                    idempotencyKey,
                    provider: 'ekart',
                    companyId: this.companyId,
                    orderId: data.orderNumber,
                    trackingNumber: shipmentResponse.trackingNumber,
                    providerShipmentId: shipmentResponse.providerShipmentId,
                    requestPayload: ekartRequest,
                    responseData: shipmentResponse,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                });

                return shipmentResponse;

            } catch (error) {
                logger.error('Ekart createShipment failed', {
                    error,
                    orderNumber: data.orderNumber
                });
                throw handleEkartError(error);
            }
        });
    }

    /**
     * Track a shipment
     */
    async trackShipment(trackingNumber: string): Promise<CourierTrackingResponse> {
        return this.circuitBreaker.execute(async () => {
            try {
                // FIXED: Using correct tracking endpoint
                const url = `${EKART_ENDPOINTS.TRACK}/${trackingNumber}`;

                const response = await retryWithBackoff(async () => {
                    return await this.axiosInstance.get<EkartRawTrackingResponse>(url);
                });

                // Response is a map of tracking_id -> details
                const trackData = response.data[trackingNumber];

                if (!trackData) {
                    throw new Error(`Tracking data not found for ${trackingNumber}`);
                }

                // Map status
                // The raw response has 'history' array.
                // We need to map to CourierTrackingResponse format.

                // Sort history by timestamp desc (or asc? usually API returns latest first or we sort)
                const timeline = (trackData.history || []).map((event: any) => ({
                    status: EKART_STATUS_MAP[event.status] || event.status,
                    message: event.description || event.status,
                    location: event.location,
                    timestamp: new Date(event.timestamp) // Ensure timestamp is parsed
                }));

                // Current status
                // trackData might have a top level status or we infer from latest history
                const currentStatusRaw = trackData.delivery_type || (timeline.length > 0 ? timeline[0].status : 'Unknown');
                const currentStatus = EKART_STATUS_MAP[currentStatusRaw] || currentStatusRaw;

                return {
                    trackingNumber,
                    status: currentStatus,
                    timeline,
                    estimatedDelivery: trackData.expected_delivery_date ? new Date(trackData.expected_delivery_date) : undefined
                };

            } catch (error) {
                logger.error('Ekart trackShipment failed', { error, trackingNumber });
                throw handleEkartError(error);
            }
        });
    }

    /**
     * Get Shipping Rates
     */
    async getRates(request: CourierRateRequest): Promise<CourierRateResponse[]> {
        return this.circuitBreaker.execute(async () => {
            try {
                const serviceType = this.mapRateRequestServiceType(request);
                // Map to Ekart Rate Request
                const ekartRequest: EkartRateRequest = {
                    pickupPincode: parseInt(request.origin.pincode, 10),
                    dropPincode: parseInt(request.destination.pincode, 10),
                    weight: EkartMapper.toGrams(request.package.weight),
                    length: request.package.length,
                    width: request.package.width,
                    height: request.package.height,
                    serviceType,
                    shippingDirection: 'FORWARD', // REQUIRED: Default to forward shipment
                    codAmount: request.paymentMode === 'cod' ? (request.orderValue || 0) : 0,
                    invoiceAmount: request.orderValue,
                    packages: [] // Added to match doc example
                };

                const response = await retryWithBackoff(async () => {
                    return await this.axiosInstance.post<EkartRateResponse>(
                        EKART_ENDPOINTS.RATE_ESTIMATE,
                        ekartRequest,
                        { timeout: EkartProvider.RATE_TIMEOUT_MS }
                    );
                }, 1, 500);

                const rateData = response.data;

                // Return array (Ekart usually returns single rate for the request parameters)
                return [{
                    basePrice: parseFloat(rateData.shippingCharge),
                    taxes: parseFloat(rateData.taxes),
                    total: parseFloat(rateData.total),
                    currency: 'INR',
                    serviceType: serviceType === 'EXPRESS' ? 'Express' : 'Surface',
                    estimatedDeliveryDays: undefined, // API might not return EDD in rate response
                    zone: rateData.zone
                }];

            } catch (error) {
                logger.error('Ekart getRates failed', { error, request });
                throw handleEkartError(error);
            }
        });
    }

    private mapRateRequestServiceType(request: CourierRateRequest): 'SURFACE' | 'EXPRESS' {
        const providerServiceId = String(request.providerServiceId || '').trim().toUpperCase();
        if (providerServiceId === 'SURFACE' || providerServiceId === 'EXPRESS') {
            return providerServiceId;
        }

        const hint = String(request.serviceType || '').trim().toLowerCase();
        if (hint.includes('express') || hint.includes('air')) {
            return 'EXPRESS';
        }

        return 'SURFACE';
    }

    /**
     * Cancel a shipment
     */
    async cancelShipment(trackingNumber: string): Promise<boolean> {
        return this.circuitBreaker.execute(async () => {
            try {
                // Endpoint: /api/v1/package/cancel
                // Body: { tracking_ids: [string] }
                const payload = { tracking_ids: [trackingNumber] };

                const response = await retryWithBackoff(async () => {
                    return await this.axiosInstance.post(
                        EKART_ENDPOINTS.CANCEL_SHIPMENT,
                        payload
                    );
                });

                // Check response
                // Usually returns a map of id -> status
                const result = response.data[trackingNumber];
                if (result && result.status === 'Cancelled') {
                    return true;
                }
                // Some APIs return simple success/failure
                if (response.status === 200) return true;

                return false;
            } catch (error) {
                logger.error('Ekart cancelShipment failed', { error, trackingNumber });
                // If 404, maybe already cancelled or doesn't exist.
                return false;
            }
        });
    }

    /**
     * Check Serviceability
     */
    async checkServiceability(pincode: string, _type: 'delivery' | 'pickup' = 'delivery'): Promise<boolean> {
        return this.circuitBreaker.execute(async () => {
            try {
                // FIXED: Using correct endpoint format
                const url = `${EKART_ENDPOINTS.SERVICEABILITY}/${pincode}`;

                const response = await retryWithBackoff(async () => {
                    return await this.axiosInstance.get<EkartServiceabilityResponse>(url, {
                        timeout: EkartProvider.SERVICEABILITY_TIMEOUT_MS,
                    });
                }, 1, 500);

                // FIXED: Correct response property
                return response.data.status || false;
            } catch (error) {
                logger.error('Ekart checkServiceability failed', { error, pincode });
                return false;
            }
        });
    }

    /**
     * Lane-level serviceability with pincode fallback.
     * Primary: /data/v3/serviceability
     * Fallback: /api/v2/serviceability/{pincode}
     */
    async getLaneServiceability(input: {
        pickupPincode: string;
        dropPincode: string;
        weight: number; // kg
        paymentMode: 'cod' | 'prepaid';
    }): Promise<{
        serviceable: boolean;
        source: 'lane' | 'pincode';
        confidence: 'high' | 'medium';
        zone?: string;
        options: EkartLaneServiceabilityOption[];
    }> {
        return this.circuitBreaker.execute(async () => {
            try {
                const payload: EkartLaneServiceabilityRequest = {
                    pickupPincode: input.pickupPincode,
                    dropPincode: input.dropPincode,
                    weight: EkartMapper.toGrams(input.weight),
                    paymentType: input.paymentMode === 'cod' ? 'COD' : 'Prepaid',
                };

                const response = await retryWithBackoff(async () => {
                    return await this.axiosInstance.post<EkartLaneServiceabilityOption[]>(
                        EKART_ENDPOINTS.SERVICEABILITY_LANE,
                        payload,
                        { timeout: EkartProvider.SERVICEABILITY_TIMEOUT_MS }
                    );
                }, 1, 500);

                const raw = response.data;
                const options = Array.isArray(raw)
                    ? raw
                    : Array.isArray((raw as any)?.data)
                        ? (raw as any).data
                        : [];

                const primary = options[0];
                const zone = primary?.forwardDeliveredCharges?.zone;

                return {
                    serviceable: options.length > 0,
                    source: 'lane',
                    confidence: 'high',
                    zone,
                    options,
                };
            } catch (laneError) {
                logger.warn('Ekart lane serviceability failed, using pincode fallback', {
                    pickupPincode: input.pickupPincode,
                    dropPincode: input.dropPincode,
                    error: laneError instanceof Error ? laneError.message : laneError,
                });

                const serviceable = await this.checkServiceability(input.dropPincode, 'delivery');
                return {
                    serviceable,
                    source: 'pincode',
                    confidence: 'medium',
                    options: [],
                };
            }
        });
    }

    /**
     * Create Reverse Shipment
     */
    async createReverseShipment(data: CourierReverseShipmentData): Promise<CourierReverseShipmentResponse> {
        return this.circuitBreaker.execute(async () => {
            const idempotencyKey = `ekart-rev-${data.orderId}`;

            // Check idempotency
            const existing = await CourierIdempotency.findOne({
                idempotencyKey,
                provider: 'ekart',
                companyId: this.companyId
            });

            if (existing) {
                return existing.responseData as CourierReverseShipmentResponse;
            }

            try {
                EkartMapper.validateReverseShipmentData(data);

                const ekartRequest = EkartMapper.mapToReverseShipment(data, {
                    sellerName: data.carrierOptions?.delhivery?.sellerName || data.pickupAddress.name,
                    sellerAddress: data.carrierOptions?.delhivery?.sellerAddress || data.pickupAddress.address,
                    sellerGstTin: '', // Needs to be sourced
                    returnWarehouseName: 'Warehouse', // Needs warehouse name logic
                    // other fields...
                });

                const response = await retryWithBackoff(async () => {
                    return await this.axiosInstance.post<EkartShipmentResponse>(
                        EKART_ENDPOINTS.CREATE_SHIPMENT,
                        [ekartRequest]
                    );
                });

                const apiResponse = response.data;
                const result = Array.isArray(apiResponse) ? apiResponse[0] : apiResponse;

                if (!result.status && result.remark) {
                    throw new Error(`Ekart API Error: ${result.remark}`);
                }

                const reverseResponse: CourierReverseShipmentResponse = {
                    trackingNumber: result.tracking_id,
                    orderId: data.orderId,
                    courierName: 'ekart'
                };

                await CourierIdempotency.create({
                    idempotencyKey,
                    provider: 'ekart',
                    companyId: this.companyId,
                    orderId: data.orderId,
                    trackingNumber: reverseResponse.trackingNumber,
                    requestPayload: ekartRequest,
                    responseData: reverseResponse,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });

                return reverseResponse;
            } catch (error) {
                logger.error('Ekart createReverseShipment failed', { error, orderId: data.orderId });
                throw handleEkartError(error);
            }
        });
    }

    async cancelReverseShipment(reverseAwb: string, _originalAwb: string, _reason?: string): Promise<boolean> {
        return this.cancelShipment(reverseAwb);
    }

    /**
     * Request Reattempt (NDR Action)
     * 
     * Uses Ekart NDR API to request delivery reattempt
     * API: POST /api/v2/package/ndr
     * 
     * @param trackingNumber - Ekart tracking ID (WBN)
     * @param preferredDate - Preferred reattempt date (must be within 7 days)
     * @param instructions - Additional delivery instructions
     */
    async requestReattempt(
        trackingNumber: string,
        preferredDate?: Date,
        instructions?: string
    ): Promise<{ success: boolean; message: string; uplId?: string }> {
        return this.circuitBreaker.execute(async () => {
            try {
                // Validate date is within 7 days if provided
                if (preferredDate) {
                    const now = new Date();
                    const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    if (preferredDate < now || preferredDate > maxDate) {
                        throw new Error('Preferred date must be within 7 days from today');
                    }
                }

                const payload = {
                    action: 'Re-Attempt',
                    wbn: trackingNumber,
                    date: preferredDate ? preferredDate.getTime() : undefined,
                    instructions
                };

                const response = await retryWithBackoff(async () => {
                    return await this.axiosInstance.post(
                        '/api/v2/package/ndr',
                        payload
                    );
                });

                logger.info('Ekart reattempt requested', {
                    trackingNumber,
                    preferredDate,
                    status: response.data.status
                });

                return {
                    success: response.data.status || false,
                    message: response.data.remark || 'Reattempt requested',
                    uplId: response.data.tracking_id
                };

            } catch (error) {
                logger.error('Ekart requestReattempt failed', { error, trackingNumber });
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'Reattempt request failed'
                };
            }
        });
    }

    /**
     * Request RTO (Return to Origin)
     * 
     * Uses Ekart NDR API to request RTO for a shipment
     * API: POST /api/v2/package/ndr
     * 
     * @param trackingNumber - Ekart tracking ID (WBN)
     */
    async requestRTO(trackingNumber: string): Promise<{ success: boolean; message: string }> {
        return this.circuitBreaker.execute(async () => {
            try {
                const payload = {
                    action: 'RTO',
                    wbn: trackingNumber
                };

                const response = await retryWithBackoff(async () => {
                    return await this.axiosInstance.post(
                        '/api/v2/package/ndr',
                        payload
                    );
                });

                logger.info('Ekart RTO requested', {
                    trackingNumber,
                    status: response.data.status
                });

                return {
                    success: response.data.status || false,
                    message: response.data.remark || 'RTO requested'
                };

            } catch (error) {
                logger.error('Ekart requestRTO failed', { error, trackingNumber });
                return {
                    success: false,
                    message: error instanceof Error ? error.message : 'RTO request failed'
                };
            }
        });
    }

    // Optional methods
    async createWarehouse(data: any): Promise<any> {
        try {
            const payload = EkartMapper.mapWarehouseToAddressRequest(data);
            const response = await this.axiosInstance.post(EKART_ENDPOINTS.ADDRESS, payload);
            return response.data;
        } catch (error) {
            throw handleEkartError(error);
        }
    }

    /**
     * Generate Manifest
     * 
     * Generates shipping manifest for given tracking IDs
     * API: POST /data/v2/generate/manifest
     * 
     * @param trackingIds - Array of Ekart tracking IDs (max 100 per request)
     * @returns Manifest number and download URL
     */
    async generateManifest(trackingIds: string[]): Promise<{
        manifestNumber: number;
        downloadUrl: string;
        ctime: number;
    }> {
        return this.circuitBreaker.execute(async () => {
            try {
                if (!trackingIds || trackingIds.length === 0) {
                    throw new Error('At least one tracking ID is required');
                }

                // Ekart API limit is 100 AWBs per request
                if (trackingIds.length > 100) {
                    // Chunk into batches of 100
                    const chunks = [];
                    for (let i = 0; i < trackingIds.length; i += 100) {
                        chunks.push(trackingIds.slice(i, i + 100));
                    }

                    logger.info('Chunking manifest generation', {
                        totalAwbs: trackingIds.length,
                        chunks: chunks.length
                    });

                    // Generate manifests for each chunk
                    const manifests = await Promise.all(
                        chunks.map(chunk => this.generateManifest(chunk))
                    );

                    // Return the first manifest (or combine logic as needed)
                    return manifests[0];
                }

                const payload = { ids: trackingIds };

                const response = await retryWithBackoff(async () => {
                    return await this.axiosInstance.post(
                        EKART_ENDPOINTS.MANIFEST,
                        payload
                    );
                });

                logger.info('Ekart manifest generated', {
                    manifestNumber: response.data.manifestNumber,
                    awbCount: trackingIds.length
                });

                return {
                    manifestNumber: response.data.manifestNumber,
                    downloadUrl: response.data.manifestDownloadUrl,
                    ctime: response.data.ctime
                };

            } catch (error) {
                logger.error('Ekart generateManifest failed', {
                    error,
                    awbCount: trackingIds.length
                });
                throw handleEkartError(error);
            }
        });
    }

    /**
     * Create manifest (ICourierAdapter optional method)
     *
     * ManifestService passes AWBs in `awbs`. For Ekart these are tracking IDs.
     */
    async createManifest(data: { shipmentIds?: string[]; awbs?: string[]; warehouseId?: string }): Promise<{ manifestId?: string; manifestUrl?: string } | null> {
        const trackingIds = (data.awbs || []).filter((awb) => typeof awb === 'string' && awb.trim().length > 0);
        if (trackingIds.length === 0) {
            logger.warn('Ekart createManifest skipped: no AWBs provided');
            return null;
        }

        // Ekart supports up to 100 IDs/request. Our manifest metadata currently stores
        // a single carrier manifest reference, so avoid partial persistence for chunked runs.
        if (trackingIds.length > 100) {
            logger.warn('Ekart createManifest skipped: shipment count exceeds 100 IDs per manifest request', {
                count: trackingIds.length,
            });
            return null;
        }

        const result = await this.generateManifest(trackingIds);
        return {
            manifestId: String(result.manifestNumber),
            manifestUrl: result.downloadUrl,
        };
    }

    /**
     * Get Label(s)
     * 
     * Downloads shipping labels for given tracking IDs
     * API: POST /api/v1/package/label
     * 
     * @param trackingIds - Array of Ekart tracking IDs (max 100 per request)
     * @param format - 'pdf' for PDF buffer, 'json' for label URLs
     * @returns Label data (PDF buffer or URLs)
     */
    async getLabel(
        trackingIds: string[],
        format: 'pdf' | 'json' = 'pdf'
    ): Promise<{
        labels?: Array<{ tracking_id: string; label_url: string }>;
        pdfBuffer?: Buffer;
    }> {
        return this.circuitBreaker.execute(async () => {
            try {
                if (!trackingIds || trackingIds.length === 0) {
                    throw new Error('At least one tracking ID is required');
                }

                if (trackingIds.length > 100) {
                    throw new Error('Maximum 100 tracking IDs allowed per request');
                }

                const payload = { ids: trackingIds };
                const params = format === 'json' ? { json_only: true } : {};

                const response = await retryWithBackoff(async () => {
                    return await this.axiosInstance.post(
                        EKART_ENDPOINTS.LABEL,
                        payload,
                        {
                            params,
                            responseType: format === 'pdf' ? 'arraybuffer' : 'json'
                        }
                    );
                });

                logger.info('Ekart labels retrieved', {
                    format,
                    awbCount: trackingIds.length
                });

                if (format === 'json') {
                    return { labels: response.data };
                } else {
                    return { pdfBuffer: Buffer.from(response.data) };
                }

            } catch (error) {
                logger.error('Ekart getLabel failed', {
                    error,
                    format,
                    awbCount: trackingIds.length
                });
                throw handleEkartError(error);
            }
        });
    }
}
