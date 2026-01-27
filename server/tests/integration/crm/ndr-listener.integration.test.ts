
import mongoose from 'mongoose';

import eventBus from '../../../src/shared/events/eventBus';
import CallLog from '../../../src/infrastructure/database/mongoose/models/crm/communication/call-log.model';
import Company from '../../../src/infrastructure/database/mongoose/models/organization/core/company.model';
import SalesRepresentative from '../../../src/infrastructure/database/mongoose/models/crm/sales/sales-representative.model';
import User from '../../../src/infrastructure/database/mongoose/models/iam/users/user.model';
import NDRResolutionListener from '../../../src/core/application/listeners/crm/NDRResolutionListener';
import { generateAuthToken } from '../../setup/testHelpers';

describe('NDR Resolution Listener - Integration Tests', () => {
    let company: any;
    let salesRep: any;
    let salesRepUser: any;

    beforeAll(async () => {
        // Explicitly initialize the listener (singleton)
        // Accessing the default export triggers the constructor and listener setup
        console.log('Listener initialized:', !!NDRResolutionListener);
    });

    afterAll(async () => {
        // Cleanup handled by testHelpers
    });

    beforeEach(async () => {
        await CallLog.deleteMany({});
        await Company.deleteMany({});
        await SalesRepresentative.deleteMany({});
        await User.deleteMany({});

        // Setup Base Data
        company = await Company.create({
            name: 'Test Logistics Co',
            billingInfo: { bankName: 'HDFC', accountNumber: '1234567890' },
            status: 'approved',
            isActive: true
        });

        salesRepUser = await User.create({
            name: 'Rep User',
            email: 'rep@test.com',
            password: 'password123',
            role: 'staff',
            companyId: company._id
        });

        salesRep = await SalesRepresentative.create({
            company: company._id,
            user: salesRepUser._id,
            employeeId: 'EMP-LISTENER-1',
            role: 'rep',
            name: 'Listener Rep',
            email: 'listener.rep@test.com',
            phone: '9876543210',
            status: 'active',
            availabilityStatus: 'available', // Ready for assignment
            territory: 'North',
            bankDetails: {
                accountHolderName: 'Rep Name',
                accountNumber: '1234567890',
                ifscCode: 'SBIN0001234',
                bankName: 'SBI'
            },
            performance: {
                ticketsResolved: 0,
                avgResolutionTime: 0,
                conversionRate: 0,
                commissionEarned: 0
            }
        });
    });

    it('should auto-create a call log when ndr.created event is emitted', async () => {
        const payload = {
            ndrId: new mongoose.Types.ObjectId().toString(),
            shipmentId: 'SHIP-NDR-123',
            companyId: company._id.toString(),
            awb: 'AWB123456',
            reason: 'Customer refused delivery'
        };

        // Emit event
        eventBus.emit('ndr.created', payload);

        // Wait for async processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify CallLog created
        const callLogs = await CallLog.find({ shipmentId: 'SHIP-NDR-123' });
        expect(callLogs.length).toBe(1);
        expect(callLogs[0].notes).toContain('Customer refused delivery');
        expect(callLogs[0].status).toBe('scheduled');
        expect(callLogs[0].salesRepId).toBeDefined(); // Should be assigned
    });
});
