/**
 * Picking Service Unit Tests
 * Tests for picking workflows managed by PickingService
 */
import mongoose from 'mongoose';
import PickingService from '../../../../src/core/application/services/warehouse/PickingService';
import PickList from '../../../../src/infrastructure/database/mongoose/models/PickList';
// Factories
import { createTestPickList } from '../../../fixtures/pickingFactory';
import { createTestUser } from '../../../fixtures/userFactory';
// Verified imports
// Note: PickingService uses static methods, so we don't need to instantiate it

describe('Picking Service', () => {
    describe('Pick List Creation', () => {
        // Note: createPickList logic involves complex order queries which are hard to unit test 
        // without heavy mocking of Order.find. For this unit test, we will focus on 
        // state transitions and data retrieval which rely on the factory data.

        it('should retrieve a pick list by ID', async () => {
            const pickList = await createTestPickList();

            const found = await PickingService.getPickListById(pickList._id.toString());

            expect(found).toBeDefined();
            expect(found?._id.toString()).toBe(pickList._id.toString());
            expect(found?.status).toBe('PENDING');
        });

        it('should list pick lists with filters', async () => {
            await createTestPickList({ status: 'PENDING' });
            await createTestPickList({ status: 'COMPLETED' });

            const result = await PickingService.getPickLists({
                status: 'PENDING'
            });

            // Note: DB might have data from other tests, so we check if at least one is returned
            expect(result.data.length).toBeGreaterThanOrEqual(1);
            expect(result.data[0].status).toBe('PENDING');
        });
    });

    describe('Assignment', () => {
        it('should assign a pick list to a picker', async () => {
            const pickList = await createTestPickList({ status: 'PENDING' });
            const picker = await createTestUser({ role: 'staff' });
            const assigner = await createTestUser({ role: 'admin' });

            const updated = await PickingService.assignPickList({
                pickListId: pickList._id.toString(),
                pickerId: picker._id.toString(),
                assignedBy: assigner._id.toString()
            });

            expect(updated.status).toBe('ASSIGNED');
            expect(updated.assignedTo.toString()).toBe(picker._id.toString());
        });

        it('should fail if pick list does not exist', async () => {
            const picker = await createTestUser({ role: 'staff' });
            const assigner = await createTestUser({ role: 'admin' });
            const fakeId = new mongoose.Types.ObjectId().toString();

            await expect(PickingService.assignPickList({
                pickListId: fakeId,
                pickerId: picker._id.toString(),
                assignedBy: assigner._id.toString()
            })).rejects.toThrow('Pick list not found');
        });
    });

    describe('Picking Process', () => {
        it('should start picking session', async () => {
            const picker = await createTestUser({ role: 'staff' });
            const pickList = await createTestPickList({
                status: 'ASSIGNED',
                assignedTo: picker._id.toString()
            });

            const started = await PickingService.startPicking({
                pickListId: pickList._id.toString(),
                pickerId: picker._id.toString()
            });

            expect(started.status).toBe('IN_PROGRESS');
            expect(started.startedAt).toBeDefined();
        });

        it('should pick an item successfully', async () => {
            const pickList = await createTestPickList({ status: 'IN_PROGRESS' });
            const itemToPick = pickList.items[0];

            const updated = await PickingService.pickItem({
                pickListId: pickList._id.toString(),
                itemId: itemToPick._id.toString(),
                quantityPicked: itemToPick.quantityRequired,
                barcodeScanned: true
            });

            const pickedItem = updated.items.find((i: any) => i._id.toString() === itemToPick._id.toString());
            expect(pickedItem.quantityPicked).toBe(itemToPick.quantityRequired);
            expect(pickedItem.status).toBe('PICKED');
            expect(pickedItem.barcodeScanned).toBe(true);
        });

        it('should mark item as short pick if quantity mismatch', async () => {
            const pickList = await createTestPickList({ status: 'IN_PROGRESS' });
            const itemToPick = pickList.items[0];

            const updated = await PickingService.pickItem({
                pickListId: pickList._id.toString(),
                itemId: itemToPick._id.toString(),
                quantityPicked: 0,
                barcodeScanned: false,
                reason: 'Damaged'
            });

            const pickedItem = updated.items.find((i: any) => i._id.toString() === itemToPick._id.toString());
            expect(pickedItem.status).toBe('SHORT_PICK');
            expect(pickedItem.reason).toBe('Damaged');
        });
    });

    describe('Completion', () => {
        it('should complete a pick list', async () => {
            const pickList = await createTestPickList({ status: 'IN_PROGRESS' });

            const completed = await PickingService.completePickList({
                pickListId: pickList._id.toString(),
                pickerId: new mongoose.Types.ObjectId().toString(),
                pickerNotes: 'All done'
            });

            expect(completed.status).toBe('COMPLETED');
            expect(completed.completedAt).toBeDefined();
            expect(completed.pickerNotes).toBe('All done');
        });
    });
});
