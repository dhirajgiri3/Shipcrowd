# NDR/RTO System Architecture

Complete architectural documentation for the NDR (Non-Delivery Report) and RTO (Return To Origin) automation system.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Models](#data-models)
3. [Service Architecture](#service-architecture)
4. [Workflow Engine](#workflow-engine)
5. [OpenAI Integration](#openai-integration)
6. [Background Jobs](#background-jobs)
7. [API Design](#api-design)
8. [Scalability](#scalability)
9. [Security](#security)

---

## System Overview

The NDR/RTO system automates the detection, classification, and resolution of delivery failures, minimizing manual intervention and reducing return-to-origin costs.

### Key Features

- **Automated NDR Detection:** Real-time detection from tracking updates
- **AI-Powered Classification:** OpenAI-based intelligent categorization
- **Workflow Automation:** Configurable resolution workflows
- **Multi-Channel Communication:** WhatsApp, Email, Voice (Exotel)
- **Magic Link Address Updates:** Secure, token-based address corrections
- **RTO Management:** Automated return triggering and tracking
- **Warehouse Integration:** Real-time notifications for incoming returns
- **Analytics Dashboard:** Comprehensive metrics and insights

### High-Level Architecture

```mermaid
graph TB
    subgraph "External Systems"
        Carrier[Courier API]
        OpenAI[OpenAI API]
        Exotel[Exotel API]
        WhatsApp[WhatsApp Business API]
    end

    subgraph "Shipcrowd Backend"
        API[REST API Controllers]
        NDRDetection[NDR Detection Service]
        NDRClassification[NDR Classification Service]
        NDRResolution[NDR Resolution Service]
        RTOService[RTO Service]
        WhService[Warehouse Notification Service]
        TokenService[Token Service]
    end

    subgraph "Data Layer"
        MongoDB[(MongoDB)]
        Redis[(Redis/BullMQ)]
    end

    subgraph "Background Jobs"
        ResolutionJob[NDR Resolution Job]
        DeadlineJob[Deadline Check Job]
    end

    Carrier -->|Tracking Update| API
    API --> NDRDetection
    NDRDetection --> MongoDB
    NDRDetection --> NDRClassification
    NDRClassification --> OpenAI
    NDRClassification --> NDRResolution
    NDRResolution --> ResolutionJob
    ResolutionJob --> Redis
    ResolutionJob --> WhatsApp
    ResolutionJob --> Exotel
    NDRResolution --> RTOService
    RTOService --> WhService
    RTOService --> MongoDB
    DeadlineJob --> Redis
    DeadlineJob --> RTOService
```

---

## Data Models

### Entity Relationship Diagram

```mermaid
erDiagram
    Shipment ||--o{ NDREvent : "has"
    NDREvent ||--|| NDRWorkflow : "uses"
    NDREvent ||--o{ CallLog : "generates"
    NDREvent ||--o| RTOEvent : "triggers"
    RTOEvent ||--|| Shipment : "references"
    Order ||--o{ Shipment : "contains"
    Company ||--o{ Shipment : "owns"
    Company ||--o{ NDRWorkflow : "customizes"
    Warehouse ||--o{ RTOEvent : "receives"

    Shipment {
        ObjectId _id
        string trackingNumber
        ObjectId orderId
        ObjectId companyId
        string currentStatus
        object deliveryDetails
        object ndrDetails
    }

    NDREvent {
        ObjectId _id
        ObjectId shipment
        string awb
        string ndrReason
        string ndrReasonClassified
        string ndrType
        Date detectedAt
        string status
        int attemptNumber
        Date resolutionDeadline
        array resolutionActions
        boolean customerContacted
    }

    NDRWorkflow {
        ObjectId _id
        string ndrType
        ObjectId company
        boolean isDefault
        array actions
        object escalationRules
        object rtoTriggerConditions
    }

    CallLog {
        ObjectId _id
        ObjectId ndrEvent
        ObjectId shipment
        string callSid
        string status
        int duration
        object ivrResponse
        Date createdAt
    }

    RTOEvent {
        ObjectId _id
        ObjectId shipment
        ObjectId order
        ObjectId reverseShipment
        string rtoReason
        ObjectId ndrEvent
        string triggeredBy
        number rtoCharges
        ObjectId warehouse
        Date expectedReturnDate
        Date actualReturnDate
        string returnStatus
        object qcResult
    }
```

### NDREvent Schema

```typescript
interface INDREvent {
    shipment: ObjectId;
    awb: string;
    ndrReason: string; // Raw reason from courier
    ndrReasonClassified?: string; // OpenAI classified
    ndrType: 'address_issue' | 'customer_unavailable' | 'refused' | 'payment_issue' | 'other';
    detectedAt: Date;
    status: 'detected' | 'in_resolution' | 'resolved' | 'escalated' | 'rto_triggered';
    attemptNumber: number;
    resolutionDeadline: Date; // 48 hours from detection
    resolutionActions: INDRResolutionAction[];
    customerContacted: boolean;
    order: ObjectId;
    company: ObjectId;
}
```

### NDRWorkflow Schema

```typescript
interface INDRWorkflow {
    ndrType: string;
    company?: ObjectId; // null = default workflow
    isDefault: boolean;
    actions: Array<{
        sequence: number;
        actionType: 'call_customer' | 'send_whatsapp' | 'send_email' | 
                     'update_address' | 'request_reattempt' | 'trigger_rto';
        delayMinutes: number; // Delay after previous action
        autoExecute: boolean;
        actionConfig: Record<string, any>;
    }>;
    escalationRules: {
        afterHours: number;
        escalateTo: string;
    };
    rtoTriggerConditions: {
        maxAttempts: number;
        maxHours: number;
        autoTrigger: boolean;
    };
}
```

---

## Service Architecture

### Service Layer Design

```mermaid
graph LR
    subgraph "Presentation Layer"
        NDRC[NDR Controller]
        RTOC[RTO Controller]
        PublicC[Public Address Controller]
    end

    subgraph "Application Layer"
        NDRD[NDR Detection Service]
        NDRCLASS[NDR Classification Service]
        NDRRES[NDR Resolution Service]
        RTOS[RTO Service]
        WHS[Warehouse Notification Service]
        NDRANA[NDR Analytics Service]
    end

    subgraph "Integration Layer"
        OpenAIS[OpenAI Service]
        ExotelC[Exotel Client]
        WhatsAppS[WhatsApp Service]
    end

    subgraph "Infrastructure Layer"
        TokenS[Token Service]
        QueueM[Queue Manager]
        Logger[Winston Logger]
    end

    NDRC --> NDRD
    NDRC --> NDRCLASS
    NDRC --> NDRRES
    NDRC --> NDRANA
    NDRCLASS --> OpenAIS
    NDRRES --> ExotelC
    NDRRES --> WhatsAppS
    NDRRES --> RTOS
    RTOS --> WHS
    WHS --> WhatsAppS
    PublicC --> TokenS
    NDRRES --> QueueM
```

### Service Responsibilities

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| **NDRDetectionService** | Detect NDR from tracking updates | NDREvent Model |
| **NDRClassificationService** | Classify NDR using OpenAI | OpenAIService |
| **NDRResolutionService** | Execute resolution workflows | NDRActionExecutors, QueueManager |
| **RTOService** | Manage return to origin | RTOEvent, WarehouseNotificationService |
| **WarehouseNotificationService** | Notify warehouses | WhatsAppService |
| **NDRAnalyticsService** | Generate metrics and reports | NDREvent, RTOEvent |
| **TokenService** | Generate/verify magic link tokens | JWT |

---

## Workflow Engine

### NDR Detection Flow

```mermaid
sequenceDiagram
    participant Courier as Courier API
    participant Webhook as Webhook Handler
    participant Detection as NDR Detection Service
    participant Classification as NDR Classification Service
    participant Resolution as NDR Resolution Service
    participant Queue as BullMQ Queue

    Courier->>Webhook: Tracking Update (failed_delivery)
    Webhook->>Detection: detectNDRFromTracking()
    Detection->>Detection: Check if NDR status
    Detection->>Detection: Check for duplicates (24h)
    Detection->>Detection: Create NDR Event
    Detection->>Classification: classifyAndUpdate()
    Classification->>OpenAI: Classify reason
    OpenAI-->>Classification: Category + Explanation
    Classification->>Classification: Update NDR type
    Classification->>Resolution: executeResolutionWorkflow()
    Resolution->>Resolution: Load workflow for type
    Resolution->>Queue: Schedule first action
    Queue-->>Resolution: Action queued
```

### Resolution Workflow Execution

```mermaid
flowchart TD
    Start([NDR Detected]) --> LoadWorkflow[Load NDR Workflow]
    LoadWorkflow --> CheckStatus{Status = Resolved?}
    CheckStatus -->|Yes| End([Stop Workflow])
    CheckStatus -->|No| GetNextAction[Get Next Action by Sequence]
    GetNextAction --> CheckDelay{Delay > 0?}
    CheckDelay -->|Yes| ScheduleAction[Schedule Action with Delay]
    CheckDelay -->|No| ExecuteAction[Execute Action Immediately]
    ScheduleAction --> Queue[Add to BullMQ]
    ExecuteAction --> ActionType{Action Type}
    ActionType -->|call_customer| CallAction[Exotel Call]
    ActionType -->|send_whatsapp| WhatsAppAction[WhatsApp Message]
    ActionType -->|update_address| AddressAction[Send Magic Link]
    ActionType -->|trigger_rto| RTOAction[Initiate RTO]
    CallAction --> RecordResult[Record Action Result]
    WhatsAppAction --> RecordResult
    AddressAction --> RecordResult
    RTOAction --> RecordResult
    RecordResult --> CheckResolved{NDR Resolved?}
    CheckResolved -->|Yes| End
    CheckResolved -->|No| CheckMore{More Actions?}
    CheckMore -->|Yes| GetNextAction
    CheckMore -->|No| CheckDeadline{Deadline Expired?}
    CheckDeadline -->|Yes| AutoRTO[Auto-Trigger RTO]
    CheckDeadline -->|No| Wait[Wait for Next Action]
    AutoRTO --> End
```

### Address Update Flow

```mermaid
sequenceDiagram
    participant Customer
    participant WhatsApp
    participant PublicAPI as Public API
    participant TokenService
    participant Shipment as Shipment Model
    participant Warehouse as Warehouse Service
    participant NDR as NDR Event

    WhatsApp->>Customer: Magic link message
    Customer->>PublicAPI: GET /public/update-address/:token
    PublicAPI->>TokenService: verifyToken()
    TokenService-->>PublicAPI: {shipmentId, ndrEventId}
    PublicAPI->>Shipment: Load shipment details
    Shipment-->>PublicAPI: Current address
    PublicAPI-->>Customer: Address form
    Customer->>PublicAPI: POST new address
    PublicAPI->>Shipment: Update delivery address
    PublicAPI->>NDR: Record address_updated action
    PublicAPI->>Warehouse: notifyAddressChanged()
    PublicAPI->>TokenService: invalidateToken()
    PublicAPI->>WhatsApp: Send confirmation
    WhatsApp-->>Customer: "Address updated ✓"
```

---

## OpenAI Integration

### Classification Prompt Structure

```
System: You are an expert logistics analyst. Classify delivery failures into categories.

User: 
Raw NDR Reason: "{ndrReason}"
Courier Remarks: "{courierRemarks}"

Categories:
1. address_issue - Wrong/incomplete address
2. customer_unavailable - Customer not reachable
3. refused - Customer refused delivery
4. payment_issue - COD/payment problems
5. other - Any other reason

Respond with ONLY:
Category: <category_name>
Explanation: <one sentence>
```

### Fallback Logic

```mermaid
flowchart TD
    Start([Classify NDR]) --> CallOpenAI[Call OpenAI API]
    CallOpenAI --> Success{API Success?}
    Success -->|Yes| ParseResponse[Parse Category]
    Success -->|No| Fallback[Keyword Matching Fallback]
    
    ParseResponse --> Valid{Valid Category?}
    Valid -->|Yes| SaveClassification[Save Classification]
    Valid -->|No| Fallback
    
    Fallback --> CheckKeywords{Check Keywords}
    CheckKeywords -->|address| Address[address_issue]
    CheckKeywords -->|unavailable| Unavailable[customer_unavailable]
    CheckKeywords -->|refused| Refused[refused]
    CheckKeywords -->|cod/payment| Payment[payment_issue]
    CheckKeywords -->|none match| Other[other]
    
    Address --> SaveClassification
    Unavailable --> SaveClassification
    Refused --> SaveClassification
    Payment --> SaveClassification
    Other --> SaveClassification
    
    SaveClassification --> End([Classification Complete])
```

---

## Background Jobs

### NDR Resolution Job Architecture

```mermaid
graph TB
    subgraph "BullMQ Queue"
        Queue[ndr-resolution Queue]
    end

    subgraph "Job Processor"
        Processor[NDR Resolution Job Processor]
        Execute[Execute Scheduled Action]
        Record[Record Action Result]
        Schedule[Schedule Next Action]
    end

    subgraph "External Services"
        Exotel[Exotel API]
        WhatsApp[WhatsApp API]
    end

    Queue -->|Job Data| Processor
    Processor --> Execute
    Execute -->|call_customer| Exotel
    Execute -->|send_whatsapp| WhatsApp
    Execute --> Record
    Record --> Schedule
    Schedule -->|Delay| Queue
```

### Job Configuration

```typescript
// Job Options
{
  jobId: `ndr-action-${ndrEventId}-${sequence}`,
  delay: delayMinutes * 60 * 1000,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000
  },
  removeOnComplete: false,
  removeOnFail: false
}
```

---

## API Design

### RESTful Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/ndr/events` | List NDR events |
| GET | `/api/v1/ndr/events/:id` | Get NDR details |
| POST | `/api/v1/ndr/events/:id/resolve` | Manual resolution |
| POST | `/api/v1/ndr/events/:id/escalate` | Escalate NDR |
| GET | `/api/v1/ndr/analytics/stats` | Get statistics |
| GET | `/api/v1/rto/events` | List RTO events |
| POST | `/api/v1/rto/trigger` | Manual RTO trigger |
| GET | `/public/update-address/:token` | Address update form |
| POST | `/public/update-address/:token` | Submit address update |

### Response Format

```typescript
// Success Response
{
  success: true,
  data: T,
  pagination?: {
    total: number,
    page: number,
    limit: number,
    pages: number
  }
}

// Error Response
{
  success: false,
  error: string, // Error code
  message: string // User-friendly message
}
```

---

## Scalability

### Horizontal Scaling

```mermaid
graph TB
    LB[Load Balancer]
    
    subgraph "API Instances"
        API1[API Server 1]
        API2[API Server 2]
        API3[API Server 3]
    end
    
    subgraph "Worker Instances"
        Worker1[BullMQ Worker 1]
        Worker2[BullMQ Worker 2]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB Replica Set)]
        Redis[(Redis Cluster)]
    end
    
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> MongoDB
    API2 --> MongoDB
    API3 --> MongoDB
    
    API1 --> Redis
    API2 --> Redis
    API3 --> Redis
    
    Worker1 --> Redis
    Worker2 --> Redis
    Worker1 --> MongoDB
    Worker2 --> MongoDB
```

### Performance Optimizations

1. **Database Indexes:**
   - `ndrevents`: `{ companyId: 1, status: 1, detectedAt: -1 }`
   - `rtoevents`: `{ company: 1, returnStatus: 1 }`
   - `ndrevents`: `{ resolutionDeadline: 1, status: 1 }` (for deadline checks)

2. **Caching Strategy:**
   - Workflow definitions (1 hour TTL)
   - Company settings (30 minutes TTL)
   - Analytics aggregations (5 minutes TTL)

3. **Queue Concurrency:**
   - NDR resolution: 5 concurrent jobs per worker
   - Deadline checks: 1 job at a time
   - Can scale to 10+ workers

---

## Security

### Authentication & Authorization

- **API Endpoints:** JWT-based authentication
- **Public Endpoints:** Token-based (magic links)
- **Admin Endpoints:** Role-based access control

### Token Security

```typescript
// Magic Link Token
{
  shipmentId: string,
  ndrEventId?: string,
  purpose: 'address_update',
  iss: 'shipcrowd',
  sub: 'address-update',
  exp: 48 hours
}
```

- Tokens expire in 48 hours
- One-time use (invalidated after submission)
- Stored in Redis for quick invalidation checks

### Data Protection

- **PII Encryption:** Customer phone/email encrypted at rest
- **API Rate Limiting:** 100 requests/minute per company
- **Webhook Signature Verification:** HMAC-SHA256 signatures
- **Input Validation:** Joi schemas for all endpoints

---

## Monitoring & Observability

### Key Metrics

```mermaid
graph LR
    subgraph "NDR Metrics"
        NDRRate[NDR Rate %]
        ResolutionRate[Resolution Rate %]
        AvgTime[Avg Resolution Time]
    end
    
    subgraph "RTO Metrics"
        RTORate[RTO Rate %]
        RTOCharges[Total RTO Charges]
        QCPass[QC Pass Rate %]
    end
    
    subgraph "System Metrics"
        APILatency[API Response Time]
        JobLatency[Job Processing Time]
        ErrorRate[Error Rate %]
    end
```

### Logging

- **Winston Logger** with structured JSON logging
- Log levels: error, warn, info, debug
- Correlation IDs for request tracing
- Integration with ELK/DataDog/Sentry

---

**Version:** 1.0.0  
**Last Updated:** 2026-01-01
