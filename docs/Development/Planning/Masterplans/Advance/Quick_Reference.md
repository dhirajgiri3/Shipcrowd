# Shipcrowd Implementation: Quick Reference Guide

**Use this document:** Daily during implementation
**Last Updated:** 2026-01-07

---

## WEEK 11 AT A GLANCE

### Weight Discrepancy Management

```
┌─────────────────────────────────────────┐
│ Carrier scans package at hub             │
└──────────────┬──────────────────────────┘
               │ Actual weight ≠ Declared weight
               ↓
┌─────────────────────────────────────────┐
│ WeightDisputeDetectionService           │
│ - Compare weights (>5% = dispute)       │
│ - Calculate financial impact             │
│ - Create WeightDispute record           │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ Notify Seller                           │
│ - Email: "Dispute created"              │
│ - SMS: "Weight mismatch detected"       │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ Seller submits evidence (24-48 hours)   │
│ - Photos of actual weight                │
│ - Documents (invoices, etc.)            │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ Admin Reviews & Resolves                │
│ - Outcome: seller_favor/Shipcrowd_favor │
│ - Update wallet (debit/credit)          │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│ OR Auto-Resolve after 7 days            │
│ (favor Shipcrowd if no response)        │
└─────────────────────────────────────────┘

KEY FILES:
- Models: WeightDispute.ts
- Services: weight-dispute-detection.service.ts
          weight-dispute-resolution.service.ts
- Controller: weight-disputes.controller.ts
- Job: weight-dispute-auto-resolve.job.ts
```

### COD Remittance Automation

```
┌──────────────────────────────────┐
│ Daily Scheduler Job (00:00 IST)  │ → Check all companies
└───────────┬──────────────────────┘
            │
            ↓
┌──────────────────────────────────────────┐
│ CODRemittanceCalculationService          │
│ - Find eligible shipments (7+ days old)   │
│ - Calculate deductions:                  │
│   • Shipping charges                     │
│   • Weight dispute deductions            │
│   • RTO charges                          │
│   • Platform fee (0.5%)                  │
│ - Net payable = Total COD - Deductions   │
└───────────┬──────────────────────────────┘
            │
            ↓
┌──────────────────────────────────────────┐
│ CODRemittanceSchedulingService           │
│ - Create batch if balance ≥ min threshold│
│ - Status: pending_approval               │
│ - Auto-approve if configured             │
└───────────┬──────────────────────────────┘
            │
            ↓
┌──────────────────────────────────────────┐
│ 30-min Processor Job (every 30 min)      │
│ - Pick approved remittances              │
│ - Create Razorpay payout                 │
│ - Status: processing                     │
└───────────┬──────────────────────────────┘
            │
            ↓
┌──────────────────────────────────────────┐
│ Razorpay Webhook (payout complete)       │
│ - Update remittance status: completed    │
│ - Mark shipments as remitted             │
│ - Send PDF report to seller              │
└──────────────────────────────────────────┘

KEY FILES:
- Models: CODRemittance.ts
- Services: cod-remittance-calculation.service.ts
          cod-remittance-scheduling.service.ts
          cod-remittance-processing.service.ts
- Controller: cod-remittance.controller.ts
- Jobs: cod-remittance-scheduler.job.ts
        cod-remittance-processor.job.ts
        cod-remittance-reconciliation.job.ts
```

---

## WEEK 12 AT A GLANCE

### Fraud Detection

