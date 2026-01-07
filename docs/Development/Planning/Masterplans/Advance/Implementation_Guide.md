# ShipCrowd Implementation Guide: Quick Start for Developers

**Purpose:** Fast-track implementation of critical features
**Target:** Weeks 11-13 (8-10 weeks development)
**Team:** Backend (3-4), Frontend (2-3), DevOps/QA (1-2)

---

## QUICK START: DEPENDENCY CHAIN

Implement in this order (dependencies matter):

```
Week 11:
├── Day 1-2: Weight Dispute Detection Service
├── Day 3-4: Weight Dispute Resolution + API
├── Day 5: COD Remittance Calculation Service
├── Day 6-7: COD Remittance Scheduling + Processing
└── Day 8: Testing + Documentation

Week 12:
├── Day 1-2: Fraud Detection Service + Models
├── Day 3-4: Fraud Review Workflow + API
├── Day 5-6: Dispute Resolution + Reverse Logistics
└── Day 7-8: Integration Testing

Week 13:
├── Day 1-2: Docker Setup + docker-compose
├── Day 3-4: GitHub Actions CI/CD Workflows
├── Day 5-6: Prometheus + Grafana Setup
└── Day 7-8: Database Optimization + Load Testing
```

---

## CRITICAL IMPLEMENTATION TASKS

### Task 1: Weight Dispute System (Day 1-4 of Week 11)

**Frontend Integration:**
```typescript
// client/src/features/disputes/components/WeightDisputeAlert.tsx
export function WeightDisputeAlert({ shipment, dispute }) {
  return (
    <Alert severity="warning">
      <h4>Weight Discrepancy Detected</h4>
      <p>Declared: {dispute.declaredWeight.value}kg | Actual: {dispute.actualWeight.value}kg</p>
      <p>Financial Impact: ₹{dispute.financialImpact.difference}</p>
      <Button onClick={() => openDisputeForm(dispute.id)}>
        Submit Evidence
      </Button>
    </Alert>
  );
}
```

**Backend Integration Points:**
1. Velocity webhook → `handleCarrierWeightUpdate()`
2. Shipment model update → record actual weight
3. Dispute creation → notify seller
4. Evidence submission → update status
5. Admin resolution → wallet transaction

**Database Indexes (Critical for Performance):**
```typescript
// Indexes to add to MongoDB
db.weightdisputes.createIndex({ companyId: 1, status: 1, createdAt: -1 });
db.weightdisputes.createIndex({ shipmentId: 1 });
db.weightdisputes.createIndex({ status: 1, createdAt: -1 });
```

---

### Task 2: COD Remittance System (Day 5-7 of Week 11)

**Frontend Integration:**
```typescript
// client/src/features/finance/components/RemittanceSchedule.tsx
export function RemittanceSchedule({ company }) {
  const [config, setConfig] = useState(company.codRemittanceConfig);

  return (
    <Card>
      <h3>COD Remittance Settings</h3>
      <Select
        label="Schedule"
        value={config.schedule}
        options={['daily', 'weekly', 'biweekly', 'monthly']}
      />
      <Input
        label="Minimum Threshold (₹)"
        value={config.minThreshold}
      />
      <Checkbox
        label="Auto-approve remittances"
        checked={config.autoApprove}
      />
      <Button onClick={() => updateConfig(config)}>Save</Button>
    </Card>
  );
}
```

**Background Job Scheduling:**
```typescript
// Use package: nestjs-schedule or cron
// Make sure jobs don't overlap
```

**Razorpay Integration (Update Existing):**
```typescript
// server/src/infrastructure/payment/razorpay/payout.service.ts
async createPayout(payoutDetails: PayoutDTO) {
  const response = await axios.post(
    'https://api.razorpay.com/v1/payouts',
    {
      account_number: payoutDetails.accountNumber,
      fund_account_id: payoutDetails.fundAccountId,
      amount: payoutDetails.amount,  // In paise
      currency: 'INR',
      mode: 'NEFT',  // or IMPS, RTGS, UPI
      purpose: 'payout',
      narration: payoutDetails.narration,
      reference_id: payoutDetails.reference
    },
    {
      auth: {
        username: process.env.RAZORPAY_KEY_ID,
        password: process.env.RAZORPAY_KEY_SECRET
      }
    }
  );

  return response.data;
}
```

---

### Task 3: Fraud Detection System (Day 1-4 of Week 12)

**Key Integration: Order Creation Flow**
```typescript
// server/src/core/application/services/shipping/shipment.service.ts
async createShipment(orderData: CreateShipmentDTO) {
  // ... existing code ...

  // NEW: Fraud detection
  if (orderData.paymentMode === 'COD') {
    const fraudAssessment = await this.fraudDetectionService.analyzeOrder(order);

    if (fraudAssessment.riskLevel === 'CRITICAL') {
      throw new FraudException('Order flagged for high fraud risk');
    }

    if (fraudAssessment.riskScore > 70) {
      // Hold order for manual review
      order.status = 'pending_fraud_review';
      await this.notifyFraudReviewTeam(order, fraudAssessment);
    }
  }

  return shipment;
}
```

