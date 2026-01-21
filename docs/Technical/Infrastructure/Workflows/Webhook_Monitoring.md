# Velocity Webhook Monitoring & Metrics Setup

## Overview

This document outlines the monitoring and metrics collection setup for Velocity Shipfast webhooks.

## Architecture

```
┌─────────────────┐
│  Velocity API   │
└────────┬────────┘
         │ Webhook POST
         ▼
┌─────────────────────────────┐
│  Signature Verification     │
│  - HMAC-SHA256              │
│  - Timestamp validation     │
│  - Replay attack protection │
└────────┬────────────────────┘
         │ Verified
         ▼
┌─────────────────────────────┐
│  Webhook Controller         │
│  - Metrics tracking         │
│  - Event routing            │
│  - Error handling           │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Webhook Service            │
│  - Status mapping           │
│  - Shipment update          │
│  - Special handling         │
└────────┬────────────────────┘
         │
         ├─── Success ───────► 200 OK
         │
         └─── Failure ───────► Retry Service
                                     │
                                     ▼
                              Dead Letter Queue
```

## Metrics Collection

### Built-in Metrics

The webhook controller tracks the following metrics:

1. **Total Received**: Total number of webhooks received
2. **Successful Processed**: Successfully processed webhooks
3. **Failed Processed**: Failed webhook processing attempts
4. **Processing Times**: Array of last 100 processing times (ms)
5. **Last Processed At**: Timestamp of last successful processing

### Accessing Metrics

**Endpoint**: `GET /api/v1/webhooks/velocity/metrics`
**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "totalReceived": 1523,
    "successfulProcessed": 1498,
    "failedProcessed": 25,
    "successRate": "98.36%",
    "averageProcessingTimeMs": 142,
    "lastProcessedAt": "2025-01-15T10:30:45.123Z"
  }
}
```

## Dead Letter Queue Monitoring

### Accessing Dead Letter Stats

```typescript
import { WebhookRetryService } from './webhookRetry.service';

const retryService = new WebhookRetryService();
const stats = await retryService.getDeadLetterStats();

console.log(stats);
// {
//   total: 25,
//   pending: 5,
//   retrying: 2,
//   failed: 15,
//   resolved: 3
// }
```

### Querying Dead Letter Queue

```typescript
import WebhookDeadLetter from './models/WebhookDeadLetter';

// Get all failed webhooks from last 24 hours
const recentFailures = await WebhookDeadLetter.find({
  provider: 'velocity-shipfast',
  status: 'failed',
  receivedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
}).sort({ receivedAt: -1 });

// Get webhooks for specific AWB
const webhooksByAwb = await WebhookDeadLetter.find({
  'payload.shipment_data.awb': 'VEL123456789'
});
```

### Manual Retry from Dead Letter Queue

```typescript
import { WebhookRetryService } from './webhookRetry.service';

const retryService = new WebhookRetryService();

// Retry up to 10 failed webhooks
const result = await retryService.retryFromDeadLetterQueue(10);

console.log(result);
// {
//   attempted: 10,
//   successful: 7,
//   failed: 3
// }
```

## Monitoring Best Practices

### 1. Set Up Alerts

Monitor these critical metrics:

- **Success Rate** < 95% → Alert
- **Average Processing Time** > 1000ms → Warning
- **Dead Letter Queue Size** > 50 → Alert
- **No webhooks received** for 6+ hours → Alert (for active shipments)

### 2. Regular Dead Letter Queue Cleanup

```typescript
// Scheduled job (daily at 2 AM)
import cron from 'node-cron';
import WebhookDeadLetter from './models/WebhookDeadLetter';

cron.schedule('0 2 * * *', async () => {
  // Archive resolved webhooks older than 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await WebhookDeadLetter.deleteMany({
    status: 'resolved',
    resolvedAt: { $lt: thirtyDaysAgo }
  });

  // Retry failed webhooks once per day
  const retryService = new WebhookRetryService();
  await retryService.retryFromDeadLetterQueue(50);
});
```

### 3. Health Check Monitoring

**Endpoint**: `GET /api/v1/webhooks/velocity/health`

Use this endpoint for uptime monitoring (Pingdom, UptimeRobot, etc.).

```bash
# Example with curl
curl https://api.Helix.com/api/v1/webhooks/velocity/health