```
Order Creation
     │
     ↓
┌──────────────────────────────────┐
│ FraudDetectionService            │
│ .analyzeOrder(orderId)           │
└───────────┬──────────────────────┘
            │
            ↓ (if COD)
┌──────────────────────────────────┐
│ Gather Order Data:               │
│ • Customer history               │
│ • Account age                    │
│ • Previous orders & RTO rate     │
│ • Order value & items            │
│ • Delivery pincode fraud rate    │
└───────────┬──────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│ OpenAI Analysis                  │
│ • Build prompt with order data   │
│ • Call GPT-4 mini                │
│ • Get risk score (0-100)         │
└───────────┬──────────────────────┘
            │
    ┌───────┴────────────┐
    │                    │
    ↓ (Score < 70)      ↓ (Score 70-90)      ↓ (Score > 90)
┌─────────────┐   ┌──────────────────┐   ┌──────────────┐
│ AUTO-APPROVE│   │ FLAG FOR REVIEW  │   │ AUTO-REJECT  │
│             │   │                  │   │              │
│ Proceed     │   │ Add to review    │   │ Cancel order │
│ normally    │   │ queue            │   │              │
└─────────────┘   │ Notify team      │   │ Notify seller│
                  │ Wait 2-4 hours   │   └──────────────┘
                  │ Admin decision   │
                  │ - Approve        │
                  │ - Reject         │
                  │ - Require prepay │
                  └──────────────────┘

RISK FACTORS:
• New customer with high order value
• High-fraud pincode
• Velocity spike (many orders/hour)
• Address mismatch
• Blacklisted contact info

KEY FILES:
- Models: FraudDetection.ts, FraudAlert.ts, Blacklist.ts
- Services: fraud-detection.service.ts
          fraud-resolution.service.ts
- Controller: fraud-detection.controller.ts
- Job: fraud-detection-scan.job.ts (hourly)
```

### Dispute Resolution

```
Customer/Seller Files Dispute
     │
     ↓
┌──────────────────────────────────┐
│ Create Dispute                   │
│ • Type: damaged/missing/delay    │
│ • Priority: low/medium/high      │
│ • SLA deadline set               │
│ • Assign to team                 │
└───────────┬──────────────────────┘
            │
            ↓ (if SLA nearing deadline)
┌──────────────────────────────────┐
│ AUTO-ESCALATION                  │
│ • Urgent (24h) → Escalate @ 20h  │
│ • High (48h) → Escalate @ 36h    │
│ • Medium (72h) → Escalate @ 60h  │
│ • Low (7d) → Escalate @ 5d       │
└───────────┬──────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│ Team Investigates                │
│ • Request additional evidence    │
│ • Contact courier               │
│ • Verify shipping label         │
│ • Check delivery proof          │
└───────────┬──────────────────────┘
            │
    ┌───────┴────────────────────────────┐
    │                                    │
    ↓                                    ↓
┌────────────────┐            ┌────────────────────┐
│ RESOLVE        │            │ PARTIAL EVIDENCE   │
│ • Refund       │            │ • Escalate to      │
│ • Replacement  │            │   courier partner  │
│ • Compensation │            │ • Wait 7-15 days   │
│ • No Action    │            │   for investigation│
└────────────────┘            └────────────────────┘

RESPONSE:
• Refund → WalletService.credit()
• Replacement → Create new order
• Compensation → Fixed amount + refund

KEY FILES:
- Models: Dispute.ts
- Services: dispute-management.service.ts
          dispute-analytics.service.ts
- Controller: disputes.controller.ts
- Job: dispute-sla-monitor.job.ts (hourly)
```

### Reverse Logistics (Returns)

```
Customer Initiates Return
     │
     ↓
┌──────────────────────────────────┐
│ Create ReturnOrder               │
│ • Reason: damaged/defective/size │
│ • Items to return                │
│ • Refund/Exchange type           │
└───────────┬──────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│ Schedule Pickup                  │
│ • Courier picks up from customer │
│ • Customer provides return label │
│ • Track with AWB                 │
└───────────┬──────────────────────┘
            │
            ↓ (In transit)
┌──────────────────────────────────┐
│ Seller Warehouse Receives         │
│ • Check condition                │
│ • Verify items match             │
└───────────┬──────────────────────┘
            │
            ↓
┌──────────────────────────────────┐
│ QC Inspection (24-48 hours)      │
│ Decide:                          │
│ • Full refund (good condition)   │
│ • Partial refund (slight damage) │
│ • No refund (fraud/bad condition)│
│ • Replacement (exchange)         │
└───────────┬──────────────────────┘
            │
    ┌───────┴────────────────────────┐
    │                                │
    ↓                                ↓
┌──────────────────┐      ┌────────────────────┐
│ APPROVED         │      │ REJECTED           │
│ • Credit wallet  │      │ • Return to seller │
│ • Restock        │      │ • Or disposal      │
│ • Close return   │      │ • Mark return fail │
└──────────────────┘      └────────────────────┘

KEY FILES:
- Models: ReturnOrder.ts
- Services: return-order.service.ts
          return-qc.service.ts
          return-refund.service.ts
- Controller: returns.controller.ts
```

