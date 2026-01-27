import mongoose from 'mongoose';
import SupportTicket from '@/infrastructure/database/mongoose/models/crm/support/support-ticket.model';
import '@/infrastructure/database/mongoose/models/iam/users/user.model'; // Register User model
import '@/infrastructure/database/mongoose/models/crm/sales/sales-rep.model'; // Register SalesRep model
import SupportTicketService from '@/core/application/services/crm/support/SupportTicketService';
import { isSLABreached, getRemainingTime } from '@/core/application/services/crm/support/sla.utils';

describe('Support Ticket System - Integration Tests', () => {
  const testCompanyId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();
  const service = SupportTicketService.getInstance();
  let ticketId: string;

  // DB Connection handled by testHelpers.ts
  beforeAll(async () => {
    // Optional seed setup
  });

  beforeEach(async () => {
    try {
      await SupportTicket.deleteMany({ companyId: testCompanyId });
    } catch (error) {
      // Ignore
    }
  });

  // Cleanup handled by testHelpers.ts
  afterAll(async () => {
    // Handled by testHelpers
  });

  describe('Create Support Ticket', () => {
    test('should create a support ticket with valid data', async () => {
      const ticketData = {
        companyId: testCompanyId.toString(),
        userId: testUserId.toString(),
        subject: 'Test Issue with Shipment',
        category: 'logistics' as const,
        priority: 'high' as const,
        description: 'Shipment was not delivered on time',
        relatedOrderId: 'ORD-123456',
      };

      const ticket = await service.createTicket(ticketData);

      expect(ticket).toBeDefined();
      expect(ticket.ticketId).toBeDefined();
      expect(ticket.ticketId).toMatch(/^TKT-\d+$/);
      expect(ticket.subject).toBe(ticketData.subject);
      expect(ticket.priority).toBe('high');
      expect(ticket.status).toBe('open');
      expect(ticket.slaBreached).toBe(false);

      ticketId = ticket.id;
    });

    test('should generate unique ticket IDs sequentially', async () => {
      const ticket1 = await service.createTicket({
        companyId: testCompanyId.toString(),
        userId: testUserId.toString(),
        subject: 'Issue 1',
        category: 'technical',
        priority: 'medium',
        description: 'Description 1',
      });

      const ticket2 = await service.createTicket({
        companyId: testCompanyId.toString(),
        userId: testUserId.toString(),
        subject: 'Issue 2',
        category: 'technical',
        priority: 'medium',
        description: 'Description 2',
      });

      expect(ticket1.ticketId).toBeDefined();
      expect(ticket2.ticketId).toBeDefined();
      expect(ticket1.ticketId).not.toBe(ticket2.ticketId);

      const id1 = parseInt(ticket1.ticketId.replace('TKT-', ''));
      const id2 = parseInt(ticket2.ticketId.replace('TKT-', ''));
      expect(id2).toBeGreaterThan(id1);
    });
  });

  describe('Retrieve Support Tickets', () => {
    beforeEach(async () => {
      await service.createTicket({
        companyId: testCompanyId.toString(),
        userId: testUserId.toString(),
        subject: 'Critical Issue',
        category: 'technical',
        priority: 'critical',
        description: 'Critical system error',
      });

      await service.createTicket({
        companyId: testCompanyId.toString(),
        userId: testUserId.toString(),
        subject: 'Medium Priority',
        category: 'billing',
        priority: 'medium',
        description: 'Billing inquiry',
      });
    });

    test('should retrieve all tickets for a company', async () => {
      const result = await service.getTickets({
        companyId: testCompanyId.toString(),
      });

      expect(result.tickets.length).toBeGreaterThanOrEqual(2);
      expect(result.tickets.every(t => t.companyId.toString() === testCompanyId.toString())).toBe(true);
    });

    test('should filter tickets by priority', async () => {
      const result = await service.getTickets({
        companyId: testCompanyId.toString(),
        priority: 'critical',
      });

      expect(result.tickets.length).toBeGreaterThan(0);
      expect(result.tickets.every(t => t.priority === 'critical')).toBe(true);
    });

    test('should filter tickets by category', async () => {
      const result = await service.getTickets({
        companyId: testCompanyId.toString(),
        category: 'technical',
      });

      expect(result.tickets.some(t => t.category === 'technical')).toBe(true);
    });

    test('should support pagination', async () => {
      const page1 = await service.getTickets({
        companyId: testCompanyId.toString(),
        limit: 1,
        page: 1,
      });

      const page2 = await service.getTickets({
        companyId: testCompanyId.toString(),
        limit: 1,
        page: 2,
      });

      expect(page1.tickets.length).toBe(1);
      if (page2.tickets.length > 0) {
        expect(page1.tickets[0]._id.toString()).not.toBe(page2.tickets[0]._id.toString());
      }
    });
  });

  describe('Update Support Ticket', () => {
    beforeEach(async () => {
      const ticket = await service.createTicket({
        companyId: testCompanyId.toString(),
        userId: testUserId.toString(),
        subject: 'Test Ticket',
        category: 'technical',
        priority: 'medium',
        description: 'Test description',
      });
      ticketId = ticket.id;
    });

    test('should update ticket status', async () => {
      const updated = await service.updateTicket(
        ticketId,
        testCompanyId.toString(),
        { status: 'in_progress' },
        testUserId.toString()
      );

      expect(updated?.status).toBe('in_progress');
    });

    test('should update ticket priority', async () => {
      const updated = await service.updateTicket(
        ticketId,
        testCompanyId.toString(),
        { priority: 'high' },
        testUserId.toString()
      );

      expect(updated?.priority).toBe('high');
    });

    test('should set resolvedAt when status changes to resolved', async () => {
      const updated = await service.updateTicket(
        ticketId,
        testCompanyId.toString(),
        { status: 'resolved' },
        testUserId.toString()
      );

      expect(updated?.status).toBe('resolved');
      expect(updated?.resolvedAt).toBeDefined();
    });
  });

  describe('Add Notes to Ticket', () => {
    beforeEach(async () => {
      const ticket = await service.createTicket({
        companyId: testCompanyId.toString(),
        userId: testUserId.toString(),
        subject: 'Test Ticket',
        category: 'technical',
        priority: 'medium',
        description: 'Test description',
      });
      ticketId = ticket.id;
    });

    test('should add internal note to ticket', async () => {
      const updated = await service.addNote(
        ticketId,
        testCompanyId.toString(),
        'Customer needs to provide more details',
        testUserId.toString(),
        'internal_note'
      );

      expect(updated?.history.some(h => h.action === 'internal_note')).toBe(true);
    });

    test('should add reply to ticket', async () => {
      const updated = await service.addNote(
        ticketId,
        testCompanyId.toString(),
        'We have reviewed your issue',
        testUserId.toString(),
        'reply'
      );

      expect(updated?.history.some(h => h.action === 'reply')).toBe(true);
      expect(updated?.lastReplyAt).toBeDefined();
    });
  });

  describe('SLA Calculation', () => {
    test('should calculate SLA breach correctly', () => {
      // Ticket created 5 hours ago (critical = 4 hour SLA)
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const breached = isSLABreached('critical', fiveHoursAgo, 'open');

      expect(breached).toBe(true);
    });

    test('should not breach SLA for recently created critical ticket', () => {
      // Ticket created 2 hours ago (critical = 4 hour SLA)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const breached = isSLABreached('critical', twoHoursAgo, 'open');

      expect(breached).toBe(false);
    });

    test('should not breach SLA for resolved tickets', () => {
      // Even if created 100 days ago
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      const breached = isSLABreached('critical', oldDate, 'resolved');

      expect(breached).toBe(false);
    });

    test('should calculate remaining time correctly', () => {
      // Medium priority = 24 hours SLA
      // Created 12 hours ago
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const remaining = getRemainingTime('medium', twelveHoursAgo, 'open');

      expect(remaining).toBeDefined();
      expect(remaining! > 0).toBe(true);
      expect(remaining! < 24 * 60 * 60 * 1000).toBe(true);
    });
  });

  describe('SLA Metrics', () => {
    test('should calculate SLA metrics correctly', async () => {
      // Create various tickets
      await service.createTicket({
        companyId: testCompanyId.toString(),
        userId: testUserId.toString(),
        subject: 'Critical Issue',
        category: 'technical',
        priority: 'critical',
        description: 'Critical',
      });

      await service.createTicket({
        companyId: testCompanyId.toString(),
        userId: testUserId.toString(),
        subject: 'Medium Issue',
        category: 'billing',
        priority: 'medium',
        description: 'Medium',
      });

      const metrics = await service.getSLAMetrics(testCompanyId.toString());

      expect(metrics.total).toBeGreaterThanOrEqual(2);
      expect(metrics.open).toBeGreaterThanOrEqual(2);
      expect(metrics.byPriority.critical.total).toBeGreaterThanOrEqual(1);
      expect(metrics.byPriority.medium.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Company Scoping', () => {
    test('should not retrieve tickets from other companies', async () => {
      const otherCompanyId = new mongoose.Types.ObjectId();

      // Create ticket for our company
      await service.createTicket({
        companyId: testCompanyId.toString(),
        userId: testUserId.toString(),
        subject: 'Our Ticket',
        category: 'technical',
        priority: 'medium',
        description: 'Our ticket',
      });

      // Try to retrieve from different company
      const result = await service.getTickets({
        companyId: otherCompanyId.toString(),
      });

      expect(result.tickets.every(t => t.companyId.toString() === otherCompanyId.toString())).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent ticket creation', async () => {
      const promises = Array(3).fill(null).map((_, i) =>
        service.createTicket({
          companyId: testCompanyId.toString(),
          userId: testUserId.toString(),
          subject: `Concurrent ${i}`,
          category: 'technical',
          priority: 'medium',
          description: `Ticket ${i}`,
        })
      );

      const tickets = await Promise.all(promises);

      expect(tickets.length).toBe(3);
      const ticketIds = tickets.map(t => t.ticketId);
      const uniqueIds = new Set(ticketIds);
      expect(uniqueIds.size).toBe(3);
    });
  });
});
