CRM Implementation Plan - ShipCrowd
Phase 1: Support Ticket System (Foundation)
Why First: All NDR events and customer issues funnel through support tickets. This is the core CRM feature.

Tech Stack:

Model: SupportTicket (TKT-XXXXXX auto-increment)
Controller: SupportTicketController
Service: SupportTicketService
Routes: /api/v1/support/tickets
Implementation Scope:

Create support ticket from NDR event (auto-creation)
CRUD operations with proper validation
Status workflow (open → in-progress → resolved → closed)
Priority levels (critical, high, medium, low)
SLA tracking (creation → 24h resolve SLA)
Category-based routing (technical, billing, logistics, other)
Company-scoped querying
Pagination and filtering
Database Queries:

db.supporttickets.create() - auto-generate ticketId with counter
db.supporttickets.find({ companyId, status: { $ne: 'closed' } }) - active tickets
db.supporttickets.updateOne({ ticketId }, { $set: { status, resolvedAt } }) - status update
db.supporttickets.find({ createdAt: { $gte: ISODate(...) }, status: 'resolved' }) - SLA metrics
API Endpoints:


POST /api/v1/support/tickets
  Body: { category, priority, subject, description, relatedOrderId, relatedNDREventId }
  Response: { ticketId, status: 'open', createdAt, assignedTo: null }

GET /api/v1/support/tickets
  Query: { page, limit, status, priority, category, sortBy: 'createdAt' }
  Response: { tickets: [...], total, pages }

GET /api/v1/support/tickets/:ticketId
  Response: { ticketId, status, category, notes: [...], assignedTo, createdAt, resolvedAt }

PUT /api/v1/support/tickets/:ticketId
  Body: { status, assignedTo, priority, notes }
  Response: { ticketId, updated: true }

POST /api/v1/support/tickets/:ticketId/notes
  Body: { note, type: 'internal' | 'customer' }
  Response: { noteId, createdAt }
Phase 2: Sales Representative Management
Why Second: Sales reps manage tickets and follow up. Needed for ticket assignment and lead management.

Tech Stack:

Model: SalesRepresentative (extended with performance metrics)
Controller: SalesRepController
Service: SalesRepService
Routes: /api/v1/crm/sales-reps
Implementation Scope:

CRUD for sales representatives
Performance metrics aggregation (tickets resolved, avg resolution time, conversion rate)
Territory assignment and management
Team hierarchy (reportingTo)
Commission calculation based on resolved tickets
KYC & encrypted bank account storage
Availability status (available, busy, offline)
Database Queries:

