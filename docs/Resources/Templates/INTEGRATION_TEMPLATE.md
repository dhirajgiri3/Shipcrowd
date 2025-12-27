# Third-Party Integration Documentation Template

## Integration Overview

| Property | Value |
|----------|-------|
| **Service Name** | Provider Name |
| **API Version** | v1.0 |
| **Base URL** | `https://api.provider.com/v1` |
| **Documentation** | [Link to official docs] |
| **Status** | Active / Planned / Deprecated |

## Purpose

What this integration provides and why we use it.

---

## Authentication

### Method

- [ ] API Key
- [ ] OAuth 2.0
- [ ] Basic Auth
- [ ] JWT

### Credentials

| Credential | Environment Variable | Where to Obtain |
|------------|---------------------|-----------------|
| API Key | `PROVIDER_API_KEY` | Provider dashboard |
| API Secret | `PROVIDER_API_SECRET` | Provider dashboard |

### Example Header

```http
Authorization: Bearer YOUR_API_KEY
X-API-Secret: YOUR_SECRET
```

---

## Endpoints

### 1. Create Resource

| Property | Value |
|----------|-------|
| **Method** | POST |
| **Endpoint** | `/resources` |
| **Rate Limit** | 100/min |

**Request:**

```json
{
  "field1": "value",
  "field2": 123
}
```

**Response (200):**

```json
{
  "id": "res_123",
  "status": "created",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Errors:**

| Code | Reason | Action |
|------|--------|--------|
| 400 | Invalid input | Validate request |
| 401 | Auth failed | Check credentials |
| 429 | Rate limited | Retry with backoff |

---

### 2. Get Resource

| Property | Value |
|----------|-------|
| **Method** | GET |
| **Endpoint** | `/resources/{id}` |
| **Rate Limit** | 500/min |

*... continue for each endpoint ...*

---

## TypeScript Interfaces

```typescript
// Request DTOs
interface CreateResourceRequest {
  field1: string;
  field2: number;
}

// Response DTOs
interface ResourceResponse {
  id: string;
  status: string;
  created_at: string;
}

// Error Response
interface ProviderError {
  error_code: string;
  error_message: string;
}
```

---

## Error Handling

### Error Code Mapping

| Provider Code | HTTP Status | Our Error | Action |
|---------------|-------------|-----------|--------|
| `INVALID_REQUEST` | 400 | ValidationError | Show field errors |
| `UNAUTHORIZED` | 401 | AuthError | Refresh credentials |
| `NOT_FOUND` | 404 | NotFoundError | Resource deleted |
| `RATE_LIMITED` | 429 | RateLimitError | Retry later |
| `SERVER_ERROR` | 500 | ExternalError | Alert, retry |

### Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // ms
  maxDelay: 10000,    // ms
  backoffMultiplier: 2,
};
```

### Fallback Behavior

When the service is unavailable:
1. Queue request for later processing
2. Notify admin
3. Return user-friendly error

---

## Webhook Handling

### Webhook URL

`POST /api/v1/webhooks/provider`

### Signature Verification

```typescript
const isValid = verifyWebhookSignature(
  request.headers['x-provider-signature'],
  request.body,
  process.env.PROVIDER_WEBHOOK_SECRET
);
```

### Event Types

| Event | Trigger | Action |
|-------|---------|--------|
| `resource.created` | Resource created | Update local DB |
| `resource.updated` | Status changed | Sync status |
| `resource.failed` | Operation failed | Alert user |

---

## Testing

### Mocking

File: `tests/mocks/provider.mock.ts`

```typescript
export const createProviderMockClient = () => ({
  createResource: jest.fn().mockResolvedValue({ id: 'mock_123' }),
  getResource: jest.fn().mockResolvedValue({ status: 'active' }),
});
```

### Sandbox Environment

| Environment | Base URL |
|-------------|----------|
| Sandbox | `https://sandbox.api.provider.com/v1` |
| Production | `https://api.provider.com/v1` |

### Test Credentials

```bash
# .env.test
PROVIDER_API_KEY=test_key_xxx
PROVIDER_API_SECRET=test_secret_xxx
```

---

## Monitoring

### Metrics to Track

| Metric | Alert Threshold |
|--------|----------------|
| Success Rate | < 95% |
| Average Latency | > 2000ms |
| Error Rate | > 1% |

### Logging

```typescript
logger.info('Provider API call', {
  endpoint: '/resources',
  method: 'POST',
  duration: 234,
  status: 200,
});

// Sensitive data masking
logger.info('Request', {
  apiKey: maskString(apiKey), // "sk_***xyz"
});
```

---

## Security Considerations

- [ ] Credentials stored in environment variables
- [ ] HTTPS only
- [ ] Webhook signature verification
- [ ] IP whitelisting (if supported)
- [ ] Audit logging enabled

---

## Implementation Checklist

- [ ] Create client service class
- [ ] Implement all endpoints
- [ ] Add error handling
- [ ] Create TypeScript interfaces
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Create mock for testing
- [ ] Add to Postman collection
- [ ] Document in this file
- [ ] Set up monitoring

---

**Last Updated:** YYYY-MM-DD  
**Maintainer:** Development Team
