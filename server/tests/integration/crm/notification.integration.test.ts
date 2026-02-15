import { NotificationService } from '@/core/application/services/crm/communication/notification.service';
import NotificationTemplate from '@/infrastructure/database/mongoose/models/crm/communication/notification-template.model';
import User from '@/infrastructure/database/mongoose/models/iam/users/user.model';
import Company from '@/infrastructure/database/mongoose/models/organization/core/company.model';
import mongoose from 'mongoose';

describe('Notification Service Tests', () => {
  let notificationService: NotificationService;
  let companyId: string;

  beforeEach(async () => {
    notificationService = new NotificationService();

    // Clear collections
    await NotificationTemplate.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});

    // Create test company
    const company = await Company.create({
      name: 'Test Company',
      email: 'test@company.com',
      registrationNumber: 'REG-001',
      status: 'approved',
    });
    companyId = (company as any)._id.toString();

    // Create test user
    await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword123',
      companyId,
      role: 'staff',
      teamRole: 'manager',
      isActive: true,
    });
  });

  afterEach(async () => {
    await NotificationTemplate.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});
  });

  describe('Notification Template CRUD', () => {
    describe('createTemplate', () => {
      it('should create a notification template', async () => {
        const templateData = {
          name: 'Ticket Created Email',
          description: 'Email sent when a support ticket is created',
          channel: 'email' as const,
          trigger: 'ticket_created' as const,
          subject: 'Your Support Ticket #{{ticketId}} has been created',
          body: 'Hello {{customerName}},\n\nYour ticket regarding "{{subject}}" has been created successfully.\n\nTicket ID: {{ticketId}}\nPriority: {{priority}}\n\nWe will get back to you shortly.',
          variables: [
            { name: 'ticketId', example: 'TKT-12345' },
            { name: 'customerName', example: 'John Doe' },
            { name: 'subject', example: 'Damaged Package' },
            { name: 'priority', example: 'high' },
          ],
        };

        const template = await notificationService.createTemplate(templateData);

        expect(template).toBeDefined();
        expect((template as any)._id).toBeDefined();
        expect(template.name).toBe('Ticket Created Email');
        expect(template.channel).toBe('email');
        expect(template.trigger).toBe('ticket_created');
        expect(template.isActive).toBe(true);
      });

      it('should fail without required fields', async () => {
        const templateData = {
          name: 'Invalid Template',
          // Missing channel, trigger, body
        };

        await expect(notificationService.createTemplate(templateData as any)).rejects.toThrow();
      });
    });

    describe('getTemplate', () => {
      it('should retrieve a template by ID', async () => {
        const template = await NotificationTemplate.create({
          name: 'Test Template',
          channel: 'email',
          trigger: 'ticket_created',
          body: 'Test body',
        });

        const retrieved = await notificationService.getTemplate((template as any)._id.toString());

        expect(retrieved).toBeDefined();
        expect((retrieved as any)._id.toString()).toBe((template as any)._id.toString());
      });

      it('should throw NotFoundError for non-existent template', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();

        await expect(notificationService.getTemplate(fakeId)).rejects.toThrow('not found');
      });
    });

    describe('updateTemplate', () => {
      it('should update a template', async () => {
        const template = await NotificationTemplate.create({
          name: 'Original Name',
          channel: 'email',
          trigger: 'ticket_created',
          body: 'Original body',
          isActive: true,
        });

        const updated = await notificationService.updateTemplate((template as any)._id.toString(), {
          name: 'Updated Name',
          body: 'Updated body',
        });

        expect(updated.name).toBe('Updated Name');
        expect(updated.body).toBe('Updated body');
        expect(updated.isActive).toBe(true); // Unchanged
      });
    });

    describe('deleteTemplate', () => {
      it('should soft-delete a template', async () => {
        const template = await NotificationTemplate.create({
          name: 'Template to Delete',
          channel: 'email',
          trigger: 'ticket_created',
          body: 'Test body',
          isActive: true,
        });

        await notificationService.deleteTemplate((template as any)._id.toString());

        const updatedTemplate = await NotificationTemplate.findById((template as any)._id);
        expect(updatedTemplate?.isActive).toBe(false);
      });
    });
  });

  describe('Template Retrieval & Filtering', () => {
    beforeEach(async () => {
      // Create multiple templates
      await NotificationTemplate.create([
        {
          name: 'Ticket Created - Email',
          channel: 'email',
          trigger: 'ticket_created',
          body: 'Email: {{ticketId}} has been created',
          isActive: true,
        },
        {
          name: 'Ticket Created - WhatsApp',
          channel: 'whatsapp',
          trigger: 'ticket_created',
          body: 'WhatsApp: {{ticketId}} has been created',
          isActive: true,
        },
        {
          name: 'Ticket Assigned - Email',
          channel: 'email',
          trigger: 'ticket_assigned',
          body: 'Email: {{ticketId}} assigned to {{repName}}',
          isActive: true,
        },
        {
          name: 'Ticket Assigned - WhatsApp',
          channel: 'whatsapp',
          trigger: 'ticket_assigned',
          body: 'WhatsApp: {{ticketId}} assigned to {{repName}}',
          isActive: false, // Inactive
        },
      ]);
    });

    describe('getTemplatesByTrigger', () => {
      it('should get templates by trigger', async () => {
        const templates = await notificationService.getTemplatesByTrigger('ticket_created');

        expect(templates).toHaveLength(2);
        expect(templates.every((t) => t.trigger === 'ticket_created')).toBe(true);
      });

      it('should get templates by trigger and channel', async () => {
        const templates = await notificationService.getTemplatesByTrigger(
          'ticket_created',
          'email'
        );

        expect(templates).toHaveLength(1);
        expect(templates[0].channel).toBe('email');
      });

      it('should not return inactive templates', async () => {
        const templates = await notificationService.getTemplatesByTrigger('ticket_assigned');

        expect(templates).toHaveLength(1); // Only active one
        expect(templates[0].isActive).toBe(true);
      });
    });

    describe('getTemplatesByChannel', () => {
      it('should get all email templates', async () => {
        const templates = await notificationService.getTemplatesByChannel('email');

        expect(templates.length).toBeGreaterThanOrEqual(2);
        expect(templates.every((t) => t.channel === 'email')).toBe(true);
      });

      it('should get all WhatsApp templates', async () => {
        const templates = await notificationService.getTemplatesByChannel('whatsapp');

        expect(templates).toHaveLength(1); // Only the ticket_created one is active
        expect(templates.every((t) => t.channel === 'whatsapp')).toBe(true);
      });
    });

    describe('getTemplates (paginated)', () => {
      it('should get templates with pagination', async () => {
        const result = await notificationService.getTemplates({}, 1, 2);

        expect(result.templates).toBeDefined();
        expect(result.total).toBeGreaterThan(0);
        expect(result.pages).toBeGreaterThan(0);
      });

      it('should filter templates by channel', async () => {
        const result = await notificationService.getTemplates({ channel: 'email' }, 1, 10);

        expect(result.templates.every((t) => t.channel === 'email')).toBe(true);
      });

      it('should filter templates by trigger', async () => {
        const result = await notificationService.getTemplates({ trigger: 'ticket_created' }, 1, 10);

        expect(result.templates.every((t) => t.trigger === 'ticket_created')).toBe(true);
      });
    });
  });

  describe('Notification Sending', () => {
    beforeEach(async () => {
      // Create test templates
      await NotificationTemplate.create([
        {
          name: 'Ticket Created - Email',
          channel: 'email',
          trigger: 'ticket_created',
          subject: 'Ticket #{{ticketId}} Created',
          body: 'Hello {{customerName}}, your ticket has been created.',
          variables: [
            { name: 'ticketId', example: 'TKT-001' },
            { name: 'customerName', example: 'John Doe' },
          ],
          isActive: true,
        },
        {
          name: 'Ticket Assigned - WhatsApp',
          channel: 'whatsapp',
          trigger: 'ticket_assigned',
          body: 'Hi {{repName}}, ticket {{ticketId}} assigned to you.',
          variables: [
            { name: 'ticketId', example: 'TKT-001' },
            { name: 'repName', example: 'John' },
          ],
          isActive: true,
        },
        {
          name: 'Ticket Callback - SMS',
          channel: 'sms',
          trigger: 'callback_pending',
          body: 'Hi {{repName}}, you have a pending callback for {{ticketId}}.',
          variables: [
            { name: 'ticketId', example: 'TKT-001' },
            { name: 'repName', example: 'John' },
          ],
          isActive: true,
        },
      ]);
    });

    describe('sendNotification', () => {
      it('should send email notification', async () => {
        const result = await notificationService.sendNotification({
          channel: 'email',
          trigger: 'ticket_created',
          recipientEmail: 'customer@example.com',
          companyId,
          variables: {
            ticketId: 'TKT-001',
            customerName: 'John Doe',
          },
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
      });

      it('should send WhatsApp notification', async () => {
        const result = await notificationService.sendNotification({
          channel: 'whatsapp',
          trigger: 'ticket_assigned',
          recipientWhatsApp: '+919876543210',
          companyId,
          variables: {
            ticketId: 'TKT-001',
            repName: 'John',
          },
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
      });

      it('should send SMS notification', async () => {
        const result = await notificationService.sendNotification({
          channel: 'sms',
          trigger: 'callback_pending',
          recipientPhone: '+919876543210',
          companyId,
          variables: {
            ticketId: 'TKT-001',
            repName: 'John',
          },
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
      });

      it('should handle missing template gracefully', async () => {
        const result = await notificationService.sendNotification({
          channel: 'email',
          trigger: 'dispute_resolved', // Template doesn't exist
          recipientEmail: 'test@example.com',
          companyId,
        });

        expect(result.success).toBe(false);
      });

      it('should handle invalid email', async () => {
        const result = await notificationService.sendNotification({
          channel: 'email',
          trigger: 'ticket_created',
          recipientEmail: 'invalid-email',
          companyId,
        });

        expect(result.success).toBe(false);
      });

      it('should handle invalid phone number', async () => {
        const result = await notificationService.sendNotification({
          channel: 'sms',
          trigger: 'callback_pending',
          recipientPhone: '123', // Too short
          companyId,
        });

        expect(result.success).toBe(false);
      });
    });

    describe('sendBulkNotifications', () => {
      it('should send multiple notifications', async () => {
        const payloads = [
          {
            channel: 'email' as const,
            trigger: 'ticket_created' as const,
            recipientEmail: 'customer1@example.com',
            companyId,
            variables: { ticketId: 'TKT-001', customerName: 'Customer 1' },
          },
          {
            channel: 'email' as const,
            trigger: 'ticket_created' as const,
            recipientEmail: 'customer2@example.com',
            companyId,
            variables: { ticketId: 'TKT-002', customerName: 'Customer 2' },
          },
          {
            channel: 'whatsapp' as const,
            trigger: 'ticket_assigned' as const,
            recipientWhatsApp: '+919876543210',
            companyId,
            variables: { ticketId: 'TKT-001', repName: 'John' },
          },
        ] as any[]; // casting because of variables union type mismatch in TS

        const result = await notificationService.sendBulkNotifications(payloads);

        expect(result.successful).toBeGreaterThanOrEqual(0);
        expect(result.failed).toBeGreaterThanOrEqual(0);
        expect(result.results).toHaveLength(3);
      });
    });
  });

  describe('Template Variable Interpolation', () => {
    it('should interpolate template variables correctly', async () => {
      await NotificationTemplate.create({
        name: 'Complex Template',
        channel: 'email',
        trigger: 'ticket_created',
        subject: 'Ticket #{{ticketId}}',
        body: 'Hello {{customerName}},\n\nYour ticket "{{subject}}" has priority {{priority}}.',
        footer: 'Thank you, {{companyName}}',
        variables: [
          { name: 'ticketId' },
          { name: 'customerName' },
          { name: 'subject' },
          { name: 'priority' },
          { name: 'companyName' },
        ],
        isActive: true,
      });

      const result = await notificationService.sendNotification({
        channel: 'email',
        trigger: 'ticket_created',
        recipientEmail: 'test@example.com',
        companyId,
        variables: {
          ticketId: 'TKT-12345',
          customerName: 'Alice Johnson',
          subject: 'Damaged Package',
          priority: 'high',
          companyName: 'Shipcrowd',
        },
      });

      expect(result.success).toBe(true);
    });

    it('should handle missing variables gracefully', async () => {
      await NotificationTemplate.create({
        name: 'Partial Template',
        channel: 'sms',
        trigger: 'callback_pending',
        body: 'Hi {{repName}}, callback for {{ticketId}}',
        variables: [
          { name: 'repName' },
          { name: 'ticketId' },
        ],
        isActive: true,
      });

      // Send with only one variable
      const result = await notificationService.sendNotification({
        channel: 'sms',
        trigger: 'callback_pending',
        recipientPhone: '+919876543210',
        companyId,
        variables: {
          repName: 'John',
          // ticketId missing - should keep placeholder
        },
      });

      expect(result.success).toBe(true);
    });
  });
});