db.salesrepresentatives.find({ status: 'active' }).select('+bankDetails -password -encryptionVersion) - list active reps
db.salesrepresentatives.aggregate([ { $match: { _id: ObjectId(...) } }, { $lookup: { from: 'supporttickets', ... } }, { $project: { ticketsResolved: { $size: '$resolvedTickets' }, ... } } ]) - performance metrics
db.salesrepresentatives.updateOne({ _id }, { $set: { availabilityStatus, lastActivityAt } }) - status update
API Endpoints:


POST /api/v1/crm/sales-reps
  Body: { name, email, phone, territory, reportingTo, bankDetails: { accountNumber, ifscCode } }
  Response: { id, name, status: 'active', createdAt }

GET /api/v1/crm/sales-reps
  Query: { page, limit, territory, status }
  Response: { reps: [...], total, pages }

GET /api/v1/crm/sales-reps/:id/performance
  Response: { ticketsResolved, avgResolutionTime, conversionRate, commissionEarned, ... }

PUT /api/v1/crm/sales-reps/:id
  Body: { name, email, phone, territory, availabilityStatus }
  Response: { id, updated: true }

DELETE /api/v1/crm/sales-reps/:id
  Response: { id, deleted: true }
Phase 3: CallLog Automation from NDR Events
Why Third: Automatically creates structured call records when NDR resolution attempts happen, linking customer interactions to shipments.

Tech Stack:

Model: CallLog (linked to NDREvent, Shipment, SalesRepresentative)
Service: NDRCallLogService (auto-creation service)
Event Listener: On NDREvent resolution action
Implementation Scope:

Auto-create CallLog when NDR resolution action executed
Track call status (pending, in-progress, completed, no-answer, disconnected)
Store IVR responses and customer feedback
Schedule callbacks with retry logic
Link to related support ticket (if escalated)
Customer interaction timeline
Database Queries:

db.calllogs.find({ shipmentId, companyId }).sort({ createdAt: -1 }) - timeline for shipment
db.calllogs.find({ status: 'pending', scheduledFor: { $lte: new Date() } }) - pending callbacks
db.calllogs.updateOne({ _id }, { $set: { status: 'completed', resolvedAt, resolution } }) - mark completed
Event Flow:


NDREvent.resolveAction({type: 'call'})
  → Create CallLog({ ndrEventId, shipmentId, status: 'pending' })
  → Assign to available SalesRepresentative
  → Send WhatsApp notification to rep: "New call request for Order #123"
  → Rep marks as completed with resolution
  → If failed → Auto-escalate to SupportTicket
Phase 4: Lead & Conversion Tracking
Why Fourth: Converts support interactions into new business opportunities. Tracks sales funnel.

Tech Stack:

Model: Lead (new customer prospects from support interactions)
Controller: LeadController
Service: LeadConversionService
Routes: /api/v1/crm/leads
Implementation Scope:

Create leads from support ticket interactions
Lead source tracking (support ticket, referral, marketing, inbound inquiry)
Sales funnel: prospect → qualified → proposal → negotiation → won/lost
Lead assignment to sales reps
Lead scoring (engagement, response time, value indicators)
Conversion to actual order tracking
Territory-based lead distribution
Database Queries:

db.leads.find({ status: 'qualified', territory }).limit(10) - leads for rep
db.leads.aggregate([ { $match: { createdAt: { $gte: ISODate(...) } } }, { $group: { _id: '$status', count: { $sum: 1 } } } ]) - funnel metrics
db.leads.updateOne({ _id }, { $set: { status: 'won', convertedOrderId, convertedAt } }) - mark conversion
API Endpoints:


POST /api/v1/crm/leads
  Body: { name, email, phone, source, territory, relatedSupportTicketId }
  Response: { id, status: 'prospect', createdAt }

GET /api/v1/crm/leads
  Query: { page, limit, status, territory, source, sortBy: 'createdAt' }
  Response: { leads: [...], total, pages, funnelMetrics: { prospect: 25, qualified: 15, ... } }

PUT /api/v1/crm/leads/:id
  Body: { status, assignedTo, notes }
  Response: { id, updated: true }

POST /api/v1/crm/leads/:id/convert
  Body: { orderId }
  Response: { leadId, status: 'won', convertedOrderId, convertedAt }
Phase 5: Dispute Integration & Escalation
Why Fifth: Handles serious issues (damaged, lost, delayed). Creates disputes when support tickets can't resolve.

Tech Stack:

Model: Dispute (linked to SupportTicket, Shipment, Order)
Controller: DisputeController
Service: DisputeResolutionService
Routes: /api/v1/disputes
Implementation Scope:

Auto-create dispute if support ticket unresolved after SLA
Dispute types: damaged-goods, lost-shipment, delayed-delivery, quality-issue
Escalation workflow (investigation → decision → resolution)
Automated refund/replacement processing
Timeline tracking (creation → investigation → resolution)
Communication with customer (email notifications)
Database Queries:

db.disputes.find({ status: 'open', createdAt: { $lte: 48hrs ago } }) - stalled disputes
db.disputes.aggregate([ { $match: { status: 'resolved' } }, { $group: { _id: '$type', count: { $sum: 1 } } } ]) - dispute metrics
db.disputes.updateOne({ _id }, { $set: { status: 'resolved', resolution, refundAmount } }) - resolution
API Endpoints:


POST /api/v1/disputes
  Body: { type, relatedOrderId, relatedSupportTicketId, description }
  Response: { disputeId, status: 'investigation', createdAt }

GET /api/v1/disputes
  Query: { page, limit, status, type, sortBy: '-createdAt' }
  Response: { disputes: [...], total, pages }

PUT /api/v1/disputes/:disputeId
  Body: { status, resolution, refundAmount, notes }
  Response: { disputeId, updated: true }

POST /api/v1/disputes/:disputeId/resolve
  Body: { resolution, refundAmount }
  Response: { disputeId, status: 'resolved', resolvedAt }
Phase 6: Notifications & Escalation Workflows
Why Sixth: Automates team coordination and customer updates. Keeps everyone in sync.

Tech Stack:

Service: NotificationService (multi-channel)
Model: NotificationTemplate (Email, WhatsApp, SMS)
Event Listeners: Ticket creation, assignment, escalation, resolution
Implementation Scope:

Send WhatsApp to SalesRep when assigned ticket
Send Email to customer when ticket status changes
Send reminder SMS for pending callbacks
Auto-escalate if ticket unresolved after 24h → assign to supervisor
Auto-create dispute if ticket pending > 48h
Send bulk summary reports to managers
Implementation Priority & Dependencies

Phase 1: Support Ticket System (5-7 days)
  ├─ Database schema validation
  ├─ Routes, controller, service
  ├─ Auto-increment ticketId generation
  ├─ Status workflows & SLA calculations
  └─ Tests (unit, integration, E2E)

Phase 2: Sales Rep Management (3-4 days)
  ├─ Depends on: Phase 1 (for ticket assignment)
  ├─ CRUD operations
  ├─ Performance aggregation queries
  ├─ Bank details encryption
  └─ Tests

Phase 3: CallLog Automation (4-5 days)
  ├─ Depends on: Phase 1, 2
  ├─ NDR event listeners
  ├─ Auto-assignment logic
  ├─ Callback scheduling
  └─ Tests

Phase 4: Lead Management (3-4 days)
  ├─ Depends on: Phase 1, 2
  ├─ Lead CRUD
  ├─ Funnel metrics
  ├─ Lead scoring
  └─ Tests

Phase 5: Dispute Integration (3-4 days)
  ├─ Depends on: Phase 1, 3, 4
  ├─ Dispute creation & escalation
  ├─ Refund processing
  └─ Tests

Phase 6: Notifications (4-5 days)
  ├─ Depends on: All previous phases
  ├─ Multi-channel sending
  ├─ Event listeners
  └─ Tests
Tech Stack Summary
Database: MongoDB with proper indexing (companyId, status, createdAt, assignedTo)
Cache: Redis for SLA calculations, daily metrics
Queue: Bull for async notifications, callback scheduling
Encryption: Field-level for bank details using crypto-js
API Framework: Express with TypeScript, proper RBAC via Membership model
Testing: Jest with 80%+ coverage for CRM features
Ready to implement Phase 1 (Support Ticket System) first? This is the critical foundation that all other phases depend on. Should I proceed with:

Creating the routes and controller
Implementing the service layer with SLA calculations
Adding the auto-increment ticketId logic
Writing comprehensive tests
Let me mark this plan as complete and wait for your approval to begin Phase 1.