---

## WEEK 13 INFRASTRUCTURE AT A GLANCE

### Docker Setup

```
docker-compose.yml contains:
├── api (Node.js Express)
├── mongo (Database)
├── redis (Cache/Sessions)
├── prometheus (Metrics)
├── grafana (Dashboards)
└── nginx (Reverse Proxy)

Commands:
docker-compose up -d              # Start all services
docker-compose logs -f api        # See API logs
docker-compose exec api npm test  # Run tests
docker-compose down               # Stop all
```

### CI/CD Workflows

```
Push Code
    │
    ├─→ [PR Checks]
    │   ├─ Lint
    │   ├─ Unit tests
    │   ├─ Build
    │   └─ Security scan
    │
    ├─→ [If PR merged to develop]
    │   └─ Auto-deploy to staging
    │
    └─→ [If merged to main]
        ├─ Manual approval needed
        └─ Deploy to production
```

### Monitoring

```
Prometheus (collects metrics)
         ↓
    Grafana (visualizes)
         ↓
    Dashboards:
    ├─ System Health
    ├─ API Performance
    ├─ Business Metrics
    └─ Error Trends

Sentry (error tracking)
         ↓
    Error Alerts
    (Slack/Email)
```

---

## QUICK COMMAND REFERENCE

### Start Development

```bash
# Setup
npm install
docker-compose up -d
npm run db:migrate

# Develop
npm run dev              # Start dev server
npm run test:watch      # Watch tests
npm run lint:fix        # Fix lint errors

# Build & Test
npm run build
npm run test:unit
npm run test:integration
```

### Common Git Flow

```bash
# Create feature branch
git checkout -b feature/weight-disputes

# Make changes & test
npm test

# Commit
git add .
git commit -m "feat: Add weight dispute detection"

# Push & create PR
git push origin feature/weight-disputes
# Create PR on GitHub

# After approval, merge to develop
# After testing, create PR to main
# Merge to main triggers production deployment
```

### Database Queries (for debugging)

```javascript
// List pending weight disputes
db.weightdisputes.find({ status: 'pending' })

// Find remittances failing
db.codremittances.find({ 'payout.status': 'failed' })

// Check fraud alerts for a seller
db.fraudalerts.find({ company: ObjectId("...") })

// Check dispute SLA breaches
db.disputes.find({
  slaDeadline: { $lt: new Date() },
  status: { $ne: 'resolved' }
})
```

---

## CRITICAL PATHS & DEPENDENCIES

### Must Complete in Order:

```
Week 11:
1. WeightDispute models ← Prerequisite
2. WeightDisputeDetectionService
3. WeightDisputeResolutionService
4. CODRemittance models ← Prerequisite
5. CODRemittanceCalculationService
6. CODRemittanceSchedulingService
7. CODRemittanceProcessingService

Week 12:
8. FraudDetection models ← Prerequisite
9. FraudDetectionService ← Depends on #8
10. DisputeResolution models
11. DisputeManagementService ← Depends on #10
12. ReturnOrder models
13. ReturnOrderService ← Depends on #12

Week 13:
14. Docker setup (parallel with above)
15. CI/CD pipelines (after Docker)
16. Monitoring setup (after #15)
```

---

## RED FLAGS & SOLUTIONS

### If Database Queries Are Slow
→ Add missing indexes (see WeightDispute, CODRemittance, etc.)
→ Use `explain()` to check query plans
→ Add Redis caching for frequently accessed data

### If Webhooks Are Failing
→ Check webhook signature verification
→ Review webhook retry queue (dead-letter)
→ Monitor webhook logs in Sentry

### If Remittances Not Processing
→ Check if remittance.status = 'approved'
→ Verify Razorpay credentials in .env
→ Check Razorpay API rate limits
→ Review background job logs

### If Tests Failing
→ Clear test database: `npm run db:seed:test`
→ Check mock data setup
→ Verify MongoDB connection string
→ Look at test logs for specific errors

### If Fraud Detection Has False Positives
→ Lower riskScore threshold from 70 → 80
→ Adjust fraud prompt to be more lenient
→ Add customer history weight
→ Review false positive feedback

