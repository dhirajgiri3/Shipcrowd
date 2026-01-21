# Fraud Detection Module

**Status**: Standalone, not integrated into main application flow. Ready for future activation.

## Overview

Complete fraud detection system for Helix that provides real-time risk assessment for orders using:

- **Pattern Matching**: Rule-based fraud detection with configurable thresholds
- **Blacklist Verification**: Check against phone, email, address, and IP blacklists
- **Velocity Analysis**: Detect high-frequency ordering attempts
- **AI Analysis**: Optional GPT-4 powered fraud assessment
- **Alert Generation**: Create and track fraud alerts with investigation workflow

## Architecture

```
fraud/
├── fraud-detection.service.ts      # Core fraud detection engine
├── openai-fraud.service.ts         # AI-powered analysis (optional)
├── fraud-utils.ts                  # Utility functions and helpers
└── index.ts                        # Module exports
```

### Database Models

Connected to the following Mongoose models (not part of this module):

- `FraudAlert`: Tracks generated fraud alerts
- `FraudRule`: Configurable fraud detection rules
- `Blacklist`: Manages blocked entities (phone, email, address, IP)
- `Order`: Links to order data

## Key Features

### 1. Order Analysis

Comprehensive fraud risk assessment with multiple scoring layers:

```typescript
const result = await FraudDetectionService.analyzeOrder({
    companyId: 'company123',
    customerId: 'customer456',
    customerDetails: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+91 98765 43210',
        address: '123 Main St, City, State'
    },
    orderValue: 5000,
    codAmount: 5000,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
});
```

### 2. Risk Scoring System

**Total Score Breakdown (0-100)**:
- Blacklist matches: 0-30 points
- Pattern matches: 0-40 points
- Velocity checks: 0-20 points
- AI analysis: 0-10 points

**Risk Levels**:
- `low` (0-25): Safe to process
- `medium` (26-50): Review required
- `high` (51-75): Immediate review needed
- `critical` (76-100): Block immediately

**Recommendations**:
- `low` → `approve`
- `medium` → `review`
- `high` → `review`
- `critical` → `block`

### 3. Pattern Detection

Configurable rules for detecting fraud patterns:

#### Value Patterns
- High COD amounts for new accounts
- Unusual order values
- Threshold-based detection

#### Address Patterns
- Multiple orders to same address (24-hour window)
- Suspicious delivery locations
- High-frequency address usage

#### Phone Patterns
- Multiple accounts with same phone number
- Suspicious phone patterns
- Rapid phone registration

#### Behavioral Patterns
- Purchase frequency changes
- Item category anomalies
- Delivery location patterns
- Order timing patterns (future enhancement)

### 4. Blacklist Management

```typescript
// Add to blacklist
await FraudDetectionService.addToBlacklist({
    type: 'phone',
    value: '+91 98765 43210',
    reason: 'Multiple fraud attempts',
    severity: 'high',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    createdBy: 'admin123'
});

// Remove from blacklist
await FraudDetectionService.removeFromBlacklist(blacklistId);
```

**Blacklist Types**:
- `phone`: Phone number blocks
- `email`: Email address blocks
- `address`: Delivery address blocks
- `ip`: IP address blocks

### 5. Alert Generation

```typescript
const alert = await FraudDetectionService.createAlert(
    orderId,
    analysisResult,
    orderData
);
```

Generated alerts include:
- Alert ID (FRD-YYYYMMDD-XXXXX)
- Risk level and fraud score
- Matched rules and blacklist entries
- AI analysis summary (if available)
- Order metadata and snapshot
- Investigation workflow support

## Utility Functions

### Risk Assessment Utilities

```typescript
import {
    isValidFraudScore,
    getRiskLevelColor,
    getRiskLevelSeverity,
    getRiskDescription,
    getActionLabel
} from '@/core/application/services/fraud';

const color = getRiskLevelColor('critical'); // #991b1b
const severity = getRiskLevelSeverity('high'); // 2
const description = getRiskDescription('medium');
const action = getActionLabel('review');
```

### Data Normalization

```typescript
import {
    normalizePhone,
    normalizeEmail,
    normalizeAddress,
    normalizeIP
} from '@/core/application/services/fraud';

const normalized = normalizePhone('+91 98765 43210'); // '919876543210'
```

### Validation Utilities

```typescript
import {
    isValidEmail,
    isValidPhone,
    isSuspiciousValue,
    isValidFraudScore
} from '@/core/application/services/fraud';

isValidEmail('john@example.com'); // true
isValidPhone('+91 98765 43210'); // true
isSuspiciousValue(15000, 5000); // true (3x baseline)
```

### Analysis Utilities

```typescript
import {
    calculateVelocityScore,
    calculateAverageScore,
    batchCalculateRiskLevel,
    createInvestigationSummary
} from '@/core/application/services/fraud';

const velocityScore = calculateVelocityScore(8, 60); // 8 orders/hour
const avgScore = calculateAverageScore([20, 45, 30]);
const riskLevels = batchCalculateRiskLevel([20, 50, 80]);
const summary = createInvestigationSummary('high', 2, 1, true);
```

## Configuration

### Environment Variables

