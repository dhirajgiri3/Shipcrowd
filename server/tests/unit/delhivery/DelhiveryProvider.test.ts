/**
 * DelhiveryProvider Unit Tests
 */

import axios from 'axios';
import mongoose from 'mongoose';
import { DelhiveryProvider } from '../../../src/infrastructure/external/couriers/delhivery/delhivery.provider';
import { StatusMapperService } from '../../../src/core/application/services/courier/status-mappings/status-mapper.service';
import { DELHIVERY_STATUS_MAPPINGS } from '../../../src/core/application/services/courier/status-mappings/delhivery-status-mappings';
import { CourierShipmentData } from '../../../src/infrastructure/external/couriers/base/courier.adapter';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DelhiveryProvider', () => {
    let provider: DelhiveryProvider;

    beforeAll(() => {
        StatusMapperService.clear();
        StatusMapperService.register(DELHIVERY_STATUS_MAPPINGS);
    });

    beforeEach(() => {
        process.env.DELHIVERY_API_TOKEN = 'test-token';
        mockedAxios.create.mockReturnValue({
            get: jest.fn(),
            post: jest.fn()
        } as any);
        provider = new DelhiveryProvider(new mongoose.Types.ObjectId(), 'https://staging-express.delhivery.com');
    });

    it('creates shipment with format=json payload', async () => {
        const client = mockedAxios.create.mock.results[0].value as any;
        client.post.mockResolvedValue({
            data: { packages: [{ waybill: '1234567890' }] }
        });

        const data: CourierShipmentData = {
            origin: {
                name: 'Warehouse',
                phone: '9999999999',
                address: 'Origin',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001',
                country: 'India'
            },
            destination: {
                name: 'John Doe',
                phone: '9999999999',
                address: '123 Main St',
                city: 'Mumbai',
                state: 'MH',
                pincode: '400001',
                country: 'India'
            },
            package: { weight: 1, length: 10, width: 10, height: 10 },
            orderNumber: 'ORD-1',
            paymentMode: 'prepaid',
            carrierOptions: { delhivery: { pickupLocationName: 'Test WH' } }
        };

        const res = await provider.createShipment(data);
        expect(res.trackingNumber).toBe('1234567890');
        expect(client.post).toHaveBeenCalled();
        const [url, body] = client.post.mock.calls[0];
        expect(url).toBe('/api/cmu/create.json');
        expect(body).toContain('format=json&data=');
    });

    it('tracks shipment and maps status', async () => {
        const client = mockedAxios.create.mock.results[0].value as any;
        client.get.mockResolvedValue({
            data: {
                ShipmentData: [
                    {
                        Shipment: {
                            Status: {
                                Status: 'DELIVERED',
                                StatusDateTime: new Date().toISOString(),
                                StatusType: 'DL',
                                StatusLocation: 'Mumbai',
                                Instructions: ''
                            },
                            NSLCode: 'EOD-74',
                            AWB: '1234567890'
                        }
                    }
                ]
            }
        });

        const res = await provider.trackShipment('1234567890');
        expect(res.status).toBe('delivered');
        expect(res.trackingNumber).toBe('1234567890');
    });

    it('throws on validation error', async () => {
        const client = mockedAxios.create.mock.results[0].value as any;
        client.post.mockRejectedValue({ response: { status: 400, data: { message: 'Bad Request' } } });

        const data: CourierShipmentData = {
            origin: {
                name: 'Warehouse',
                phone: '9999999999',
                address: 'Origin',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001',
                country: 'India'
            },
            destination: {
                name: 'John Doe',
                phone: '9999999999',
                address: '123 Main St',
                city: 'Mumbai',
                state: 'MH',
                pincode: '400001',
                country: 'India'
            },
            package: { weight: 1, length: 10, width: 10, height: 10 },
            orderNumber: 'ORD-1',
            paymentMode: 'prepaid',
            carrierOptions: { delhivery: { pickupLocationName: 'Test WH' } }
        };

        await expect(provider.createShipment(data)).rejects.toThrow('Validation failed');
    });
});