# Expected response:
{
  "success": true,
  "message": "Velocity webhook endpoint is healthy",
  "timestamp": "2025-01-15T10:30:45.123Z"
}
```

### 4. Logging Strategy

All webhook events are logged with structured data:

```typescript
// Successful processing
logger.info('Webhook processed successfully', {
  awb: 'VEL123456789',
  orderId: 'ORD-001',
  oldStatus: 'created',
  newStatus: 'picked_up',
  processingTimeMs: 142
});

// Failed processing
logger.error('Error processing webhook', {
  error: error.message,
  awb: 'VEL123456789',
  payload: webhookPayload,
  processingTimeMs: 89
});

// Security warnings
logger.warn('Webhook rejected: Invalid signature', {
  eventType: 'SHIPMENT_STATUS_UPDATE',
  receivedSignature: 'abc123...',
  expectedSignature: 'def456...'
});
```

## Dashboard Queries

### MongoDB Aggregation for Dashboard

```typescript
// Get webhook statistics by event type
const statsByEventType = await WebhookDeadLetter.aggregate([
  {
    $match: {
      provider: 'velocity-shipfast',
      receivedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: '$eventType',
      total: { $sum: 1 },
      failed: {
        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
      },
      avgAttempts: { $avg: '$processingAttempts' }
    }
  }
]);

// Get hourly webhook volume
const hourlyVolume = await WebhookDeadLetter.aggregate([
  {
    $match: {
      provider: 'velocity-shipfast',
      receivedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  },
  {
    $group: {
      _id: {
        $dateToString: { format: '%Y-%m-%d %H:00', date: '$receivedAt' }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## Integration with APM Tools

### New Relic

```typescript
// In webhook controller
import newrelic from 'newrelic';

export const handleVelocityWebhook = async (req, res, next) => {
  const transaction = newrelic.getTransaction();
  transaction.name = 'WebhookController/velocity/statusUpdate';

  newrelic.addCustomAttributes({
    awb: payload.shipment_data.awb,
    eventType: payload.event_type,
    statusCode: payload.shipment_data.status_code
  });

  // ... processing logic
};
```

### Datadog

```typescript
// In webhook service
import { StatsD } from 'node-dogstatsd';

const dogstatsd = new StatsD();

// Increment webhook counter
dogstatsd.increment('velocity.webhook.received', 1, {
  event_type: payload.event_type
});

// Track processing time
dogstatsd.histogram('velocity.webhook.processing_time', processingTime, {
  event_type: payload.event_type,
  success: result.success.toString()
});
```

## Troubleshooting

### High Failure Rate

1. Check dead letter queue for error patterns
2. Verify Shipment model status mapping
3. Check database connection health
4. Review recent code changes

### Slow Processing Times

1. Check database query performance
2. Review Shipment.findOne() index usage
3. Monitor MongoDB connection pool
4. Check for N+1 query issues

### Missing Webhooks

1. Verify webhook URL with Velocity Shipfast
2. Check signature verification settings
3. Review firewall/security group rules
4. Test webhook endpoint health

## Security Monitoring

### Suspicious Activity Indicators

Monitor for:

1. **Multiple Invalid Signatures**: Potential attack attempt
2. **Replay Attacks**: Same timestamp used multiple times
3. **Unusual Event Types**: Unknown event_type values
4. **Volume Spikes**: Unusual increase in webhook volume

### Security Alerts

```typescript
// Track failed signature verifications
let failedVerifications = 0;

if (!isValid) {
  failedVerifications++;

  if (failedVerifications > 10) {
    // Alert security team
    logger.error('SECURITY ALERT: Multiple webhook signature failures', {
      count: failedVerifications,
      sourceIP: req.ip
    });
  }
}
```

## Performance Benchmarks

Target metrics for production:

- **Success Rate**: > 99%
- **Average Processing Time**: < 200ms
- **P95 Processing Time**: < 500ms
- **P99 Processing Time**: < 1000ms
- **Dead Letter Queue Size**: < 10 items

## Recommended Monitoring Stack

1. **Metrics**: Prometheus + Grafana
2. **Logging**: Winston + ELK Stack (Elasticsearch, Logstash, Kibana)
3. **APM**: New Relic or Datadog
4. **Uptime**: Pingdom or UptimeRobot
5. **Alerting**: PagerDuty or Opsgenie

## Next Steps

1. Set up Grafana dashboards for webhook metrics
2. Configure PagerDuty alerts for critical failures
3. Implement automated dead letter queue retry job
4. Create runbook for webhook incident response
5. Set up log aggregation for webhook events