```env
# OpenAI Integration (Optional)
OPENAI_FRAUD_ENABLED=false           # Enable/disable AI analysis
OPENAI_API_KEY=sk-...                # OpenAI API key
OPENAI_MODEL=gpt-4                   # Model to use

# Fraud Detection Thresholds
FRAUD_VELOCITY_LIMIT=5               # Orders per hour threshold
```

## AI Integration (Optional)

The module supports optional AI-powered fraud analysis using OpenAI GPT-4:

```typescript
import { OpenAIFraudService } from '@/core/application/services/fraud';

const assessment = await OpenAIFraudService.analyzeOrder({
    customerName: 'John Doe',
    email: 'john@example.com',
    phone: '+91 98765 43210',
    address: '123 Main St',
    orderValue: 5000,
    codAmount: 5000,
    customerHistory: {
        totalOrders: 0,
        accountAge: 0,
        previousFlags: 0
    }
});

// Returns:
// {
//   summary: "New customer with high COD amount",
//   indicators: ["New account", "High value", "COD payment"],
//   recommendation: "review",
//   confidence: 0.75,
//   reasoning: "First-time customer with significant COD order"
// }
```

## Response Format

```typescript
interface IFraudAnalysisResult {
    // Risk Assessment
    score: number;                      // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendation: 'approve' | 'review' | 'block';

    // Detection Details
    matchedRules: Array<{
        ruleId: string;
        ruleName: string;
        weight: number;
    }>;

    blacklistMatches: Array<{
        type: string;
        value: string;
    }>;

    // Score Breakdown
    details: {
        patternScore: number;           // 0-40
        blacklistScore: number;         // 0-30
        velocityScore: number;          // 0-20
        aiScore?: number;               // 0-10
    };

    // Optional AI Analysis
    aiAnalysis?: {
        summary: string;
        indicators: string[];
        recommendation: 'approve' | 'review' | 'block';
        confidence: number;             // 0-1
    };
}
```

## Error Handling

All methods include comprehensive error handling and logging:

```typescript
try {
    const result = await FraudDetectionService.analyzeOrder(data);
} catch (error) {
    logger.error('Fraud analysis failed', {
        error: error instanceof Error ? error.message : String(error),
    });
}
```

Errors are logged with context but don't block order processing (graceful degradation).

## Performance Considerations

- Blacklist checks: O(1) with database indexes
- Pattern matching: Optimized with active rule filtering
- Velocity checks: Efficient MongoDB countDocuments
- AI analysis: Optional and cached when possible

## Future Enhancements

### Planned Features
- [ ] Machine learning model integration
- [ ] Historical pattern analysis
- [ ] Geographic fraud patterns
- [ ] Device fingerprinting
- [ ] Multi-channel fraud detection
- [ ] Real-time threat intelligence integration
- [ ] Custom rule builder UI
- [ ] Advanced reporting dashboard

### Behavioral Analysis (Placeholder)
Current implementation is a placeholder for future enhancement:
```typescript
// Future: Implement behavioral analysis
private static async checkBehavioralPattern(
    rule: IFraudRule,
    data: IOrderAnalysisInput
): Promise<boolean> {
    // To be implemented:
    // - Purchase frequency changes
    // - Item category pattern anomalies
    // - Delivery location changes
    // - Order timing patterns
    // - Customer return rate analysis
    return false;
}
```

## Testing

### Unit Tests
```typescript
describe('FraudDetectionService', () => {
    it('should analyze order for fraud risk', async () => {
        const result = await FraudDetectionService.analyzeOrder({
            companyId: 'test-company',
            customerDetails: {
                name: 'Test User',
                phone: '+91 98765 43210',
                address: 'Test Address'
            },
            orderValue: 5000
        });

        expect(result.score).toBeLessThanOrEqual(100);
        expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
    });
});
```

## Integration Points (For Future)

When integrating into the main application:

1. **Order Processing**: Call before order confirmation
2. **Customer Registration**: Check customer creation
3. **Payment Processing**: Validate before payment acceptance
4. **Admin Dashboard**: Display fraud alerts and metrics
5. **Webhook Events**: Send alerts to fraud team
6. **Reporting**: Generate fraud statistics reports

## Database Indexes

Required indexes for optimal performance:

```javascript
// On FraudAlert collection
db.fraudalerts.createIndex({ "createdAt": -1 });
db.fraudalerts.createIndex({ "riskLevel": 1, "status": 1 });
db.fraudalerts.createIndex({ "companyId": 1, "createdAt": -1 });

// On Blacklist collection
db.blacklists.createIndex({ "type": 1, "normalizedValue": 1 }, { unique: true });
db.blacklists.createIndex({ "expiresAt": 1 }, { sparse: true });
db.blacklists.createIndex({ "isPermanent": 1 });

// On FraudRule collection
db.fraudrules.createIndex({ "active": 1, "type": 1 });
db.fraudrules.createIndex({ "priority": -1 });
```

## Migration Guide

When ready to activate the module:

1. Create fraud detection rules in FraudRule collection
2. Configure environment variables
3. Set up blacklist entries if needed
4. Add API endpoints to routes
5. Integrate with order processing workflow
6. Add frontend alerts display
7. Configure fraud team notifications

## Support & Maintenance

This is a standalone, production-ready module that can be activated without impacting other systems. All dependencies are properly isolated and error handling is comprehensive.

For questions or enhancements, refer to the code documentation and type definitions.
