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
import { DelhiveryAuth } from './delhivery.auth';
import { DelhiveryMapper } from './delhivery.mapper';
import {
    DelhiveryCreateShipmentPayload,
    DelhiveryTrackResponse,
    DelhiveryServiceabilityResponse,
    DelhiveryPickupRequest,
    DelhiveryWarehouseCreateRequest,
    DelhiveryWarehouseUpdateRequest,
    DelhiveryNdrActionRequest,
    DelhiveryNdrActionResponse,
    DelhiveryNdrStatusResponse,
    DelhiveryDocumentResponse
} from './delhivery.types';
import { handleDelhiveryError, retryWithBackoff, DelhiveryError } from './delhivery-error-handler';
import { StatusMapperService } from '../../../../core/application/services/courier/status-mappings/status-mapper.service';
import { RateLimiterService } from '../../../../core/application/services/courier/rate-limiter-configs/rate-limiter.service';
import { DELHIVERY_RATE_LIMITER_CONFIG } from '../../../../core/application/services/courier/rate-limiter-configs';
import Warehouse from '../../../database/mongoose/models/logistics/warehouse/structure/warehouse.model';
import logger from '../../../../shared/logger/winston.logger';

export class DelhiveryProvider extends BaseCourierAdapter {
    private auth: DelhiveryAuth;
    private httpClient: AxiosInstance;
    private rateLimiter: RateLimiterService;
    private companyId: mongoose.Types.ObjectId;
    private readonly NDR_NSL_CODES = ['EOD-74', 'EOD-15', 'EOD-104', 'EOD-43', 'EOD-86', 'EOD-11', 'EOD-69', 'EOD-6'];

    constructor(
        companyId: mongoose.Types.ObjectId,
        baseUrl: string = process.env.DELHIVERY_BASE_URL || 'https://staging-express.delhivery.com'
    ) {
        super('', baseUrl);
        this.companyId = companyId;
        this.auth = new DelhiveryAuth(companyId);
        this.rateLimiter = new RateLimiterService(DELHIVERY_RATE_LIMITER_CONFIG);

        this.httpClient = axios.create({
            baseURL: baseUrl,
            timeout: 30000
        });
    }

    private buildStatusKey(statusType?: string, status?: string, nsl?: string): string {
        const type = (statusType || '').toUpperCase().trim();
        const stat = (status || '').toUpperCase().trim();
        const nslCode = (nsl || '').toUpperCase().trim();
        if (nslCode && this.NDR_NSL_CODES.includes(nslCode)) {
            return [type, stat, nslCode].filter(Boolean).join('|');
        }
        return [type, stat].filter(Boolean).join('|');
    }