**OpenAI Integration (New Dependency):**
```bash
npm install openai
```

```typescript
// server/src/infrastructure/integrations/ai/openai-client.ts
import OpenAI from 'openai';

export class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyzeFraudRisk(orderData: any) {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a fraud detection expert for e-commerce COD orders.'
        },
        {
          role: 'user',
          content: this.buildPrompt(orderData)
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content);
  }

  private buildPrompt(orderData: any): string {
    return `
Analyze this order for fraud risk:

Customer: ${orderData.customerAge} days old, ${orderData.previousOrders} past orders
Order: ₹${orderData.amount}, COD, Items: ${orderData.items.join(', ')}
Delivery: ${orderData.deliveryPincode} (fraud rate: ${orderData.areaFraudRate}%)

Provide JSON with: riskScore (0-100), riskLevel (LOW/MEDIUM/HIGH/CRITICAL), riskFactors, recommendation.
    `;
  }
}
```

---

### Task 4: Dispute Resolution System (Day 5-7 of Week 12)

**Dispute Lifecycle Diagram:**
```
Customer files → Under Review → Awaiting Seller Response → Resolved → Closed
     ↓                              ↓
  Evidence            Seller submits evidence
  Collection          Auto-escalate after 48h
                      Admin reviews
```

**API Sequence:**
```
1. POST /api/v1/disputes → Create dispute
2. GET  /api/v1/disputes/:id → Track status
3. POST /api/v1/disputes/:id/submit-evidence → Seller submits evidence
4. (Admin reviews)
5. POST /api/v1/disputes/:id/resolve → Admin resolves
6. GET  /api/v1/disputes/:id → Customer sees resolution
```

---

### Task 5: Reverse Logistics (Day 5-7 of Week 12)

**Return Flow Integration:**
```
Customer initiates return
  ↓
Pick up from customer address
  ↓
In-transit to seller warehouse
  ↓
Receive at warehouse + QC inspection
  ↓
Accept/Reject + Refund/Restock
  ↓
Close return
```

**Frontend: Return initiation (on tracking page)**
```typescript
// client/app/track/[trackingId]/page.tsx
if (shipment.status === 'delivered') {
  return (
    <>
      {/* ... tracking details ... */}
      <Button onClick={() => openReturnFlow(shipment.id)}>
        Request Return
      </Button>
    </>
  );
}
```

---

## INFRASTRUCTURE SETUP (Week 13)

### Docker Setup (3-4 hours)

**Project Structure:**
```
/docker
  ├── Dockerfile              # Node.js multi-stage build
  ├── docker-compose.yml      # All services
  ├── nginx.conf              # Reverse proxy
  └── .dockerignore           # Exclude files
```

**Dockerfile:**
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/main.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/shipcrowd
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
      - RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}
    depends_on:
      - mongo
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongo:
    image: mongo:7.0
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api

volumes:
  mongo_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

### CI/CD Setup (4-5 hours)

**GitHub Actions Workflow:**
```yaml
# .github/workflows/test-and-deploy.yml
name: Test & Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: npm run test:integration

      - name: Build
        run: npm run build

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to staging
        run: |
          echo "Deploying to staging..."
          # Your deployment command here

  deploy-prod:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Your deployment command here
```

---

## TESTING STRATEGY

### Unit Test Structure
```typescript
// server/tests/unit/services/weight-dispute-detection.service.test.ts
describe('WeightDisputeDetectionService', () => {
  let service: WeightDisputeDetectionService;
  let shipmentRepo: MockRepository;
  let disputeRepo: MockRepository;

  beforeEach(() => {
    // Setup mocks
  });

  describe('detectOnCarrierScan', () => {
    it('should create dispute when difference > 5%', async () => {
      // Arrange
      const shipment = createMockShipment({ declaredWeight: 1 });
      shipmentRepo.findById.mockResolvedValue(shipment);

      // Act
      const dispute = await service.detectOnCarrierScan(
        shipment._id,
        { value: 1.2, unit: 'kg' },
        mockCarrierData
      );

      // Assert
      expect(dispute).toBeDefined();
      expect(dispute.status).toBe('pending');
    });

    it('should not create dispute when difference < 5%', async () => {
      // ...
    });
  });
});
```

