# Phase 1 Integration Guide

Complete guide for integrating all Phase 1 utilities into your Express application.

---

## 1. Install Dependencies

```bash
cd server
npm install helmet express-rate-limit rate-limit-redis cors redis
npm install -D @types/cors
```

---

## 2. Update app.ts - Security Middleware

Add security middleware early in the middleware chain:

```typescript
import express from 'express';
import { configureHelmet, configureHelmetDev } from './shared/config/helmet.config';
import { configureCORS, configureCORSDev } from './shared/config/cors.config';
import {
    initializeRateLimitRedis,
    globalRateLimiter,
} from './shared/config/rateLimit.config';

const app = express();

// Initialize Redis for rate limiting (optional)
await initializeRateLimitRedis();

// Security headers
if (process.env.NODE_ENV === 'production') {
    configureHelmet(app);
    configureCORS(app);
} else {
    configureHelmetDev(app);
    configureCORSDev(app);
}

// Global rate limiting
app.use(globalRateLimiter);

// ... rest of middleware
```

---

## 3. Apply Rate Limiting to Routes

```typescript
import {
    authRateLimiter,
    apiRateLimiter,
    uploadRateLimiter,
} from './shared/config/rateLimit.config';

// Auth routes - strict rate limiting
app.use('/api/v1/auth/login', authRateLimiter);
app.use('/api/v1/auth/register', authRateLimiter);
app.use('/api/v1/auth/reset-password', authRateLimiter);

// API routes - standard rate limiting
app.use('/api/v1', apiRateLimiter);

// Upload routes - upload-specific limits
app.use('/api/v1/upload', uploadRateLimiter);
```

---

## 4. Use Validation Middleware in Routes

```typescript
import { validate, validateMultiple } from './shared/validation';
import { createOrderSchema, orderIdParamSchema } from './shared/validation/schemas/example.schemas';

// Single validation
router.post('/orders',
    authenticate,
    validate(createOrderSchema, 'body'),
    orderController.create
);

// Multiple validations
router.put('/orders/:id',
    authenticate,
    validateMultiple({
        params: orderIdParamSchema,
        body: updateOrderSchema,
    }),
    orderController.update
);
```

---

## 5. Use Error Handler in Controllers

```typescript
import { handleControllerError } from '@/shared/utils/errorHandler';
import { MESSAGES } from '@/shared/constants/messages';

export const createOrder = async (req, res, next) => {
    try {
        // Validation already done by middleware
        const order = await orderService.create(req.body);
        
        sendCreated(res, { order }, MESSAGES.SUCCESS.ORDER_CREATED);
    } catch (error) {
        handleControllerError(error, res, next, 'createOrder');
    }
};
```

---

## 6. Use Message Constants

```typescript
import { MESSAGES } from '@/shared/constants/messages';

// In controllers
sendError(res, MESSAGES.AUTH.INVALID_CREDENTIALS, 401, ErrorCode.AUTH_INVALID_CREDENTIALS);
sendSuccess(res, data, MESSAGES.SUCCESS.LOGIN_SUCCESS);

// In services
throw new NotFoundError(MESSAGES.BUSINESS.USER_NOT_FOUND, ErrorCode.RES_USER_NOT_FOUND);

// Dynamic messages
throw new ValidationError(
    MESSAGES.VALIDATION.MIN_LENGTH('Password', 8),
    ErrorCode.VAL_MIN_LENGTH
);
```

---

## 7. Environment Variables

Add to `.env`:

```env
# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Rate Limiting (optional)
REDIS_URL=redis://localhost:6379

# Trusted IPs for webhooks (optional)
TRUSTED_WEBHOOK_IPS=1.2.3.4,5.6.7.8
```

---

## 8. Example: Complete Route Setup

```typescript
import express from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/shared/validation';
import { authRateLimiter } from '@/shared/config/rateLimit.config';
import { loginSchema, registerUserSchema } from '@/shared/validation/schemas/example.schemas';
import { handleControllerError } from '@/shared/utils/errorHandler';
import { MESSAGES } from '@/shared/constants/messages';

const router = express.Router();

// Login - with rate limiting and validation
router.post('/login',
    authRateLimiter,
    validate(loginSchema, 'body'),
    async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            
            sendSuccess(res, result, MESSAGES.SUCCESS.LOGIN_SUCCESS);
        } catch (error) {
            handleControllerError(error, res, next, 'login');
        }
    }
);

// Register - with rate limiting and validation
router.post('/register',
    authRateLimiter,
    validate(registerUserSchema, 'body'),
    async (req, res, next) => {
        try {
            const user = await authService.register(req.body);
            
            sendCreated(res, { user }, MESSAGES.SUCCESS.USER_REGISTERED);
        } catch (error) {
            handleControllerError(error, res, next, 'register');
        }
    }
);

export default router;
```

---

## 9. Testing

### Test Validation

```typescript
describe('POST /orders', () => {
    it('should reject invalid email', async () => {
        const response = await request(app)
            .post('/orders')
            .send({
                customerInfo: { email: 'invalid' },
                items: []
            });

        expect(response.status).toBe(400);
        expect(response.body.errors[0].field).toBe('customerInfo.email');
    });
});
```

### Test Rate Limiting

```typescript
describe('Rate Limiting', () => {
    it('should block after 5 login attempts', async () => {
        // Make 5 requests
        for (let i = 0; i < 5; i++) {
            await request(app).post('/auth/login').send({});
        }

        // 6th request should be rate limited
        const response = await request(app).post('/auth/login').send({});
        expect(response.status).toBe(429);
    });
});
```

---

## 10. Monitoring

### Check Rate Limit Headers

```bash
curl -I https://api.example.com/orders

# Response headers:
# RateLimit-Limit: 60
# RateLimit-Remaining: 59
# RateLimit-Reset: 1673456789
```

### Check Security Headers

```bash
curl -I https://api.example.com/

# Response headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

---

## Summary

✅ **Security Headers** - Helmet configured  
✅ **Rate Limiting** - 5 limiters ready  
✅ **CORS** - Environment-based  
✅ **Validation** - Multi-layer with sanitization  
✅ **Error Handling** - Centralized and consistent  
✅ **Messages** - 158+ constants  

**Phase 1 Complete!** 🎉
