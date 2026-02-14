import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY =
        process.env.FIELD_ENCRYPTION_SECRET ||
        '02207fcc1b5ce31788490e5cebf0deafb7000b20223942900fffd2c1bbb780';
}

function getArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    const arg = process.argv.find((item) => item.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : undefined;
}

function companyTag(companyId: mongoose.Types.ObjectId): string {
    return companyId.toString().slice(-6).toUpperCase();
}

function makeRemittanceId(tag: string, status: string, idx: number): string {
    return `REM-FX-${tag}-${status.toUpperCase().slice(0, 3)}${idx}`;
}

async function main(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/Shipcrowd';
    await mongoose.connect(mongoUri);

    const {
        Company,
        Order,
        Shipment,
        User,
        Warehouse,
    } = await import('../src/infrastructure/database/mongoose/models');
    const { default: CODRemittance } = await import(
        '../src/infrastructure/database/mongoose/models/finance/payouts/cod-remittance.model'
    );
    const { default: CODDiscrepancy } = await import(
        '../src/infrastructure/database/mongoose/models/finance/cod-discrepancy.model'
    );

    const resolveCompanyId = async (): Promise<mongoose.Types.ObjectId> => {
        const companyIdArg = getArg('companyId');
        if (companyIdArg) {
            return new mongoose.Types.ObjectId(companyIdArg);
        }

        const email = getArg('email');
        if (email) {
            const user = await User.findOne({ email }).select('companyId').lean();
            if (!user?.companyId) {
                throw new Error(`User ${email} has no companyId`);
            }
            return new mongoose.Types.ObjectId(String(user.companyId));
        }

        const company = await Company.findOne({ isDeleted: false }).select('_id').lean();
        if (!company?._id) {
            throw new Error('No company found. Pass --companyId or --email');
        }
        return new mongoose.Types.ObjectId(String(company._id));
    };

    const companyId = await resolveCompanyId();
    const warehouse = await Warehouse.findOne({ companyId, isDeleted: false }).select('_id').lean();
    if (!warehouse?._id) {
        throw new Error('No warehouse found for target company');
    }

    const now = new Date();
    const tag = companyTag(companyId);
    const orderPrefix = `CODFX-${tag}-`;
    const awbPrefix = `AWB-CODFX-${tag}-`;
    const discrepancyPrefix = `CODD-${now.getFullYear()}-${tag}-`;

    await CODRemittance.deleteMany({
        companyId,
        remittanceId: { $regex: `^REM-FX-${tag}-` },
    });
    await CODDiscrepancy.deleteMany({
        companyId,
        discrepancyNumber: { $regex: `^${discrepancyPrefix}` },
    });
    await Shipment.deleteMany({
        companyId,
        trackingNumber: { $regex: `^${awbPrefix}` },
    });
    await Order.deleteMany({
        companyId,
        orderNumber: { $regex: `^${orderPrefix}` },
    });

    const statuses: Array<'pending_approval' | 'approved' | 'paid' | 'settled' | 'failed'> = [
        'pending_approval',
        'approved',
        'paid',
        'settled',
        'failed',
    ];

    const shipments: mongoose.Types.ObjectId[] = [];

    for (let i = 0; i < statuses.length + 2; i++) {
        const order = await Order.create({
            companyId,
            orderNumber: `${orderPrefix}${i + 1}`,
            customerInfo: {
                name: `COD Fixture ${i}`,
                phone: `9000000${(100 + i).toString()}`,
                address: {
                    line1: 'Fixture Street',
                    city: 'Bengaluru',
                    state: 'Karnataka',
                    country: 'India',
                    postalCode: '560001',
                },
            },
            products: [
                {
                    sku: `SKU-CODFX-${i}`,
                    name: `Fixture Product ${i}`,
                    quantity: 1,
                    price: 1000 + i * 100,
                },
            ],
            shippingDetails: {
                shippingCost: 80,
            },
            paymentMethod: 'cod',
            paymentStatus: 'pending',
            source: 'manual',
            warehouseId: warehouse._id,
            totals: {
                subtotal: 1000 + i * 100,
                tax: 0,
                shipping: 80,
                discount: 0,
                total: 1080 + i * 100,
            },
            currentStatus: 'fulfilled',
            isDeleted: false,
        } as any);

        const deliveredAt = new Date(now.getTime() - (i + 2) * 24 * 60 * 60 * 1000);
        const shipment = await Shipment.create({
            trackingNumber: `${awbPrefix}${i + 1}`,
            orderId: order._id,
            companyId,
            carrier: 'velocity',
            serviceType: 'surface',
            packageDetails: {
                weight: 1,
                dimensions: { length: 10, width: 10, height: 10 },
                packageCount: 1,
                packageType: 'box',
                declaredValue: 1000 + i * 100,
            },
            pickupDetails: {
                warehouseId: warehouse._id,
                pickupDate: deliveredAt,
                contactPerson: 'Fixture Ops',
                contactPhone: '9000000000',
            },
            deliveryDetails: {
                recipientName: `COD Fixture ${i}`,
                recipientPhone: `9000000${(100 + i).toString()}`,
                address: {
                    line1: 'Fixture Street',
                    city: 'Bengaluru',
                    state: 'Karnataka',
                    country: 'India',
                    postalCode: '560001',
                },
            },
            paymentDetails: {
                type: 'cod',
                codAmount: 1000 + i * 100,
                shippingCost: 80,
                currency: 'INR',
                totalCollection: 1000 + i * 100,
                collectionStatus: 'reconciled',
                actualCollection: 1000 + i * 100,
                collectedAt: deliveredAt,
                remittance: { included: false },
            },
            currentStatus: 'delivered',
            actualDelivery: deliveredAt,
            weights: {
                declared: { value: 1, unit: 'kg' },
                verified: false,
            },
            statusHistory: [{ status: 'delivered', timestamp: deliveredAt }],
            isDeleted: false,
        } as any);

        shipments.push(shipment._id);
    }

    for (let i = 0; i < statuses.length; i++) {
        const status = statuses[i];
        const codAmount = 1000 + i * 100;
        const shipping = 80;
        const platformFee = Math.round(codAmount * 0.005);
        const netPayable = codAmount - shipping - platformFee;
        const createdDate = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);

        await CODRemittance.create({
            remittanceId: makeRemittanceId(tag, status, i + 1),
            companyId,
            batch: {
                batchNumber: i + 1,
                createdDate,
                cutoffDate: createdDate,
                shippingPeriod: { start: createdDate, end: createdDate },
            },
            schedule: {
                type: 'manual',
            },
            shipments: [
                {
                    shipmentId: shipments[i],
                    awb: `${awbPrefix}${i + 1}`,
                    codAmount,
                    deliveredAt: createdDate,
                    status: 'delivered',
                    deductions: {
                        shippingCharge: shipping,
                        platformFee,
                        total: shipping + platformFee,
                    },
                    netAmount: netPayable,
                },
            ],
            financial: {
                totalCODCollected: codAmount,
                totalShipments: 1,
                successfulDeliveries: 1,
                rtoCount: 0,
                disputedCount: 0,
                deductionsSummary: {
                    totalShippingCharges: shipping,
                    totalWeightDisputes: 0,
                    totalRTOCharges: 0,
                    totalInsuranceCharges: 0,
                    totalPlatformFees: platformFee,
                    totalOtherFees: 0,
                    grandTotal: shipping + platformFee,
                },
                netPayable,
            },
            payout: {
                status:
                    status === 'paid' || status === 'settled'
                        ? 'completed'
                        : status === 'failed'
                          ? 'failed'
                          : 'pending',
                method: 'razorpay_payout',
                initiatedAt: createdDate,
                completedAt: status === 'paid' || status === 'settled' ? now : undefined,
            },
            status,
            settlementDetails:
                status === 'paid' || status === 'settled'
                    ? {
                          settlementId: `SET-CODFX-${i + 1}`,
                          settledAt: now,
                          utrNumber: `UTR-CODFX-${i + 1}`,
                          settledAmount: netPayable,
                      }
                    : undefined,
            timeline: [
                {
                    status: 'draft',
                    timestamp: createdDate,
                    actor: 'system',
                    action: 'Fixture remittance created',
                },
                ...(status !== 'pending_approval'
                    ? [
                          {
                              status: 'approved',
                              timestamp: createdDate,
                              actor: 'system',
                              action: 'Fixture approved',
                          },
                      ]
                    : []),
                ...(status === 'paid' || status === 'settled'
                    ? [
                          {
                              status: 'paid',
                              timestamp: now,
                              actor: 'system',
                              action: 'Fixture paid',
                          },
                      ]
                    : []),
            ],
            reportGenerated: false,
            isDeleted: false,
        } as any);

        await Shipment.updateOne(
            { _id: shipments[i] },
            {
                $set: {
                    'remittance.included': true,
                    'remittance.remittanceId': makeRemittanceId(tag, status, i + 1),
                    'remittance.remittedAt': now,
                    'remittance.remittedAmount': netPayable,
                    'paymentDetails.collectionStatus': 'remitted',
                },
            }
        );
    }

    await CODDiscrepancy.create([
        {
            discrepancyNumber: `${discrepancyPrefix}01`,
            shipmentId: shipments[statuses.length],
            awb: `${awbPrefix}DISC-1`,
            companyId,
            carrier: 'velocity',
            amounts: {
                expected: { cod: 1400, total: 1400 },
                actual: { collected: 1200, reported: 1200, source: 'manual' },
                difference: -200,
                percentage: -14.29,
            },
            type: 'amount_mismatch',
            severity: 'medium',
            status: 'detected',
            autoResolveAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            timeline: [{ status: 'detected', timestamp: now }],
        },
        {
            discrepancyNumber: `${discrepancyPrefix}02`,
            shipmentId: shipments[statuses.length + 1],
            awb: `${awbPrefix}DISC-2`,
            companyId,
            carrier: 'velocity',
            amounts: {
                expected: { cod: 1500, total: 1500 },
                actual: { collected: 1500, reported: 1500, source: 'manual' },
                difference: 0,
                percentage: 0,
            },
            type: 'amount_mismatch',
            severity: 'minor',
            status: 'resolved',
            resolution: {
                method: 'courier_adjustment',
                adjustedAmount: 1500,
                resolvedAt: now,
                resolvedBy: 'fixture_seed',
                remarks: 'Fixture resolved discrepancy',
            },
            timeline: [{ status: 'resolved', timestamp: now }],
        },
    ]);

    console.log(
        JSON.stringify({
            success: true,
            companyId: companyId.toString(),
            remittancesCreated: statuses.length,
            discrepanciesCreated: 2,
        })
    );

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error('Failed to seed COD fixture:', error);
    try {
        await mongoose.disconnect();
    } catch {
        // ignore
    }
    process.exit(1);
});
