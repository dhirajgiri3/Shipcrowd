# NDR/RTO System Setup Guide

Complete guide to setting up and configuring the NDR (Non-Delivery Report) and RTO (Return To Origin) automation system.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [OpenAI Configuration](#openai-configuration)
4. [Exotel Integration](#exotel-integration)
5. [WhatsApp Business API](#whatsapp-business-api)
6. [Database Setup](#database-setup)
7. [Background Jobs](#background-jobs)
8. [Testing the System](#testing-the-system)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up the NDR/RTO system, ensure you have:

- ✅ Node.js 18+ installed
- ✅ MongoDB 6+ running
- ✅ Redis 7+ for background jobs (BullMQ)
- ✅ Valid OpenAI API key
- ✅ Exotel account (for automated calls)
- ✅ WhatsApp Business API access
- ✅ Existing Shipcrowd backend running

---

## Environment Variables

Add the following variables to your `.env` file:

```bash
# ============================================
# NDR/RTO Configuration
# ============================================

# OpenAI for NDR Classification
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=100
OPENAI_TEMPERATURE=0.3

# Exotel for Automated Calls
EXOTEL_SID=your_exotel_sid
EXOTEL_API_KEY=your_api_key
EXOTEL_API_TOKEN=your_api_token
EXOTEL_CALLER_ID=0XXXXXXXXXX

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id

# Application Base URL (for magic links)
BASE_URL=https://yourdomain.com

# JWT Secret (for magic link tokens)
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# Background Job Configuration
REDIS_URL=redis://localhost:6379
BULLMQ_CONCURRENCY=5
```

---

## OpenAI Configuration

### 1. Get API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key and add to `.env`

### 2. Choose Model

We recommend `gpt-4o-mini` for cost-effectiveness:

- **gpt-4o-mini**: $0.00015/1K tokens (recommended)
- **gpt-4o**: $0.0050/1K tokens (higher accuracy)
- **gpt-3.5-turbo**: $0.0005/1K tokens (budget option)

### 3. Configure Temperature

- `0.0-0.3`: Deterministic classification (recommended for NDR)
- `0.4-0.7`: Balanced creativity and consistency
- `0.8-1.0`: More creative (not recommended)

### 4. Test OpenAI Integration

```bash
# Run test script
npm run test:openai

# Or test manually
curl -X POST http://localhost:5000/api/v1/test/openai-classify \
  -H "Content-Type: application/json" \
  -d '{
    "ndrReason": "Customer not available at address",
    "courierRemarks": "Phone switched off"
  }'
```

**Expected Response:**
```json
{
  "category": "customer_unavailable",
  "explanation": "Customer was unreachable"
}
```

---

## Exotel Integration

### 1. Sign Up for Exotel

1. Visit [Exotel](https://exotel.com/)
2. Create account and verify business
3. Purchase a virtual number (Caller ID)

### 2. Get API Credentials

1. Navigate to Settings → API Settings
2. Copy:
   - Account SID
   - API Key
   - API Token
3. Add to `.env`

### 3. Test Exotel Connection

```bash
# Test call initiation
npm run test:exotel

# Or manually
curl -X POST https://api.exotel.com/v1/Accounts/{SID}/Calls/connect.json \
  -u {API_KEY}:{API_TOKEN} \
  -d "From={CALLER_ID}&To={PHONE}&Url={IVR_URL}"
```

### 4. IVR Flow Setup (Optional)

Host IVR flow script on your server:

```javascript
// routes/ivr/ndr-resolution.js
app.post('/ivr/ndr-resolution', (req, res) => {
  const response = `
    <Response>
      <Say>Hello, this is Shipcrowd regarding your delivery.</Say>
      <Gather numDigits="1" action="/ivr/ndr-action">
        <Say>Press 1 to reschedule delivery.</Say>
        <Say>Press 2 to update address.</Say>
        <Say>Press 3 to cancel order.</Say>
      </Gather>
    </Response>
  `;
  res.type('text/xml').send(response);
});
```

---

## WhatsApp Business API

### 1. Get WhatsApp Access

**Option A: Meta Business (Official)**
1. Visit [Meta for Developers](https://developers.facebook.com/)
2. Create a Business App
3. Add WhatsApp Product
4. Get Phone Number ID and Access Token

**Option B: Third-Party Provider**
- Twilio WhatsApp API
- MessageBird
- 360Dialog

### 2. Template Messages

Create and get approved message templates:

**NDR Alert Template:**
```
Hello {{customer_name}},

We attempted to deliver your order #{{order_id}} but encountered an issue:
*Reason:* {{ndr_reason}}

*What would you like to do?*
Reply with:
1️⃣ - Reschedule delivery
2️⃣ - Update address
3️⃣ - Cancel order

Need help? Call us: {{support_number}}

-Shipcrowd
```

**RTO Notification Template:**
```
Hello {{customer_name}},

Your order #{{order_id}} is being returned due to {{rto_reason}}.

*Return Details:*
- AWB: {{reverse_awb}}
- Expected return: {{expected_date}}
- RTO charges: ₹{{rto_charges}}

For assistance, contact: {{support_number}}

-Shipcrowd
```

### 3. Test WhatsApp Integration

```bash
# Test message sending
npm run test:whatsapp

# Or manually
curl -X POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "919876543210",
    "type": "text",
    "text": {
      "body": "Test message from Shipcrowd"
    }
  }'
```

---

## Database Setup

### 1. Seed Default Workflows

Run the seed script to create default NDR workflows:

```bash
# Via npm script
npm run seed:ndr-workflows

# Or via API
curl -X POST http://localhost:5000/api/v1/ndr/workflows/seed \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Default workflows seeded successfully",
  "data": {
    "created": 5
  }
}
```

### 2. Create Indexes

Indexes are automatically created by Mongoose schemas, but verify:

```javascript
// MongoDB shell
db.ndrevents.getIndexes()
db.rtoevents.getIndexes()
```

### 3. Verify Collections

```javascript
// Check collections exist
show collections
// Should include: ndrevents, rtoevents, ndrworkflows, calllogs
```

---

## Background Jobs

### 1. Start Redis

```bash
# Mac (Homebrew)
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -p 6379:6379 redis:7-alpine
```

### 2. Initialize NDR Jobs

Add to your `server.ts` or `index.ts`:

```typescript
import NDRResolutionJob from './infrastructure/jobs/NDRResolutionJob';

// After Express app setup
async function startServer() {
  // ... existing setup

  // Initialize NDR resolution job
  await NDRResolutionJob.initialize();
  
  console.log('✅ NDR Resolution background job initialized');
  
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
```

### 3. Monitor Jobs

```bash
# View BullMQ dashboard (if installed)
npm run bulls:ui

# Or check Redis directly
redis-cli
> KEYS bull:ndr-resolution:*
```

---

## Testing the System

### 1. Create Test NDR Event

```bash
curl -X POST http://localhost:5000/api/v1/test/create-ndr \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "test_ship_123",
    "ndrReason": "Customer not available",
    "courierRemarks": "Phone unreachable"
  }'
```

###  2. Verify NDR Detection

Run tracking update simulation:

```bash
curl -X POST http://localhost:5000/api/v1/shipments/test_ship_123/tracking \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "failed_delivery",
    "remarks": "Customer not available at address",
    "location": "Mumbai",
    "timestamp": "2026-01-01T10:30:00Z"
  }'
```

**Expected:** NDR event auto-created, classified via OpenAI, workflow triggered

### 3. Test Address Update Magic Link

```bash
# Generate magic link
curl -X POST http://localhost:5000/api/v1/test/generate-address-link \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"shipmentId": "test_ship_123"}'

# Response includes token, test accessing public endpoint
curl -X GET http://localhost:5000/public/update-address/{TOKEN}
```

### 4. Test RTO Trigger

```bash
curl -X POST http://localhost:5000/api/v1/rto/trigger \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "test_ship_123",
    "reason": "ndr_unresolved"
  }'
```

---

## Troubleshooting

### OpenAI Issues

**Error: "Invalid API key"**
```bash
# Verify key format (should start with sk-proj-)
echo $OPENAI_API_KEY

# Test directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Error: "Rate limit exceeded"**
- Solution: Upgrade OpenAI plan or reduce classification frequency

**Fallback not working**
- Check logs: Should show "OpenAI failed, using fallback classification"
- Verify keyword matching logic in `NDRClassificationService.ts`

### Exotel Issues

**Error: "Authentication failed"**
```bash
# Test credentials
curl -u {API_KEY}:{API_TOKEN} \
  https://api.exotel.com/v1/Accounts/{SID}
```

**Calls not connecting**
- Verify Caller ID is active and approved
- Check phone number format (+91XXXXXXXXXX)
- Ensure sufficient Exotel balance

### WhatsApp Issues

**Error: "Template not approved"**
- Submit template for Meta approval (can take 24-48 hours)
- Use exact template name in API calls

**Messages not sending**
- Verify recipient opted in to WhatsApp Business
- Check phone number format (no special characters)
- Review message template parameters

### Background Job Issues

**Jobs not processing**
```bash
# Check Redis connection
redis-cli ping
# Should return: PONG

# Check BullMQ queues
redis-cli KEYS "bull:*"
```

**Jobs stuck in waiting**
- Restart worker: `npm run worker:restart`
- Check Redis memory: `redis-cli INFO memory`
- Increase concurrency in `.env`

### Database Issues

**NDR events not created**
```bash
# Check MongoDB connection
mongosh
> use shipcrowd
> db.ndrevents.countDocuments()
```

**Workflows not found**
- Run seed script: `npm run seed:ndr-workflows`
- Verify `isDefault: true` for at least one workflow per type

---

## Production Checklist

Before deploying to production:

- [ ] All environment variables configured
- [ ] OpenAI API key with sufficient credits
- [ ] Exotel account verified and funded
- [ ] WhatsApp templates approved by Meta
- [ ] Redis configured with persistence
- [ ] MongoDB indexes created
- [ ] Default workflows seeded
- [ ] Background jobs initialized
- [ ] Monitoring/alerts configured
- [ ] Rate limiting enabled
- [ ] Error tracking setup (Sentry/DataDog)
- [ ] Load testing completed

---

## Support

For issues or questions:

- **Documentation:** `/docs`
- **API Reference:** `/docs/api`
- **Architecture:** `/docs/architecture/ndr-rto-system.md`
- **GitHub Issues:** Report bugs and feature requests

---

**Last Updated:** 2026-01-01  
**Version:** 1.0.0
