/**
 * Packing Service Unit Tests
 * Tests for packing stations and session management
 */
import mongoose from 'mongoose';
import PackingService from '../../../../src/core/application/services/warehouse/PackingService';
import { createTestPackingStation } from '../../../fixtures/packingFactory';
import { createTestUser } from '../../../fixtures/userFactory';

describe('Packing Service', () => {
    describe('Station Management', () => {
        it('should create a packing station', async () => {
            const station = await PackingService.createStation({
                warehouseId: new mongoose.Types.ObjectId().toString(),
                companyId: new mongoose.Types.ObjectId().toString(),
                stationCode: 'PS-TEST-001',
                name: 'Test Station'
            });

            expect(station).toBeDefined();
            expect(station.stationCode).toBe('PS-TEST-001');
            expect(station.status).toBe('AVAILABLE');
        });

        it('should toggle station offline/online', async () => {
            const station = await createTestPackingStation({ status: 'AVAILABLE' });

            const offline = await PackingService.setStationOffline(station._id.toString(), 'Maintenance');
            expect(offline.status).toBe('OFFLINE');

            const online = await PackingService.setStationOnline(station._id.toString());
            expect(online.status).toBe('AVAILABLE');
        });
    });

    describe('Packer Assignment', () => {
        it('should assign a packer to an empty station', async () => {
            const station = await createTestPackingStation({ status: 'AVAILABLE' });
            const packer = await createTestUser({ role: 'staff' });

            const assigned = await PackingService.assignPacker({
                stationId: station._id.toString(),
                packerId: packer._id.toString()
            });

            expect(assigned.status).toBe('OCCUPIED');
            expect(assigned.assignedTo.toString()).toBe(packer._id.toString());
        });

        it('should fail assignment if station occupied', async () => {
            const station = await createTestPackingStation({ status: 'OCCUPIED' });
            const packer = await createTestUser({ role: 'staff' });

            await expect(PackingService.assignPacker({
                stationId: station._id.toString(),
                packerId: packer._id.toString()
            })).rejects.toThrow('Station is already occupied');
        });
    });

    describe('Packing Session', () => {
        it('should start a packing session', async () => {
            const packer = await createTestUser();
            const station = await createTestPackingStation({
                status: 'OCCUPIED',
                assignedTo: packer._id.toString()
            });

            const session = await PackingService.startPackingSession({
                stationId: station._id.toString(),
                pickListId: new mongoose.Types.ObjectId().toString(),
                orderId: new mongoose.Types.ObjectId().toString(),
                orderNumber: 'ORD-PACK-1',
                packerId: packer._id.toString(),
                items: [
                    { sku: 'SKU-1', productName: 'Item 1', quantity: 1 }
                ]
            });

            expect(session.currentSession).toBeDefined();
            expect(session.currentSession?.orderNumber).toBe('ORD-PACK-1');
            expect(session.currentSession?.status).toBe('IN_PROGRESS');
        });

        it('should pack an item', async () => {
            const packer = await createTestUser();
            const station = await createTestPackingStation({
                status: 'OCCUPIED',
                assignedTo: packer._id.toString()
            });

            // Start session manually by update because we need complex state
            station.currentSession = {
                pickListId: new mongoose.Types.ObjectId(),
                orderId: new mongoose.Types.ObjectId(),
                orderNumber: 'ORD-TEST',
                startedAt: new Date(),
                status: 'IN_PROGRESS',
                items: [{ sku: 'SKU-A', productName: 'Prod A', quantity: 2, packed: 0 }]
            };
            await station.save();

            const result = await PackingService.packItem({
                stationId: station._id.toString(),
                sku: 'SKU-A',
                quantity: 1
            });

            const item = result.currentSession?.items.find((i: any) => i.sku === 'SKU-A');
            expect(item.packed).toBe(1);
        });
    });

    describe('Verification', () => {
        it('should verify weight tolerance', async () => {
            const resultPass = await PackingService.verifyWeight({
                stationId: 'dummy', // Static method doesn't use DB for this calculus
                packageNumber: 1,
                actualWeight: 1.02,
                expectedWeight: 1.00,
                tolerance: 5 // 5%
            });

            expect(resultPass.passed).toBe(true);
            expect(resultPass.variancePercent).toBeCloseTo(2);

            const resultFail = await PackingService.verifyWeight({
                stationId: 'dummy',
                packageNumber: 1,
                actualWeight: 1.50,
                expectedWeight: 1.00,
                tolerance: 5
            });

            expect(resultFail.passed).toBe(false);
        });
    });
});
