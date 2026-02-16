import AddressValidationService from '@/core/application/services/logistics/address-validation.service';
import QuoteEngineService from '@/core/application/services/pricing/quote-engine.service';
import { OrderService } from '@/core/application/services/shipping/order.service';
import { ShipmentService } from '@/core/application/services/shipping/shipment.service';
import {
Company,
Order,
Shipment,
WalletTransaction,
Warehouse,
} from '@/infrastructure/database/mongoose/models';
import { AppError } from '@/shared/errors/app.error';
import { ErrorCode } from '@/shared/errors/errorCodes';
import mongoose from 'mongoose';
import { clearTestDb, closeTestDb, connectTestDb } from '../../setup/testDatabase';

describe('Order + Shipment Hardening Integration', () => {
    const userId = new mongoose.Types.ObjectId().toString();

    beforeAll(async () => {
        await connectTestDb();
    });

    afterAll(async () => {
        await closeTestDb();
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await clearTestDb();
    });

    const createCompany = async () => {
        return Company.create({
            name: `Hardening Co ${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            wallet: {
                balance: 1000,
                currency: 'INR',
                lowBalanceThreshold: 100,
            },
        });
    };

    const createWarehouse = async (companyId: mongoose.Types.ObjectId, postalCode = '560001') => {
        return Warehouse.create({
            name: `Warehouse ${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            companyId,
            address: {
                line1: '123 Test Street',
                city: 'Bengaluru',
                state: 'Karnataka',
                country: 'India',
                postalCode,
            },
            contactInfo: {
                name: 'Ops Manager',
                phone: '9999999999',
            },
            isActive: true,
            isDeleted: false,
        });
    };

    const createBaseOrderDocument = async (args: {
        companyId: mongoose.Types.ObjectId;
        warehouseId: mongoose.Types.ObjectId;
        status?: string;
        orderNumberSuffix: string;
        paymentMethod?: 'prepaid' | 'cod';
        currency?: string;
        totals?: {
            subtotal: number;
            tax: number;
            shipping: number;
            discount: number;
            total: number;
            baseCurrency?: string;
            baseCurrencySubtotal?: number;
            baseCurrencyTax?: number;
            baseCurrencyShipping?: number;
            baseCurrencyTotal?: number;
        };
    }) => {
        const {
            companyId,
            warehouseId,
            status = 'pending',
            orderNumberSuffix,
            paymentMethod = 'prepaid',
            currency = 'INR',
            totals,
        } = args;
        return Order.create({
            orderNumber: `HDR-ORDER-${orderNumberSuffix}-${Date.now()}`,
            companyId,
            customerInfo: {
                name: 'Test Customer',
                phone: '9876543210',
                address: {
                    line1: 'Test Address',
                    city: 'Delhi',
                    state: 'Delhi',
                    country: 'India',
                    postalCode: '110001',
                },
            },
            products: [
                {
                    name: 'Product A',
                    quantity: 1,
                    price: 500,
                    weight: 0.5,
                },
            ],
            shippingDetails: { shippingCost: 0 },
            paymentStatus: 'pending',
            paymentMethod,
            currency,
            source: 'manual',
            warehouseId,
            currentStatus: status,
            statusHistory: [],
            totals: totals || {
                subtotal: 500,
                tax: 0,
                shipping: 0,
                discount: 0,
                total: 500,
            },
            isDeleted: false,
        });
    };

    it('creates order successfully using company default warehouse when warehouseId is omitted', async () => {
        const company = await createCompany();
        const warehouse = await createWarehouse(company._id as mongoose.Types.ObjectId, '560001');

        await Company.findByIdAndUpdate(company._id, {
            $set: { 'settings.defaultWarehouseId': warehouse._id },
        });

        jest.spyOn(AddressValidationService, 'validatePincode').mockResolvedValue({
            valid: true,
            city: 'Delhi',
            state: 'Delhi',
            district: 'Delhi',
            serviceability: {
                delhivery: true,
                bluedart: true,
                ecom: true,
                dtdc: true,
                xpressbees: true,
                shadowfax: true,
            },
        });

        jest.spyOn(QuoteEngineService, 'generateQuotes').mockResolvedValue({
            sessionId: 'preflight-session-1',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            recommendation: 'opt-1',
            options: [{ optionId: 'opt-1', quotedAmount: 120 }] as any,
        } as any);

        const order = await OrderService.getInstance().createOrder({
            companyId: company._id as mongoose.Types.ObjectId,
            userId,
            payload: {
                customerInfo: {
                    name: 'Customer',
                    phone: '9876543210',
                    address: {
                        line1: 'Some address',
                        city: 'Delhi',
                        state: 'Delhi',
                        country: 'India',
                        postalCode: '110001',
                    },
                },
                products: [{ name: 'Item', quantity: 1, price: 1000, weight: 0.5 }],
                paymentMethod: 'prepaid',
            },
        });

        expect(String(order.warehouseId)).toBe(String(warehouse._id));
    });

    it('blocks order creation when destination pincode is invalid/non-existent', async () => {
        const company = await createCompany();
        const warehouse = await createWarehouse(company._id as mongoose.Types.ObjectId, '560001');

        jest.spyOn(AddressValidationService, 'validatePincode').mockImplementation(async (pincode: string) => {
            if (pincode === '110001') {
                return {
                    valid: false,
                    serviceability: {
                        delhivery: false,
                        bluedart: false,
                        ecom: false,
                        dtdc: false,
                        xpressbees: false,
                        shadowfax: false,
                    },
                };
            }

            return {
                valid: true,
                city: 'Bengaluru',
                state: 'Karnataka',
                district: 'Bengaluru',
                serviceability: {
                    delhivery: true,
                    bluedart: true,
                    ecom: true,
                    dtdc: true,
                    xpressbees: true,
                    shadowfax: true,
                },
            };
        });

        await expect(
            OrderService.getInstance().createOrder({
                companyId: company._id as mongoose.Types.ObjectId,
                userId,
                payload: {
                    warehouseId: String(warehouse._id),
                    customerInfo: {
                        name: 'Customer',
                        phone: '9876543210',
                        address: {
                            line1: 'Some address',
                            city: 'Delhi',
                            state: 'Delhi',
                            country: 'India',
                            postalCode: '110001',
                        },
                    },
                    products: [{ name: 'Item', quantity: 1, price: 1000, weight: 0.5 }],
                    paymentMethod: 'prepaid',
                },
            })
        ).rejects.toMatchObject({
            code: ErrorCode.VAL_PINCODE_INVALID,
            statusCode: 400,
        });
    });

    it('blocks order creation when no warehouse is provided and company has no default warehouse', async () => {
        const company = await createCompany();

        await expect(
            OrderService.getInstance().createOrder({
                companyId: company._id as mongoose.Types.ObjectId,
                userId,
                payload: {
                    customerInfo: {
                        name: 'Customer',
                        phone: '9876543210',
                        address: {
                            line1: 'Some address',
                            city: 'Delhi',
                            state: 'Delhi',
                            country: 'India',
                            postalCode: '110001',
                        },
                    },
                    products: [{ name: 'Item', quantity: 1, price: 1000, weight: 0.5 }],
                    paymentMethod: 'prepaid',
                },
            })
        ).rejects.toMatchObject({
            code: ErrorCode.VAL_INVALID_INPUT,
            statusCode: 400,
        });
    });

    it('blocks order creation when route preflight is non-serviceable', async () => {
        const company = await createCompany();
        const warehouse = await createWarehouse(company._id as mongoose.Types.ObjectId, '560001');

        await Company.findByIdAndUpdate(company._id, {
            $set: { 'settings.defaultWarehouseId': warehouse._id },
        });

        jest.spyOn(AddressValidationService, 'validatePincode').mockResolvedValue({
            valid: true,
            city: 'Delhi',
            state: 'Delhi',
            district: 'Delhi',
            serviceability: {
                delhivery: true,
                bluedart: true,
                ecom: true,
                dtdc: true,
                xpressbees: true,
                shadowfax: true,
            },
        });

        jest.spyOn(QuoteEngineService, 'generateQuotes').mockRejectedValue(
            new AppError(
                'No quote options could be generated',
                ErrorCode.VAL_PINCODE_NOT_SERVICEABLE,
                422
            )
        );

        await expect(
            OrderService.getInstance().createOrder({
                companyId: company._id as mongoose.Types.ObjectId,
                userId,
                payload: {
                    customerInfo: {
                        name: 'Customer',
                        phone: '9876543210',
                        address: {
                            line1: 'Some address',
                            city: 'Delhi',
                            state: 'Delhi',
                            country: 'India',
                            postalCode: '110001',
                        },
                    },
                    products: [{ name: 'Item', quantity: 1, price: 1000, weight: 0.5 }],
                    paymentMethod: 'prepaid',
                },
            })
        ).rejects.toMatchObject({
            code: ErrorCode.VAL_PINCODE_NOT_SERVICEABLE,
            statusCode: 422,
        });
    });

    it('supports status=unshipped compatibility alias in listOrdersWithStats', async () => {
        const company = await createCompany();
        const warehouse = await createWarehouse(company._id as mongoose.Types.ObjectId, '560001');

        await createBaseOrderDocument({
            companyId: company._id as mongoose.Types.ObjectId,
            warehouseId: warehouse._id as mongoose.Types.ObjectId,
            status: 'pending',
            orderNumberSuffix: 'PENDING',
        });
        await createBaseOrderDocument({
            companyId: company._id as mongoose.Types.ObjectId,
            warehouseId: warehouse._id as mongoose.Types.ObjectId,
            status: 'ready_to_ship',
            orderNumberSuffix: 'READY_TO_SHIP',
        });
        await createBaseOrderDocument({
            companyId: company._id as mongoose.Types.ObjectId,
            warehouseId: warehouse._id as mongoose.Types.ObjectId,
            status: 'new',
            orderNumberSuffix: 'NEW',
        });
        await createBaseOrderDocument({
            companyId: company._id as mongoose.Types.ObjectId,
            warehouseId: warehouse._id as mongoose.Types.ObjectId,
            status: 'ready',
            orderNumberSuffix: 'READY',
        });
        await createBaseOrderDocument({
            companyId: company._id as mongoose.Types.ObjectId,
            warehouseId: warehouse._id as mongoose.Types.ObjectId,
            status: 'shipped',
            orderNumberSuffix: 'SHIPPED',
        });

        const result = await OrderService.getInstance().listOrdersWithStats(
            String(company._id),
            { status: 'unshipped' },
            { page: 1, limit: 20 }
        );

        expect(result.total).toBe(4);
        expect(result.orders).toHaveLength(4);
        expect(result.orders.every((order: any) =>
            ['pending', 'ready_to_ship', 'new', 'ready'].includes(order.currentStatus)
        )).toBe(true);
    });

    it('rolls back wallet debit when shipment creation fails after wallet deduction', async () => {
        const company = await createCompany();
        const warehouse = await createWarehouse(company._id as mongoose.Types.ObjectId, '560001');

        const order = await createBaseOrderDocument({
            companyId: company._id as mongoose.Types.ObjectId,
            warehouseId: warehouse._id as mongoose.Types.ObjectId,
            status: 'pending',
            orderNumberSuffix: 'ROLLBACK',
        });

        jest.spyOn(ShipmentService, 'selectCarrierForShipment').mockResolvedValue({
            selectedCarrier: 'manual_carrier',
            selectedOption: {
                carrier: 'manual_carrier',
                rate: 120,
                deliveryTime: 3,
                optionId: 'opt-rollback',
                quoteSessionId: 'session-rollback',
            },
            carrierResult: {
                selectedCarrier: 'manual_carrier',
                alternativeOptions: [
                    { carrier: 'manual_carrier', rate: 120, deliveryTime: 3 },
                ],
            } as any,
        });

        jest.spyOn(Shipment.prototype, 'save').mockImplementation(async function mockShipmentSave(this: any) {
            return this as any;
        });
        jest.spyOn(Order, 'findOneAndUpdate').mockResolvedValue(null as any);

        await expect(
            ShipmentService.createShipment({
                order,
                companyId: company._id as mongoose.Types.ObjectId,
                userId,
                payload: {
                    serviceType: 'standard',
                    warehouseId: String(warehouse._id),
                },
                idempotencyKey: `rollback-${Date.now()}`,
            })
        ).rejects.toMatchObject({
            code: ErrorCode.BIZ_VERSION_CONFLICT,
            statusCode: 409,
        });

        const refreshedCompany = await Company.findById(company._id).lean();
        const walletTxCount = await WalletTransaction.countDocuments({ company: company._id });
        const shipmentCount = await Shipment.countDocuments({ orderId: order._id });

        expect(refreshedCompany?.wallet?.balance).toBe(1000);
        expect(walletTxCount).toBe(0);
        expect(shipmentCount).toBe(0);
    });

    it('rejects shipment creation when non-INR order is missing operational INR base totals', async () => {
        const company = await createCompany();
        const warehouse = await createWarehouse(company._id as mongoose.Types.ObjectId, '560001');

        const order = await createBaseOrderDocument({
            companyId: company._id as mongoose.Types.ObjectId,
            warehouseId: warehouse._id as mongoose.Types.ObjectId,
            status: 'pending',
            orderNumberSuffix: 'USD-NO-BASE',
            currency: 'USD',
            paymentMethod: 'cod',
            totals: {
                subtotal: 100,
                tax: 5,
                shipping: 0,
                discount: 0,
                total: 105,
            },
        });

        await expect(
            ShipmentService.createShipment({
                order,
                companyId: company._id as mongoose.Types.ObjectId,
                userId,
                payload: {
                    serviceType: 'standard',
                    warehouseId: String(warehouse._id),
                },
                idempotencyKey: `currency-guard-${Date.now()}`,
            })
        ).rejects.toMatchObject({
            code: ErrorCode.BIZ_INVALID_STATE,
            statusCode: 400,
        });

        const refreshedCompany = await Company.findById(company._id).lean();
        const walletTxCount = await WalletTransaction.countDocuments({ company: company._id });
        expect(refreshedCompany?.wallet?.balance).toBe(1000);
        expect(walletTxCount).toBe(0);
    });

    it('uses operational INR base totals for COD and declared values on non-INR orders', async () => {
        const company = await createCompany();
        const warehouse = await createWarehouse(company._id as mongoose.Types.ObjectId, '560001');

        const order = await createBaseOrderDocument({
            companyId: company._id as mongoose.Types.ObjectId,
            warehouseId: warehouse._id as mongoose.Types.ObjectId,
            status: 'pending',
            orderNumberSuffix: 'USD-BASE',
            currency: 'USD',
            paymentMethod: 'cod',
            totals: {
                subtotal: 100,
                tax: 5,
                shipping: 0,
                discount: 0,
                total: 105,
                baseCurrency: 'INR',
                baseCurrencySubtotal: 8300,
                baseCurrencyTax: 415,
                baseCurrencyShipping: 0,
                baseCurrencyTotal: 8715,
            },
        });

        jest.spyOn(ShipmentService, 'selectCarrierForShipment').mockResolvedValue({
            selectedCarrier: 'manual_carrier',
            selectedOption: {
                carrier: 'manual_carrier',
                rate: 120,
                deliveryTime: 3,
                optionId: 'opt-currency',
                quoteSessionId: 'session-currency',
            },
            carrierResult: {
                selectedCarrier: 'manual_carrier',
                alternativeOptions: [
                    { carrier: 'manual_carrier', rate: 120, deliveryTime: 3 },
                ],
            } as any,
        });

        const result = await ShipmentService.createShipment({
            order,
            companyId: company._id as mongoose.Types.ObjectId,
            userId,
            payload: {
                serviceType: 'standard',
                warehouseId: String(warehouse._id),
            },
            idempotencyKey: `currency-base-${Date.now()}`,
        });

        expect(result.shipment.paymentDetails.codAmount).toBe(8715);
        expect(result.shipment.packageDetails.declaredValue).toBe(8715);
        expect(result.updatedOrder.totals.total).toBe(105);
        expect(result.updatedOrder.totals.baseCurrencyShipping).toBe(120);
        expect(result.updatedOrder.totals.baseCurrencyTotal).toBe(8835);
    });
});
