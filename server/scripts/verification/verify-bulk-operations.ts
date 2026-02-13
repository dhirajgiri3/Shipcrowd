import * as dotenv from 'dotenv';
import path from 'path';

// 1. Load Environment Variables Critical Step
const res = dotenv.config({ path: path.join(process.cwd(), '.env') });
if (res.error) console.error('dotenv load failed:', res.error);

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipcrowd_test';

async function verifyBulkOperations() {
    console.log('🚀 Starting Bulk Operations Verification...');

    try {
        // 2. Dynamic Imports for robust path resolution
        const controllerPath = path.resolve(process.cwd(), 'src/presentation/http/controllers/shipments/bulk-shipment.controller.ts');
        const labelControllerPath = path.resolve(process.cwd(), 'src/presentation/http/controllers/shipments/label.controller.ts');
        const modelsPath = path.resolve(process.cwd(), 'src/infrastructure/database/mongoose/models/index.ts');

        const { default: BulkShipmentController } = await import(controllerPath);
        const { default: LabelController } = await import(labelControllerPath);
        const { Shipment, Manifest } = await import(modelsPath);

        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 3. Setup Data
        const companyId = new mongoose.Types.ObjectId();
        const warehouseId = new mongoose.Types.ObjectId();

        // Cleanup
        await Shipment.deleteMany({ companyId });
        await Manifest.deleteMany({ companyId });

        console.log('🌱 Seeding 50 Shipments...');

        const shipments = [];
        for (let i = 0; i < 50; i++) {
            const carrier = i < 25 ? 'velocity' : 'delhivery';
            shipments.push({
                companyId,
                warehouseId, // This is ignored by schema structure, need to put in pickupDetails? Wait, schema has pickupDetails.warehouseId
                pickupDetails: {
                    warehouseId,
                    pickupDate: new Date(),
                    contactPerson: 'Test',
                    contactPhone: '9999999999'
                },
                trackingNumber: `BULK-${i}-${Date.now()}`,
                carrier, // Already set dynamically
                serviceType: 'surface', // Added required field
                status: 'ready_to_ship',
                currentStatus: 'ready_to_ship', // Required by Controller
                packageDetails: {
                    weight: 0.5,
                    dimensions: { length: 10, width: 10, height: 10 },
                    packageType: 'box',
                    declaredValue: 1000,
                    packageCount: 1
                },
                deliveryDetails: {
                    address: { line1: 'Test St', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' },
                    recipientName: `User ${i}`,
                    recipientPhone: '9999999999'
                },
                paymentDetails: {
                    type: 'prepaid',
                    shippingCost: 50,
                    currency: 'INR'
                },
                orderId: new mongoose.Types.ObjectId(), // Fixed: Must be ObjectId
                weights: {
                    declared: { value: 0.5, unit: 'kg' },
                    verified: false
                }
            });
        }

        const createdShipments = await Shipment.insertMany(shipments);
        const shipmentIds = createdShipments.map((s: any) => s._id.toString());
        console.log('✅ Seeded 50 Shipments');

        // 4. Test createBulkManifest
        console.log('🔄 Testing createBulkManifest...');

        // Mock Request/Response
        const req: any = {
            user: { companyId: companyId.toString(), role: 'admin' },
            body: {
                shipmentIds,
                pickup: {
                    scheduledDate: new Date(),
                    timeSlot: '10:00-12:00',
                    contactPerson: 'Test',
                    contactPhone: '9999999999'
                }
            }
        };

        const resObj: any = {
            status: function (code: number) { console.log('Status:', code); return this; },
            json: function (data: any) {
                this.data = data;
                return this;
            },
            setHeader: function (k: string, v: string) { console.log(`Header: ${k}=${v}`); },
            send: function (data: any) { this.data = data; }
        };
        const next = (err: any) => { if (err) console.error('Next Error:', err); };

        await BulkShipmentController.createBulkManifest(req, resObj, next);

        if (!resObj.data || !resObj.data.data) {
            throw new Error('No response data');
        }

        const result = resObj.data.data;
        console.log(`📊 Manifests Created: ${result.manifestsCreated}`);

        if (result.manifestsCreated !== 2) {
            console.error('Errors:', result.errors);
            throw new Error(`Expected 2 manifests, got ${result.manifestsCreated}`);
        }

        // Verify Manifest Carriers
        const manifests = result.manifests;
        const carriers = manifests.map((m: any) => m.carrier);
        if (!carriers.includes('velocity') || !carriers.includes('delhivery')) {
            throw new Error('Manifests created for wrong carriers');
        }

        console.log('✅ createBulkManifest Passed');

        // 5. Test generateBulkLabels
        console.log('🔄 Testing generateBulkLabels...');

        // Mock Request
        const reqLabels: any = {
            user: { companyId: companyId.toString() },
            body: { shipmentIds }
        };

        // Reset response object
        resObj.data = null;

        await LabelController.generateBulkLabels(reqLabels, resObj, next);

        if (!resObj.data || !(resObj.data instanceof Buffer)) {
            throw new Error('Response is not a PDF Buffer');
        }

        const pdfSize = resObj.data.length;
        console.log(`📄 Generated PDF Size: ${pdfSize} bytes`);

        if (pdfSize < 1000) throw new Error('PDF too small, likely empty');

        console.log('✅ generateBulkLabels Passed');
        console.log('✅ VERIFICATION SUCCESSFUL: Bulk Operations Work!');

        // Cleanup
        await Shipment.deleteMany({ companyId });
        await Manifest.deleteMany({ companyId });

    } catch (error: any) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verifyBulkOperations();
