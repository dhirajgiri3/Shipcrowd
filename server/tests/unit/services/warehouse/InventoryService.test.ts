/**
 * Inventory Service Unit Tests
 * Tests for inventory management and stock movements
 */
import mongoose from 'mongoose';
import { InventoryService } from '../../../../src/core/application/services/warehouse';
import { createTestInventory } from '../../../fixtures/inventoryFactory';
import { randomString } from '../../../helpers/randomData';

describe('Inventory Service', () => {
    describe('Creation & Retrieval', () => {
        it('should create new inventory record', async () => {
            const sku = `TEST-${randomString(5)}`;
            const warehouseId = new mongoose.Types.ObjectId().toString();
            const companyId = new mongoose.Types.ObjectId().toString();

            const inventory = await InventoryService.createInventory({
                warehouseId,
                companyId,
                sku,
                productName: 'Test Product',
                initialQuantity: 100
            });

            expect(inventory).toBeDefined();
            expect(inventory.sku).toBe(sku.toUpperCase()); // Service converts to uppercase
            expect(inventory.onHand).toBe(100);
            expect(inventory.status).toBe('ACTIVE');
        });

        it('should prevent duplicate SKU in same warehouse', async () => {
            const sku = `DUPE-${randomString(5)}`;
            const warehouseId = new mongoose.Types.ObjectId().toString();
            // Create first one
            await createTestInventory({ warehouseId, sku });

            // Try second one
            await expect(InventoryService.createInventory({
                warehouseId,
                companyId: new mongoose.Types.ObjectId().toString(),
                sku,
                productName: 'Diff Product',
                initialQuantity: 50
            })).rejects.toThrow('Inventory already exists');
        });
    });

    describe('Stock Operations', () => {
        it('should receive stock effectively', async () => {
            const inventory = await createTestInventory({ onHand: 10 });

            const result = await InventoryService.receiveStock({
                warehouseId: inventory.warehouseId.toString(),
                companyId: inventory.companyId.toString(),
                sku: inventory.sku,
                quantity: 50,
                locationId: new mongoose.Types.ObjectId().toString(),
                performedBy: new mongoose.Types.ObjectId().toString()
            });

            expect(result.inventory.onHand).toBe(60); // 10 + 50
            expect(result.movement).toBeDefined();
            expect(result.movement.type).toBe('RECEIVE');
            expect(result.movement.quantity).toBe(50);
        });

        it('should adjust stock manually', async () => {
            const inventory = await createTestInventory({ onHand: 100 });

            const result = await InventoryService.adjustStock({
                inventoryId: inventory._id.toString(),
                quantity: -20, // Remove 20
                reason: 'Cycle Count Correction',
                performedBy: new mongoose.Types.ObjectId().toString()
            });

            expect(result.inventory.onHand).toBe(80);
            expect(result.movement.type).toBe('ADJUSTMENT');
            expect(result.movement.quantity).toBe(-20);
        });
    });

    describe('Reservations', () => {
        it('should reserve stock if available', async () => {
            const inventory = await createTestInventory({ onHand: 10, reserved: 0 });

            const updated = await InventoryService.reserveStock({
                inventoryId: inventory._id.toString(),
                quantity: 5,
                orderId: new mongoose.Types.ObjectId().toString(),
                orderNumber: 'ORD-123',
                reservedBy: new mongoose.Types.ObjectId().toString()
            });

            expect(updated.reserved).toBe(5);
        });

        it('should fail reservation if insufficient stock', async () => {
            const inventory = await createTestInventory({ onHand: 5, reserved: 2 }); // 3 available

            await expect(InventoryService.reserveStock({
                inventoryId: inventory._id.toString(),
                quantity: 4, // Need 4
                orderId: new mongoose.Types.ObjectId().toString(),
                orderNumber: 'ORD-FAIL',
                reservedBy: new mongoose.Types.ObjectId().toString()
            })).rejects.toThrow('Insufficient stock available');
        });
    });

    describe('Movements Audit', () => {
        it('should log movements correctly', async () => {
            const inventory = await createTestInventory();

            await InventoryService.adjustStock({
                inventoryId: inventory._id.toString(),
                quantity: 5,
                reason: 'Test',
                performedBy: new mongoose.Types.ObjectId().toString()
            });

            const movements = await InventoryService.getMovements({
                inventoryId: inventory._id.toString()
            });

            expect(movements.data.length).toBeGreaterThanOrEqual(1);
            expect(movements.data[0].type).toBe('ADJUSTMENT');
        });
    });
});