---

## SUCCESS METRICS BY WEEK

### Week 11 Completion Criteria
- [ ] Weight disputes auto-created within 5 minutes
- [ ] Dispute resolution within 24 hours
- [ ] All wallet transactions logged
- [ ] Seller response rate > 60%
- [ ] Remittances created on schedule
- [ ] Razorpay payouts successful (98%+)
- [ ] 90% test coverage for services

### Week 12 Completion Criteria
- [ ] Fraud detection on 100% of COD orders
- [ ] False positive rate < 5%
- [ ] Disputes resolved within SLA 95% of time
- [ ] Returns processed < 15 days
- [ ] QC completed < 48 hours
- [ ] 85% test coverage for all services

### Week 13 Completion Criteria
- [ ] All services containerized
- [ ] CI/CD pipelines automated
- [ ] Deployment time < 5 minutes
- [ ] API response time < 100ms
- [ ] 99.99% uptime target
- [ ] All metrics in Prometheus/Grafana
- [ ] Auto-scaling working

---

## CRITICAL ENVIRONMENT VARIABLES

```env
# Database
MONGODB_URI=mongodb://mongo:27017/Shipcrowd
REDIS_URL=redis://redis:6379

# Payment
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret

# AI
OPENAI_API_KEY=sk-proj-...

# Webhooks
VELOCITY_WEBHOOK_SECRET=...

# Notifications
SMTP_HOST=smtp.zeptomail.in
TWILIO_ACCOUNT_SID=...

# Security
JWT_SECRET=long-random-string
ENCRYPTION_KEY=long-random-key
```

---

## HELPFUL DOCUMENTATION FILES

- `MASTERPLAN-ENHANCED-v2.md` → Full technical specs
- `IMPLEMENTATION-GUIDE.md` → Step-by-step code examples
- `docs/api/disputes/weight-disputes.api.md` → API specifications
- `docs/features/WeightDisputeManagement.md` → Feature guide
- `docs/deployment/Docker-Setup.md` → Docker commands
- `docs/monitoring/Prometheus-Setup.md` → Metrics guide

---

## COMMUNICATION TEMPLATES

### Remittance Scheduled Email
```
Subject: Your Shipcrowd COD Remittance #REM-20260115-ABC123

Hi [Seller Name],

Your COD remittance has been scheduled for processing.

Details:
- Remittance ID: REM-20260115-ABC123
- Scheduled Date: January 15, 2026
- Total COD Collected: ₹45,230
- Deductions: ₹2,250 (shipping, fees)
- Net Payable: ₹42,980
- Payment Method: NEFT

[View Details] [Download Report]

Expected payout: January 15, 2026
Questions? Contact support@Shipcrowd.com

Thanks,
Shipcrowd Team
```

### Weight Dispute Alert SMS
```
Weight discrepancy on Order #ORD-12345:
Declared 1kg, Actual 1.5kg.
Impact: ₹55.
Respond by Jan 14: Shipcrowd.com/disputes/WD-123
```

### Fraud Alert (Internal)
```
FRAUD ALERT: High-risk COD order
Order #ORD-98765
Risk Score: 87 (CRITICAL)
Reason: New customer, high value (₹15,000), high-fraud pincode
Action: AUTO-REJECTED
Customer notified.
```

---

## COMMON MISTAKES TO AVOID

❌ **Don't:**
- Forget database indexes → Use provided index list
- Process remittances without checking wallet balance
- Auto-resolve disputes too early → 7 days minimum
- Skip test cases → 85% coverage minimum
- Deploy without staging first → Always test staging
- Forget notification templates → Use multi-channel

✅ **Do:**
- Read existing code before writing new code
- Ask questions in standup if unsure
- Test locally before pushing
- Review webhook signatures carefully
- Monitor logs after each deployment
- Back up database before migrations

---

## ESCALATION CONTACTS

For blocking issues:
- **Backend Questions:** Senior Backend Dev
- **Database Issues:** DevOps/DBA
- **Deadline Concerns:** Project Manager
- **External Service Failures:** Integration Lead

---

**Last Updated:** 2026-01-07
**Valid For:** Weeks 11-13
**Print This:** For daily reference during implementation

Good luck! 🚀
