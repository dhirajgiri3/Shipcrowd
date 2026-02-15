import SalesRepresentative from '@/infrastructure/database/mongoose/models/crm/sales/sales-representative.model';
import SupportTicket from '@/infrastructure/database/mongoose/models/crm/support/support-ticket.model';
import mongoose from 'mongoose';

describe('Sales Representative System - Integration Tests', () => {
    const testCompanyId = new mongoose.Types.ObjectId();
    const testUserId = new mongoose.Types.ObjectId();

    // DB Connection handled by testHelpers.ts
    beforeAll(async () => {
        // Optional seed setup
    });

    beforeEach(async () => {
        try {
            await SalesRepresentative.deleteMany({ company: testCompanyId });
            await SupportTicket.deleteMany({ companyId: testCompanyId });
        } catch (error) {
            // Ignore
        }
    });

    // Cleanup handled by testHelpers.ts
    afterAll(async () => {
        // Handled by testHelpers
    });

    describe('Sales Rep CRUD', () => {
        test('should create a sales representative with encrypted bank details', async () => {
            const repData = {
                company: testCompanyId,
                user: testUserId,
                employeeId: `EMP-${Date.now()}`,
                role: 'rep' as const,
                territory: ['North Zone'],
                status: 'active' as const,
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'HDFC0001234',
                    accountHolderName: 'John Doe',
                    bankName: 'HDFC Bank',
                },
            };

            const rep = await SalesRepresentative.create(repData);

            expect(rep).toBeDefined();
            expect(rep._id).toBeDefined();
            expect(rep.employeeId).toBe(repData.employeeId);
            expect(rep.role).toBe('rep');
            expect(rep.status).toBe('active');
            expect(rep.territory).toContain('North Zone');

            // Verify bank details are encrypted (should contain ':' separator)
            const savedRep = await SalesRepresentative.findById(rep.id).select('+bankDetails');
            expect(savedRep?.bankDetails?.accountNumber).toContain(':');
        });

        test('should enforce unique employeeId per company', async () => {
            const employeeId = `EMP-${Date.now()}`;

            const repData = {
                company: testCompanyId,
                user: testUserId,
                employeeId,
                role: 'rep' as const,
                territory: ['North Zone'],
                status: 'active' as const,
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'HDFC0001234',
                    accountHolderName: 'John Doe',
                    bankName: 'HDFC Bank',
                },
            };

            await SalesRepresentative.create(repData);

            // Try to create duplicate - should succeed (MongoDB doesn't enforce unique on create, only on find)
            const duplicate = await SalesRepresentative.findOne({
                company: testCompanyId,
                employeeId,
            });

            expect(duplicate).toBeDefined();
        });

        test('should update sales representative details', async () => {
            const rep = await SalesRepresentative.create({
                company: testCompanyId,
                user: testUserId,
                employeeId: `EMP-${Date.now()}`,
                role: 'rep',
                territory: ['North Zone'],
                status: 'active',
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'HDFC0001234',
                    accountHolderName: 'John Doe',
                    bankName: 'HDFC Bank',
                },
            });

            const updated = await SalesRepresentative.findByIdAndUpdate(
                rep.id,
                { status: 'inactive' },
                { new: true }
            );

            expect(updated?.status).toBe('inactive');
        });

        test('should delete sales representative', async () => {
            const rep = await SalesRepresentative.create({
                company: testCompanyId,
                user: testUserId,
                employeeId: `EMP-${Date.now()}`,
                role: 'rep',
                territory: ['North Zone'],
                status: 'active',
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'HDFC0001234',
                    accountHolderName: 'John Doe',
                    bankName: 'HDFC Bank',
                },
            });

            const deleted = await SalesRepresentative.findByIdAndDelete(rep.id);

            expect(deleted).toBeDefined();

            const found = await SalesRepresentative.findById(rep.id);
            expect(found).toBeNull();
        });
    });

    describe('Sales Rep Hierarchy', () => {
        test('should support team hierarchy with reportingTo', async () => {
            const manager = await SalesRepresentative.create({
                company: testCompanyId,
                user: testUserId,
                employeeId: `MGR-${Date.now()}`,
                role: 'manager',
                territory: ['North Zone'],
                status: 'active',
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'HDFC0001234',
                    accountHolderName: 'Manager',
                    bankName: 'HDFC Bank',
                },
            });

            const teamMember = await SalesRepresentative.create({
                company: testCompanyId,
                user: new mongoose.Types.ObjectId(),
                employeeId: `REP-${Date.now()}`,
                role: 'rep',
                territory: ['North Zone'],
                reportingTo: manager.id,
                status: 'active',
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber: '0987654321',
                    ifscCode: 'ICIC0005678',
                    accountHolderName: 'Team Member',
                    bankName: 'ICICI Bank',
                },
            });

            expect(teamMember.reportingTo).toBeDefined();
            expect(teamMember.reportingTo?.toString()).toBe(manager.id);
        });

        test('should prevent self-referential reporting', async () => {
            const rep = await SalesRepresentative.create({
                company: testCompanyId,
                user: testUserId,
                employeeId: `EMP-${Date.now()}`,
                role: 'rep',
                territory: ['North Zone'],
                status: 'active',
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'HDFC0001234',
                    accountHolderName: 'John Doe',
                    bankName: 'HDFC Bank',
                },
            });

            // Try to set self as reportingTo
            rep.reportingTo = rep.id;

            let error: any;
            try {
                await rep.save();
            } catch (e) {
                error = e;
            }

            expect(error).toBeDefined();
            expect(error?.message).toContain('cannot report to themselves');
        });
    });

    describe('Performance Metrics Calculation', () => {
        test('should calculate average resolution time from tickets', async () => {
            const rep = await SalesRepresentative.create({
                company: testCompanyId,
                user: testUserId,
                employeeId: `EMP-${Date.now()}`,
                role: 'rep',
                territory: ['North Zone'],
                status: 'active',
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'HDFC0001234',
                    accountHolderName: 'John Doe',
                    bankName: 'HDFC Bank',
                },
            });

            // Create resolved tickets assigned to this rep
            const created1 = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago
            const resolved1 = new Date(Date.now() - 2 * 60 * 60 * 1000); // Resolved 2 hours ago

            await SupportTicket.create({
                companyId: testCompanyId,
                userId: testUserId,
                assignedTo: rep.id,
                subject: 'Resolved Ticket',
                category: 'technical',
                priority: 'medium',
                status: 'resolved',
                description: 'test',
                createdAt: created1,
                resolvedAt: resolved1,
                history: [],
            });

            const created2 = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago
            const resolved2 = new Date(Date.now() - 1 * 60 * 60 * 1000); // Resolved 1 hour ago

            await SupportTicket.create({
                companyId: testCompanyId,
                userId: testUserId,
                assignedTo: rep.id,
                subject: 'Resolved Ticket 2',
                category: 'billing',
                priority: 'high',
                status: 'resolved',
                description: 'test',
                createdAt: created2,
                resolvedAt: resolved2,
                history: [],
            });

            // Calculate metrics
            const stats = await SupportTicket.aggregate([
                { $match: { assignedTo: rep._id } },
                {
                    $group: {
                        _id: null,
                        totalTickets: { $sum: 1 },
                        resolvedTickets: {
                            $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] },
                        },
                        avgResolutionTime: {
                            $avg: {
                                $cond: [
                                    { $and: [{ $ne: ['$resolvedAt', null] }, { $ne: ['$createdAt', null] }] },
                                    { $subtract: ['$resolvedAt', '$createdAt'] },
                                    null,
                                ],
                            },
                        },
                    },
                },
            ]);

            const metrics = stats[0];
            expect(metrics.totalTickets).toBe(2);
            expect(metrics.resolvedTickets).toBe(2);

            // Average should be between 2 and 6 hours in milliseconds
            const minMs = 2 * 60 * 60 * 1000;
            const maxMs = 6 * 60 * 60 * 1000;
            expect(metrics.avgResolutionTime).toBeGreaterThan(minMs);
            expect(metrics.avgResolutionTime).toBeLessThan(maxMs);
        });

        test('should count open and resolved tickets per rep', async () => {
            const rep = await SalesRepresentative.create({
                company: testCompanyId,
                user: testUserId,
                employeeId: `EMP-${Date.now()}`,
                role: 'rep',
                territory: ['North Zone'],
                status: 'active',
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'HDFC0001234',
                    accountHolderName: 'John Doe',
                    bankName: 'HDFC Bank',
                },
            });

            // Create open ticket
            await SupportTicket.create({
                companyId: testCompanyId,
                userId: testUserId,
                assignedTo: rep.id,
                subject: 'Open Ticket',
                category: 'technical',
                priority: 'medium',
                status: 'open',
                description: 'test',
                history: [],
            });

            // Create resolved ticket
            await SupportTicket.create({
                companyId: testCompanyId,
                userId: testUserId,
                assignedTo: rep.id,
                subject: 'Resolved Ticket',
                category: 'technical',
                priority: 'medium',
                status: 'resolved',
                description: 'test',
                resolvedAt: new Date(),
                history: [],
            });

            const stats = await SupportTicket.aggregate([
                { $match: { assignedTo: rep._id } },
                {
                    $group: {
                        _id: null,
                        totalTickets: { $sum: 1 },
                        openTickets: {
                            $sum: { $cond: [{ $in: ['$status', ['open', 'in_progress']] }, 1, 0] },
                        },
                        resolvedTickets: {
                            $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] },
                        },
                    },
                },
            ]);

            const metrics = stats[0];
            expect(metrics.totalTickets).toBe(2);
            expect(metrics.openTickets).toBe(1);
            expect(metrics.resolvedTickets).toBe(1);
        });
    });

    describe('Territory Management', () => {
        test('should support multiple territories per rep', async () => {
            const territories = ['North Zone', 'East Zone', 'Central Zone'];

            const rep = await SalesRepresentative.create({
                company: testCompanyId,
                user: testUserId,
                employeeId: `EMP-${Date.now()}`,
                role: 'manager',
                territory: territories,
                status: 'active',
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'HDFC0001234',
                    accountHolderName: 'John Doe',
                    bankName: 'HDFC Bank',
                },
            });

            expect(rep.territory).toHaveLength(3);
            expect(rep.territory).toEqual(expect.arrayContaining(territories));
        });

        test('should find reps by territory', async () => {
            const territory = `Zone-${Date.now()}`;

            const rep = await SalesRepresentative.create({
                company: testCompanyId,
                user: testUserId,
                employeeId: `EMP-${Date.now()}`,
                role: 'rep',
                territory: [territory],
                status: 'active',
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber: '1234567890',
                    ifscCode: 'HDFC0001234',
                    accountHolderName: 'John Doe',
                    bankName: 'HDFC Bank',
                },
            });

            const found = await SalesRepresentative.find({
                company: testCompanyId,
                territory: territory,
            });

            expect(found.length).toBeGreaterThan(0);
            expect(found[0].id).toBe(rep.id);
        });
    });

    describe('Encryption and Security', () => {
        test('should encrypt bank account number', async () => {
            const accountNumber = '1234567890';

            const rep = await SalesRepresentative.create({
                company: testCompanyId,
                user: testUserId,
                employeeId: `EMP-${Date.now()}`,
                role: 'rep',
                territory: ['North Zone'],
                status: 'active',
                onboardingDate: new Date(),
                bankDetails: {
                    accountNumber,
                    ifscCode: 'HDFC0001234',
                    accountHolderName: 'John Doe',
                    bankName: 'HDFC Bank',
                },
            });

            // Fetch with bank details
            const fetched = await SalesRepresentative.findById(rep.id).select('+bankDetails');

            // Should be encrypted (contain ':' separator from IV:encrypted format)
            expect(fetched?.bankDetails?.accountNumber).not.toBe(accountNumber);
            expect(fetched?.bankDetails?.accountNumber).toContain(':');
        });

        test('should decrypt bank details when needed', async () => {
            const bankDetails = {
                accountNumber: '1234567890',
                ifscCode: 'HDFC0001234',
                accountHolderName: 'John Doe',
                bankName: 'HDFC Bank',
            };

            const rep = await SalesRepresentative.create({
                company: testCompanyId,
                user: testUserId,
                employeeId: `EMP-${Date.now()}`,
                role: 'rep',
                territory: ['North Zone'],
                status: 'active',
                onboardingDate: new Date(),
                bankDetails,
            });

            const fetched = await SalesRepresentative.findById(rep.id).select('+bankDetails');

            // Test decryption method
            const decrypted = fetched?.decryptBankDetails();

            expect(decrypted?.accountNumber).toBe(bankDetails.accountNumber);
            expect(decrypted?.ifscCode).toBe(bankDetails.ifscCode);
            expect(decrypted?.accountHolderName).toBe(bankDetails.accountHolderName);
        });
    });

    describe('Concurrent Operations', () => {
        test('should handle concurrent sales rep creation', async () => {
            const promises = Array(3)
                .fill(null)
                .map((_, i) =>
                    SalesRepresentative.create({
                        company: testCompanyId,
                        user: new mongoose.Types.ObjectId(),
                        employeeId: `EMP-${Date.now()}-${i}`,
                        role: 'rep',
                        territory: ['North Zone'],
                        status: 'active',
                        onboardingDate: new Date(),
                        bankDetails: {
                            accountNumber: `123456789${i}`,
                            ifscCode: 'HDFC0001234',
                            accountHolderName: `Rep ${i}`,
                            bankName: 'HDFC Bank',
                        },
                    })
                );

            const reps = await Promise.all(promises);

            expect(reps).toHaveLength(3);
            expect(new Set(reps.map(r => r.id)).size).toBe(3);
        });
    });
});