    private async getHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
        const headers = await this.auth.getHeaders();
        return { ...headers, ...(extra || {}) };
    }

    async createShipment(data: CourierShipmentData): Promise<CourierShipmentResponse> {
        try {
            const options = (data as any).carrierOptions?.delhivery || {};
            const warehouseId = (data as any).warehouseId;
            const warehouse = warehouseId ? await Warehouse.findById(warehouseId).lean() : null;

            const pickupLocationName = options.pickupLocationName
                || warehouse?.carrierDetails?.delhivery?.warehouseId
                || warehouse?.name;

            if (!pickupLocationName) {
                throw new DelhiveryError(400, 'Delhivery pickup location name is required', false);
            }

            let shipment = DelhiveryMapper.mapForwardShipment(data, options);

            if (options.mps) {
                shipment = DelhiveryMapper.buildMpsFields(shipment, options.mps);
            }

            const payload: DelhiveryCreateShipmentPayload = {
                client: options.clientName || process.env.DELHIVERY_CLIENT_NAME,
                shipments: [shipment],
                pickup_location: { name: pickupLocationName }
            };

            const body = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;

            await this.rateLimiter.acquire('/api/cmu/create.json');

            const response = await retryWithBackoff(async () => {
                logger.info('Creating Delhivery shipment', {
                    orderId: data.orderNumber,
                    companyId: this.companyId.toString()
                });

                return await this.httpClient.post('/api/cmu/create.json', body, {
                    headers: await this.getHeaders({
                        'Content-Type': 'application/x-www-form-urlencoded'
                    })
                });
            }, 3, 1000, 'Delhivery createShipment');

            const responseData = response.data || {};
            const awb = responseData.packages?.[0]?.waybill || responseData.waybill || responseData.packages?.[0]?.wbn;

            if (!awb) {
                throw new DelhiveryError(502, 'Delhivery did not return a waybill', true);
            }

            return {
                trackingNumber: awb,
                labelUrl: undefined,
                estimatedDelivery: undefined,
                cost: undefined,
                providerShipmentId: responseData.packages?.[0]?.waybill
            };
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery createShipment');
        }
    }

    async trackShipment(trackingNumber: string): Promise<CourierTrackingResponse> {
        try {
            await this.rateLimiter.acquire('/api/v1/packages/json/');

            const response = await retryWithBackoff(async () => {
                return await this.httpClient.get(`/api/v1/packages/json/`, {
                    headers: await this.getHeaders(),
                    params: { waybill: trackingNumber }
                });
            }, 3, 1000, 'Delhivery trackShipment');

            const data = response.data as DelhiveryTrackResponse;
            const shipment = data?.ShipmentData?.[0]?.Shipment;

            if (!shipment) {
                throw new DelhiveryError(404, `No tracking data for AWB: ${trackingNumber}`, false);
            }

            const status = shipment.Status;
            const statusKey = this.buildStatusKey(status?.StatusType, status?.Status, shipment.NSLCode);
            const mapping = StatusMapperService.map('delhivery', statusKey);

            const timeline = [
                {
                    status: mapping.internalStatus,
                    message: status?.Status || '',
                    location: status?.StatusLocation || '',
                    timestamp: status?.StatusDateTime ? new Date(status.StatusDateTime) : new Date()
                }
            ];

            return {
                trackingNumber: shipment.AWB || trackingNumber,
                status: mapping.internalStatus,
                currentLocation: status?.StatusLocation || undefined,
                timeline,
                estimatedDelivery: undefined
            };
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery trackShipment');
        }
    }

    async getRates(request: CourierRateRequest): Promise<CourierRateResponse[]> {
        try {
            const serviceHint = (request as any).serviceType || '';
            const md = serviceHint.toString().toLowerCase().includes('express') ? 'E' : 'S';
            const paymentType = request.paymentMode === 'cod' ? 'COD' : 'Pre-paid';
            const cgm = DelhiveryMapper.toGrams(request.package.weight);

            await this.rateLimiter.acquire('/api/kinko/v1/invoice/charges/');

            const response = await retryWithBackoff(async () => {
                return await this.httpClient.get('/api/kinko/v1/invoice/charges/.json', {
                    headers: await this.getHeaders(),
                    params: {
                        md,
                        ss: 'Delivered',
                        d_pin: request.destination.pincode,
                        o_pin: request.origin.pincode,
                        cgm,
                        pt: paymentType
                    }
                });
            }, 3, 1000, 'Delhivery getRates');

            const data = response.data || {};
            const total = Number(data?.total_charge || data?.total_amount || data?.charges || 0);

            return [
                {
                    basePrice: total,
                    taxes: 0,
                    total,
                    currency: 'INR',
                    serviceType: md === 'E' ? 'Express' : 'Surface'
                }
            ];
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery getRates');
        }
    }

    async cancelShipment(trackingNumber: string): Promise<boolean> {
        try {
            await this.rateLimiter.acquire('/api/p/edit');

            const response = await retryWithBackoff(async () => {
                return await this.httpClient.post('/api/p/edit',
                    { waybill: trackingNumber, cancellation: 'true' },
                    { headers: await this.getHeaders() }
                );
            }, 2, 1000, 'Delhivery cancelShipment');

            return !!response.data;
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery cancelShipment');
        }
    }

    async checkServiceability(pincode: string, type: 'delivery' | 'pickup' = 'delivery'): Promise<boolean> {
        try {
            await this.rateLimiter.acquire('/c/api/pin-codes/json/');

            const response = await retryWithBackoff(async () => {
                return await this.httpClient.get('/c/api/pin-codes/json/', {
                    headers: await this.getHeaders(),
                    params: { filter_codes: pincode }
                });
            }, 2, 1000, 'Delhivery checkServiceability');

            const data = response.data as DelhiveryServiceabilityResponse;
            const code = data?.delivery_codes?.[0]?.postal_code;

            if (!code) return false;
            if (code.remarks && code.remarks.toLowerCase().includes('embargo')) return false;

            if (type === 'pickup') return code.pickup === 'Y';
            return code.pre_paid === 'Y' || code.cod === 'Y';
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery checkServiceability');
        }
    }

    async createWarehouse(warehouse: any): Promise<any> {
        try {
            const request: DelhiveryWarehouseCreateRequest = {
                name: warehouse.name,
                registered_name: process.env.DELHIVERY_CLIENT_NAME,
                phone: DelhiveryMapper.normalizePhone(warehouse.contactInfo?.phone || ''),
                email: warehouse.contactInfo?.email,
                address: warehouse.address?.line1,
                city: warehouse.address?.city,
                pin: warehouse.address?.postalCode,
                country: warehouse.address?.country || 'India',
                return_address: warehouse.address?.line1,
                return_pin: warehouse.address?.postalCode,
                return_city: warehouse.address?.city,
                return_state: warehouse.address?.state,
                return_country: warehouse.address?.country || 'India'
            };

            await this.rateLimiter.acquire('/api/backend/clientwarehouse/create/');

            const response = await retryWithBackoff(async () => {
                return await this.httpClient.post('/api/backend/clientwarehouse/create/', request, {
                    headers: await this.getHeaders()
                });
            }, 3, 1000, 'Delhivery createWarehouse');

            return response.data;
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery createWarehouse');
        }
    }

    async updateWarehouse(data: DelhiveryWarehouseUpdateRequest): Promise<any> {
        try {
            await this.rateLimiter.acquire('/api/backend/clientwarehouse/edit/');
            const response = await retryWithBackoff(async () => {
                return await this.httpClient.post('/api/backend/clientwarehouse/edit/', data, {
                    headers: await this.getHeaders()
                });
            }, 3, 1000, 'Delhivery updateWarehouse');

            return response.data;
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery updateWarehouse');
        }
    }

    async createReverseShipment(data: CourierReverseShipmentData): Promise<CourierReverseShipmentResponse> {
        try {
            const options = (data as any).carrierOptions?.delhivery || {};
            const warehouse = await Warehouse.findById(data.returnWarehouseId).lean();

            if (!warehouse) {
                throw new DelhiveryError(400, 'Return warehouse not found', false);
            }

            const pickupLocationName = options.pickupLocationName
                || warehouse?.carrierDetails?.delhivery?.warehouseId
                || warehouse?.name;

            if (!pickupLocationName) {
                throw new DelhiveryError(400, 'Delhivery pickup location name is required', false);
            }

            const shipment = DelhiveryMapper.mapReverseShipment(data, {
                ...options,
                returnAddress: {
                    name: warehouse.name,
                    address: warehouse.address?.line1,
                    pincode: warehouse.address?.postalCode,
                    city: warehouse.address?.city,
                    state: warehouse.address?.state,
                    country: warehouse.address?.country || 'India',
                    phone: warehouse.contactInfo?.phone
                }
            });

            const payload: DelhiveryCreateShipmentPayload = {
                client: options.clientName || process.env.DELHIVERY_CLIENT_NAME,
                shipments: [shipment],
                pickup_location: { name: pickupLocationName }
            };

            const body = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;

            await this.rateLimiter.acquire('/api/cmu/create.json');

            const response = await retryWithBackoff(async () => {
                return await this.httpClient.post('/api/cmu/create.json', body, {
                    headers: await this.getHeaders({
                        'Content-Type': 'application/x-www-form-urlencoded'
                    })
                });
            }, 3, 1000, 'Delhivery createReverseShipment');

            const responseData = response.data || {};
            const awb = responseData.packages?.[0]?.waybill || responseData.waybill || responseData.packages?.[0]?.wbn;

            if (!awb) {
                throw new DelhiveryError(502, 'Delhivery did not return a waybill for reverse shipment', true);
            }

            return {
                trackingNumber: awb,
                labelUrl: undefined,
                orderId: data.orderId,
                courierName: 'delhivery'
            };
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery createReverseShipment');
        }
    }

    async cancelReverseShipment(reverseAwb: string): Promise<boolean> {
        return this.cancelShipment(reverseAwb);
    }

    async schedulePickup(data: { pickupDate: string; pickupTime: string; pickupLocation: string; expectedCount: number }): Promise<any> {
        try {
            const request: DelhiveryPickupRequest = {
                pickup_date: data.pickupDate,
                pickup_time: data.pickupTime,
                pickup_location: data.pickupLocation,
                expected_package_count: data.expectedCount
            };

            await this.rateLimiter.acquire('/fm/request/new/');

            const response = await retryWithBackoff(async () => {
                return await this.httpClient.post('/fm/request/new/', request, {
                    headers: await this.getHeaders()
                });
            }, 3, 1000, 'Delhivery schedulePickup');

            return response.data;
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery schedulePickup');
        }
    }

    async requestReattempt(trackingNumber: string, preferredDate?: Date, instructions?: string): Promise<{ success: boolean; message: string; uplId?: string }> {
        try {
            const request: DelhiveryNdrActionRequest = {
                data: [{ waybill: trackingNumber, act: 'RE-ATTEMPT' }]
            };

            await this.rateLimiter.acquire('/api/p/update');

            const response = await retryWithBackoff(async () => {
                return await this.httpClient.post('/api/p/update', request, {
                    headers: await this.getHeaders()
                });
            }, 3, 1000, 'Delhivery requestReattempt');

            const data = response.data as DelhiveryNdrActionResponse;
            return {
                success: true,
                message: data?.message || 'Reattempt requested',
                uplId: data?.request_id
            };
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery requestReattempt');
        }
    }

    async updateDeliveryAddress(
        awb: string,
        newAddress: { line1: string; city: string; state: string; pincode: string; country: string; },
        orderId: string,
        phone?: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            await this.rateLimiter.acquire('/api/p/edit');

            const response = await retryWithBackoff(async () => {
                return await this.httpClient.post('/api/p/edit', {
                    waybill: awb,
                    add: DelhiveryMapper.sanitize(newAddress.line1),
                    city: DelhiveryMapper.sanitize(newAddress.city),
                    state: DelhiveryMapper.sanitize(newAddress.state),
                    pin: newAddress.pincode,
                    phone: phone ? DelhiveryMapper.normalizePhone(phone) : undefined
                }, {
                    headers: await this.getHeaders()
                });
            }, 3, 1000, 'Delhivery updateDeliveryAddress');

            return { success: true, message: response.data?.message || 'Address updated' };
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery updateDeliveryAddress');
        }
    }

    async getProofOfDelivery(trackingNumber: string): Promise<CourierPODResponse> {
        try {
            const response = await retryWithBackoff(async () => {
                return await this.httpClient.get('/api/rest/fetch/pkg/document/', {
                    headers: await this.getHeaders(),
                    params: { doc_type: 'EPOD', waybill: trackingNumber }
                });
            }, 2, 1000, 'Delhivery getProofOfDelivery');

            const data = response.data as DelhiveryDocumentResponse;
            if (!data?.url) {
                return { source: 'not_supported', message: data?.message || 'POD not available' };
            }

            return { url: data.url, source: 'courier_api' };
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery getProofOfDelivery');
        }
    }

    async getNdrStatus(uplId: string): Promise<DelhiveryNdrStatusResponse> {
        try {
            const response = await retryWithBackoff(async () => {
                return await this.httpClient.get(`/api/cmu/get_bulk_upl/${uplId}`, {
                    headers: await this.getHeaders(),
                    params: { verbose: true }
                });
            }, 2, 1000, 'Delhivery getNdrStatus');

            return response.data as DelhiveryNdrStatusResponse;
        } catch (error: any) {
            throw handleDelhiveryError(error, 'Delhivery getNdrStatus');
        }
    }
}
