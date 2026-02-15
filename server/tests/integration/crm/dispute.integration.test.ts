import app from '@/app';
import Dispute from '@/infrastructure/database/mongoose/models/crm/disputes/dispute.model';
import SupportTicket from '@/infrastructure/database/mongoose/models/crm/support/support-ticket.model';
import Role from '@/infrastructure/database/mongoose/models/iam/role.model';
import User from '@/infrastructure/database/mongoose/models/iam/users/user.model';
import Company from '@/infrastructure/database/mongoose/models/organization/core/company.model';
import mongoose from 'mongoose';
import request from 'supertest';
import { generateAuthToken } from '../../setup/testHelpers';

describe('Dispute Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let companyId: string;

  beforeEach(async () => {
    // Clear collections
    await Dispute.deleteMany({});
    await SupportTicket.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});
    await Role.deleteMany({});

    // Create test company
    const company = await Company.create({
      name: 'Test Company',
      email: 'test@company.com',
      registrationNumber: 'REG-001',
      status: 'approved',
    });
    await Dispute.deleteMany({});
    await SupportTicket.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});
    await Role.deleteMany({});

    // Create Permissions
    const permissions = [
      'crm_disputes:create',
      'crm_disputes:read',
      'crm_disputes:read_metrics',
      'crm_disputes:read_analytics',
      'crm_disputes:investigate',
      'crm_disputes:resolve',
      'crm_disputes:update'
    ];

    // Seed Roles
    const adminRole = await Role.create({
      name: 'admin',
      scope: 'global',
      permissions: permissions,
      effectivePermissions: permissions,
      isSystem: true
    });

    await Role.create({
      name: 'owner',
      scope: 'company',
      permissions: permissions,
      effectivePermissions: permissions,
      isSystem: true
    });
    companyId = (company as any)._id.toString();

    // Create test user
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword123', // Assume password is hashed elsewhere
      companyId,
      role: 'admin',
      platformRole: adminRole._id,
      teamRole: 'owner',
      isActive: true,
    });
    userId = (user as any)._id.toString();
    console.log('Test User Created:', JSON.stringify(user.toJSON(), null, 2));

    // Verify Platform Role
    const userRole = await Role.findById((user as any).platformRole);
    console.log('User Platform Role:', userRole ? userRole.name : 'MISSING');

    // Generate auth token
    authToken = generateAuthToken(userId, 'admin');

    // Create test ticket
    await SupportTicket.create({
      ticketId: 'TKT-001',
      companyId,
      userId,
      subject: 'Test Issue',
      category: 'technical',
      priority: 'high',
      status: 'open',
      description: 'Test ticket for dispute creation',
      slaBreached: false,
    });
  });

  afterEach(async () => {
    await Dispute.deleteMany({});
    await SupportTicket.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});
  });

  describe('POST /api/v1/crm/disputes - Create Dispute', () => {
    it('should create a dispute successfully', async () => {
      const payload = {
        type: 'damaged-goods',
        description: 'Package arrived damaged with visible cracks on the box.',
        relatedOrderId: 'ORD-123',
        priority: 'high',
      };

      const response = await request(app)
        .post('/api/v1/crm/disputes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.type).toBe('damaged-goods');
      expect(response.body.data.status).toBe('open');
      expect(response.body.data.slaDeadline).toBeDefined();
    });

    it('should fail with missing required fields', async () => {
      const payload = {
        type: 'damaged-goods',
        // Missing description
      };

      const response = await request(app)
        .post('/api/v1/crm/disputes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const payload = {
        type: 'damaged-goods',
        description: 'Test dispute',
      };

      const response = await request(app)
        .post('/api/v1/crm/disputes')
        .send(payload);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/crm/disputes - List Disputes', () => {
    it('should list disputes with pagination', async () => {
      // Create multiple disputes
      await Dispute.create([
        {
          company: companyId,
          type: 'damaged-goods',
          status: 'open',
          priority: 'high',
          description: 'Dispute 1',
        },
        {
          company: companyId,
          type: 'lost-shipment',
          status: 'investigation',
          priority: 'critical',
          description: 'Dispute 2',
        },
      ]);

      const response = await request(app)
        .get('/api/v1/crm/disputes?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.disputes).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should filter disputes by status', async () => {
      await Dispute.create([
        {
          company: companyId,
          type: 'damaged-goods',
          status: 'open',
          priority: 'high',
          description: 'Open dispute',
        },
        {
          company: companyId,
          type: 'lost-shipment',
          status: 'resolved',
          priority: 'critical',
          description: 'Resolved dispute',
        },
      ]);

      const response = await request(app)
        .get('/api/v1/crm/disputes?status=open')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.disputes).toHaveLength(1);
      expect(response.body.data.disputes[0].status).toBe('open');
    });

    it('should filter disputes by type', async () => {
      await Dispute.create([
        {
          company: companyId,
          type: 'damaged-goods',
          status: 'open',
          priority: 'high',
          description: 'Damaged goods',
        },
        {
          company: companyId,
          type: 'lost-shipment',
          status: 'open',
          priority: 'critical',
          description: 'Lost shipment',
        },
      ]);

      const response = await request(app)
        .get('/api/v1/crm/disputes?type=damaged-goods')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.disputes).toHaveLength(1);
      expect(response.body.data.disputes[0].type).toBe('damaged-goods');
    });
  });

  describe('GET /api/v1/crm/disputes/:id - Get Dispute by ID', () => {
    it('should retrieve a dispute by ID', async () => {
      const dispute = await Dispute.create({
        company: companyId,
        type: 'damaged-goods',
        status: 'open',
        priority: 'high',
        description: 'Test dispute',
      });

      const response = await request(app)
        .get(`/api/v1/crm/disputes/${dispute._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(dispute._id);
    });

    it('should return 404 for non-existent dispute', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/crm/disputes/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/crm/disputes/:id/investigate - Start Investigation', () => {
    it('should start investigation on a dispute', async () => {
      const dispute = await Dispute.create({
        company: companyId,
        type: 'damaged-goods',
        status: 'open',
        priority: 'high',
        description: 'Test dispute',
      });

      const payload = {
        assignedToId: userId,
        initialNotes: 'Beginning investigation. Awaiting customer photos.',
      };

      const response = await request(app)
        .post(`/api/v1/crm/disputes/${dispute._id}/investigate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('investigation');
      expect(response.body.data.assignedTo).toBe(userId);
      expect(response.body.data.investigationStartedAt).toBeDefined();
    });

    it('should fail to investigate non-open dispute', async () => {
      const dispute = await Dispute.create({
        company: companyId,
        type: 'damaged-goods',
        status: 'investigation',
        priority: 'high',
        description: 'Test dispute',
      });

      const payload = {
        assignedToId: userId,
        initialNotes: 'Test notes',
      };

      const response = await request(app)
        .post(`/api/v1/crm/disputes/${dispute._id}/investigate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(409); // Conflict
    });
  });

  describe('POST /api/v1/crm/disputes/:id/complete-investigation - Complete Investigation', () => {
    it('should complete investigation', async () => {
      const dispute = await Dispute.create({
        company: companyId,
        type: 'damaged-goods',
        status: 'investigation',
        priority: 'high',
        description: 'Test dispute',
        assignedTo: userId,
        investigationStartedAt: new Date(),
      });

      const payload = {
        completionNotes: 'Investigation complete. Damage confirmed by images.',
      };

      const response = await request(app)
        .post(`/api/v1/crm/disputes/${dispute._id}/complete-investigation`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('decision');
      expect(response.body.data.investigationCompletedAt).toBeDefined();
    });
  });

  describe('POST /api/v1/crm/disputes/:id/resolve - Resolve Dispute', () => {
    it('should resolve dispute with refund', async () => {
      const dispute = await Dispute.create({
        company: companyId,
        type: 'damaged-goods',
        status: 'decision',
        priority: 'high',
        description: 'Test dispute',
      });

      const payload = {
        resolution: 'refund',
        refundAmount: 5000,
        notes: 'Full refund approved for damaged goods.',
      };

      const response = await request(app)
        .post(`/api/v1/crm/disputes/${dispute._id}/resolve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolution).toBe('refund');
      expect(response.body.data.refundAmount).toBe(5000);
      expect(response.body.data.resolvedAt).toBeDefined();
    });

    it('should resolve dispute with replacement', async () => {
      const dispute = await Dispute.create({
        company: companyId,
        type: 'damaged-goods',
        status: 'decision',
        priority: 'high',
        description: 'Test dispute',
      });

      const payload = {
        resolution: 'replacement',
        refundAmount: 0,
        notes: 'Replacement item will be sent.',
      };

      const response = await request(app)
        .post(`/api/v1/crm/disputes/${dispute._id}/resolve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.data.resolution).toBe('replacement');
    });

    it('should fail to resolve with invalid resolution type', async () => {
      const dispute = await Dispute.create({
        company: companyId,
        type: 'damaged-goods',
        status: 'decision',
        priority: 'high',
        description: 'Test dispute',
      });

      const payload = {
        resolution: 'invalid-resolution',
        notes: 'Test',
      };

      const response = await request(app)
        .post(`/api/v1/crm/disputes/${dispute._id}/resolve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/crm/disputes/:id/evidence - Add Evidence', () => {
    it('should add evidence to dispute', async () => {
      const dispute = await Dispute.create({
        company: companyId,
        type: 'damaged-goods',
        status: 'investigation',
        priority: 'high',
        description: 'Test dispute',
      });

      const payload = {
        type: 'photo',
        url: 'https://example.com/photo-damaged-package.jpg',
      };

      const response = await request(app)
        .post(`/api/v1/crm/disputes/${dispute._id}/evidence`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.data.evidence).toHaveLength(1);
      expect(response.body.data.evidence[0].type).toBe('photo');
      expect(response.body.data.evidence[0].url).toBe(
        'https://example.com/photo-damaged-package.jpg'
      );
    });
  });

  describe('GET /api/v1/crm/disputes/open - Get Open Disputes', () => {
    it('should retrieve only open disputes', async () => {
      await Dispute.create([
        {
          company: companyId,
          type: 'damaged-goods',
          status: 'open',
          priority: 'high',
          description: 'Open dispute',
        },
        {
          company: companyId,
          type: 'lost-shipment',
          status: 'investigation',
          priority: 'critical',
          description: 'Investigation dispute',
        },
        {
          company: companyId,
          type: 'delayed-delivery',
          status: 'resolved',
          priority: 'low',
          description: 'Resolved dispute',
        },
      ]);

      const response = await request(app)
        .get('/api/v1/crm/disputes/open')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.disputes).toHaveLength(2); // open + investigation
      expect(
        response.body.data.disputes.every(
          (d: any) =>
            d.status === 'open' || d.status === 'investigation' || d.status === 'decision'
        )
      ).toBe(true);
    });
  });

  describe('GET /api/v1/crm/disputes/metrics - Get Dispute Metrics', () => {
    it('should return dispute metrics by type', async () => {
      await Dispute.create([
        {
          company: companyId,
          type: 'damaged-goods',
          status: 'open',
          priority: 'high',
          description: 'Damaged 1',
        },
        {
          company: companyId,
          type: 'damaged-goods',
          status: 'resolved',
          priority: 'high',
          description: 'Damaged 2',
          refundAmount: 5000,
          resolution: 'refund',
        },
        {
          company: companyId,
          type: 'lost-shipment',
          status: 'open',
          priority: 'critical',
          description: 'Lost 1',
        },
      ]);

      const response = await request(app)
        .get('/api/v1/crm/disputes/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.metrics.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/crm/disputes/summary - Get Resolution Summary', () => {
    it('should return resolution summary', async () => {
      await Dispute.create([
        {
          company: companyId,
          type: 'damaged-goods',
          status: 'resolved',
          priority: 'high',
          description: 'Resolved dispute',
          resolution: 'refund',
          refundAmount: 3000,
          resolvedAt: new Date(),
        },
        {
          company: companyId,
          type: 'lost-shipment',
          status: 'resolved',
          priority: 'critical',
          description: 'Resolved dispute',
          resolution: 'replacement',
          refundAmount: 0,
          resolvedAt: new Date(),
        },
      ]);

      const response = await request(app)
        .get('/api/v1/crm/disputes/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.summary).toBeDefined();
    });
  });
});