### Integration Test Structure
```typescript
// server/tests/integration/weight-disputes.test.ts
describe('Weight Disputes Integration', () => {
  let app: INestApplication;
  let database: Database;

  beforeAll(async () => {
    app = await createTestApp();
    database = app.get(DatabaseService);
    await database.connect();
  });

  describe('POST /api/v1/disputes/weight/:id/submit', () => {
    it('should accept seller evidence and update status', async () => {
      // Create a dispute first
      const dispute = await database.collection('weightdisputes').insertOne({
        // ... dispute data
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/disputes/weight/${dispute._id}/submit`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          photos: ['photo1.jpg'],
          notes: 'We used accurate scale'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('under_review');
    });
  });
});
```

---

## MONITORING & ALERTS

### Prometheus Metrics
```typescript
// server/src/infrastructure/monitoring/metrics.ts
export class MetricsService {
  private disputeCounter = new Counter({
    name: 'weight_disputes_total',
    help: 'Total weight disputes created',
    labelNames: ['status', 'outcome']
  });

  private remittanceTimer = new Histogram({
    name: 'cod_remittance_processing_seconds',
    help: 'COD remittance processing time',
    buckets: [5, 10, 30, 60]
  });

  logDisputeCreated(outcome: string) {
    this.disputeCounter.inc({ status: 'created', outcome });
  }

  measureRemittanceProcessing(fn: () => Promise<any>) {
    return this.remittanceTimer.observe(async () => {
      return await fn();
    });
  }
}
```

### Grafana Dashboard
- API response times
- Error rates
- Weight dispute metrics
- Remittance processing
- Fraud detection rate

---

## DEPLOYMENT CHECKLIST

**Pre-Deployment:**
- [ ] All tests passing (unit + integration)
- [ ] Code review completed
- [ ] Database migrations tested
- [ ] Environment variables verified
- [ ] Secrets in .env.example updated
- [ ] Documentation updated

**Deployment Day:**
- [ ] Create backup of production database
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Merge to main/production branch
- [ ] Monitor logs & metrics
- [ ] Have rollback plan ready

**Post-Deployment:**
- [ ] Verify all services healthy
- [ ] Monitor error rates
- [ ] Check batch jobs executed
- [ ] Verify webhook processing
- [ ] Monitor database performance

---

## COMMON PITFALLS & SOLUTIONS

### 1. Webhook Processing Failures
**Problem:** Carrier webhooks lost due to service downtime
**Solution:** Implement webhook retry queue (dead-letter pattern)

### 2. Race Conditions in Remittance
**Problem:** Duplicate remittances or missing shipments
**Solution:** Use database transactions + unique constraints

### 3. Weight Dispute Data Inconsistency
**Problem:** Carrier weight doesn't update shipment
**Solution:** Idempotent operations + audit trail

### 4. Fraud Detection False Positives
**Problem:** Too many legitimate orders blocked
**Solution:** Tune risk thresholds + feedback loop

### 5. Payout Failures
**Problem:** Razorpay failures not handled
**Solution:** Retry queue + manual intervention interface

---

## ESTIMATED TIMELINE

```
Week 11 (80 hours):
  - Day 1-2: Weight detection (16h)
  - Day 3-4: Weight resolution + API (16h)
  - Day 5: COD calculation (12h)
  - Day 6-7: COD scheduling + processing (24h)
  - Day 8: Testing (12h)

Week 12 (80 hours):
  - Day 1-2: Fraud detection (16h)
  - Day 3-4: Fraud review + API (16h)
  - Day 5-6: Disputes + Returns (32h)
  - Day 7-8: Integration testing (16h)

Week 13 (60 hours):
  - Day 1-2: Docker setup (12h)
  - Day 3-4: CI/CD pipelines (16h)
  - Day 5-6: Monitoring stack (16h)
  - Day 7-8: Performance tuning (16h)

Total: ~220 hours (6-7 weeks of development)
```

---

## TEAM STRUCTURE RECOMMENDATION

**Backend Team (3 developers):**
- Dev 1: Weight Disputes + COD Remittance
- Dev 2: Fraud Detection + Disputes
- Dev 3: Reverse Logistics + Integration Testing

**Frontend Team (2 developers):**
- Dev 1: Dispute UI + Return Flow
- Dev 2: Remittance Dashboard + Fraud Review

**DevOps/QA (1 developer):**
- Infrastructure setup
- Testing automation
- Deployment pipelines

---

## SUCCESS METRICS

**After Week 11:**
✅ Weight disputes auto-detected & resolved
✅ COD remittance fully automated
✅ Zero manual remittance processing

**After Week 12:**
✅ 80%+ fraud detection accuracy
✅ 95%+ disputes resolved within SLA
✅ Returns processed in < 15 days

**After Week 13:**
✅ Deployment fully automated
✅ System monitoring 24/7
✅ Sub-100ms API response times
✅ 99.99% uptime

---

This guide should be your daily reference for implementation. Update it as you discover new requirements or challenges!
