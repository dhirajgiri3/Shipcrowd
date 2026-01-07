# Shipcrowd Server Structure Map

**Date**: January 3, 2026
**Version**: 1.0
**Architecture Pattern**: Clean Architecture with Domain-Driven Design

---

## Table of Contents
1. [Overview](#overview)
2. [Directory Tree](#directory-tree)
3. [Layer-by-Layer Breakdown](#layer-by-layer-breakdown)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Service Dependency Graph](#service-dependency-graph)
6. [Route → Controller → Service → Model Mapping](#route--controller--service--model-mapping)

---

## Overview

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                     │
│   (HTTP Routes, Controllers, Middleware, Validation)    │
│                    /presentation/                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                      │
│      (Business Logic, Services, DTOs, Use Cases)        │
│                      /core/application/                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                          │
│         (Entities, Interfaces, Business Rules)          │
│                      /core/domain/                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                     │
│  (Database, External APIs, Jobs, Storage, Utilities)    │
│                    /infrastructure/                      │
└─────────────────────────────────────────────────────────┘

                       ┌──────────────┐
                       │ SHARED LAYER │
                       │  (Cross-cut)  │
                       └──────────────┘
```

### File Statistics

| Layer | Directories | Files | Lines of Code (approx) |
|-------|-------------|-------|------------------------|
| **Core (Application + Domain)** | 23 | 70 | ~18,500 |
| **Infrastructure** | 30 | 85 | ~22,300 |
| **Presentation** | 15 | 101 | ~24,100 |
| **Shared** | 10 | 45 | ~8,500 |
| **Config** | 1 | 8 | ~1,540 |
| **TOTAL** | **79** | **319** | **74,940** |

---

## Directory Tree

### Complete Server Structure

```
/server/src/
│
├── config/                          # Application Configuration
│   ├── database.ts                  # MongoDB connection setup
│   ├── redis.ts                     # Redis configuration
│   ├── queue.ts                     # BullMQ queue configuration
│   ├── passport.ts                  # Passport.js strategies
│   ├── rateLimiter.ts               # Rate limiting config
│   ├── cors.ts                      # CORS configuration
│   ├── swagger.ts                   # API documentation
│   └── env.ts                       # Environment variables validation
│
├── core/                            # BUSINESS LOGIC CORE
│   │
│   ├── application/                 # Application Services Layer
│   │   ├── services/                # 64 Business Logic Services
│   │   │   ├── amazon/              # Amazon Integration (4 services)
│   │   │   │   ├── amazon-inventory-sync.service.ts
│   │   │   │   ├── amazon-oauth.service.ts
│   │   │   │   ├── amazon-order-sync.service.ts
│   │   │   │   └── amazon-product-mapping.service.ts
│   │   │   │
│   │   │   ├── analytics/           # Analytics & Reporting (10 services)
│   │   │   │   ├── analytics.service.ts
│   │   │   │   ├── customer-analytics.service.ts
│   │   │   │   ├── inventory-analytics.service.ts
│   │   │   │   ├── order-analytics.service.ts
│   │   │   │   ├── revenue-analytics.service.ts
│   │   │   │   ├── shipment-analytics.service.ts
│   │   │   │   ├── report-builder.service.ts
│   │   │   │   └── export/          # Export Services (3)
│   │   │   │       ├── base-export.service.ts
│   │   │   │       ├── csv-export.service.ts
│   │   │   │       ├── excel-export.service.ts
│   │   │   │       └── pdf-export.service.ts
│   │   │   │
│   │   │   ├── auth/                # Authentication (3 services)
│   │   │   │   ├── oauth.service.ts
│   │   │   │   ├── password.service.ts
│   │   │   │   └── session.service.ts
│   │   │   │
│   │   │   ├── commission/          # Sales Commission (6 services)
│   │   │   │   ├── commission-analytics.service.ts
│   │   │   │   ├── commission-approval.service.ts
│   │   │   │   ├── commission-calculation.service.ts
│   │   │   │   ├── commission-rule.service.ts
│   │   │   │   ├── payout-processing.service.ts
│   │   │   │   └── sales-representative.service.ts
│   │   │   │
│   │   │   ├── communication/       # Communication (4 services)
│   │   │   │   ├── email.service.ts
│   │   │   │   ├── notification.service.ts
│   │   │   │   ├── sms.service.ts
│   │   │   │   └── whatsapp.service.ts
│   │   │   │
│   │   │   ├── courier/             # Courier Selection
│   │   │   │   └── courier.factory.ts
│   │   │   │
│   │   │   ├── flipkart/            # Flipkart Integration (5 services)
│   │   │   │   ├── flipkart-inventory-sync.service.ts
│   │   │   │   ├── flipkart-oauth.service.ts
│   │   │   │   ├── flipkart-order-sync.service.ts
│   │   │   │   ├── flipkart-product-mapping.service.ts
│   │   │   │   └── flipkart-webhook.service.ts
│   │   │   │
│   │   │   ├── integrations/        # Third-party Integrations (2 services)
│   │   │   │   ├── deepvue.service.ts  # KYC verification
│   │   │   │   └── mocks/           # Mock services for testing
│   │   │   │
│   │   │   ├── ndr/                 # NDR Management (5 services)
│   │   │   │   ├── ndr-analytics.service.ts
│   │   │   │   ├── ndr-classification.service.ts
│   │   │   │   ├── ndr-detection.service.ts
│   │   │   │   ├── ndr-resolution.service.ts
│   │   │   │   └── actions/
│   │   │   │       └── ndr-action-executors.ts
│   │   │   │
│   │   │   ├── rto/                 # RTO Management (1 service)
│   │   │   │   └── rto.service.ts
│   │   │   │
│   │   │   ├── shipping/            # Shipping & Logistics (3 services)
│   │   │   │   ├── carrier.service.ts
│   │   │   │   ├── order.service.ts
│   │   │   │   └── shipment.service.ts
│   │   │   │
│   │   │   ├── shopify/             # Shopify Integration (5 services)
│   │   │   │   ├── shopify-inventory-sync.service.ts
│   │   │   │   ├── shopify-oauth.service.ts
│   │   │   │   ├── shopify-order-sync.service.ts
│   │   │   │   ├── shopify-webhook.service.ts
│   │   │   │   └── product-mapping.service.ts
│   │   │   │
│   │   │   ├── user/                # User Management (6 services)
│   │   │   │   ├── account.service.ts
│   │   │   │   ├── activity.service.ts
│   │   │   │   ├── email-change.service.ts
│   │   │   │   ├── profile.service.ts
│   │   │   │   └── recovery.service.ts
│   │   │   │
│   │   │   ├── wallet/              # Wallet & Payments (1 service)
│   │   │   │   └── wallet.service.ts
│   │   │   │
│   │   │   ├── warehouse/           # Warehouse Operations (4 services)
│   │   │   │   ├── inventory.service.ts
│   │   │   │   ├── packing.service.ts
│   │   │   │   ├── picking.service.ts
│   │   │   │   └── warehouse-notification.service.ts
│   │   │   │
│   │   │   ├── webhooks/            # Webhook Processing (2 services)
│   │   │   │   ├── velocity-webhook.service.ts
│   │   │   │   └── webhook-retry.service.ts
│   │   │   │
│   │   │   └── woocommerce/         # WooCommerce Integration (5 services)
│   │   │       ├── woocommerce-inventory-sync.service.ts
│   │   │       ├── woocommerce-oauth.service.ts
│   │   │       ├── woocommerce-order-sync.service.ts
│   │   │       ├── woocommerce-product-mapping.service.ts
│   │   │       └── woocommerce-webhook.service.ts
│   │   │
│   │   ├── dtos/                    # Data Transfer Objects
│   │   │   ├── auth/
│   │   │   │   └── (authentication DTOs)
│   │   │   └── shipment/
│   │   │       └── (shipment DTOs)
│   │   │
│   │   └── use-cases/               # Use Cases (Clean Architecture)
│   │       └── auth/
│   │           └── login-user.usecase.ts
│   │
│   └── domain/                      # Domain Layer (Business Rules)
│       ├── entities/                # Domain Entities
│       │   ├── shipment.entity.ts
│       │   └── user.entity.ts
│       │
│       └── interfaces/              # Domain Interfaces
│           ├── repositories/        # Repository Interfaces
│           │   ├── shipment.repository.interface.ts
│           │   └── user.repository.interface.ts
│           │
│           └── warehouse/           # Warehouse Service Interfaces
│               ├── inventory.interface.service.ts
│               ├── packing.interface.service.ts
│               └── picking.interface.service.ts
│
├── infrastructure/                  # EXTERNAL INTEGRATIONS & PERSISTENCE
│   │
│   ├── database/                    # Database Layer
│   │   ├── migrations/              # Database Migrations
│   │   │   └── (migration scripts)
│   │   │
│   │   └── mongoose/                # Mongoose ODM
│   │       └── models/              # 48 Mongoose Models
│   │           │
│   │           ├── iam/             # Identity & Access (5 models)
│   │           │   ├── users/
│   │           │   │   ├── user.model.ts
│   │           │   │   └── session.model.ts
│   │           │   └── access/
│   │           │       ├── permission.model.ts
│   │           │       ├── team-permission.model.ts
│   │           │       └── team-invitation.model.ts
│   │           │
│   │           ├── organization/    # Organization (3 models)
│   │           │   ├── core/
│   │           │   │   ├── company.model.ts
│   │           │   │   └── kyc.model.ts
│   │           │   └── teams/
│   │           │       └── team-activity.model.ts
│   │           │
│   │           ├── crm/             # CRM (3 models)
│   │           │   ├── leads/
│   │           │   │   └── lead.model.ts
│   │           │   └── sales/
│   │           │       ├── sales-representative.model.ts
│   │           │       └── call-log.model.ts
│   │           │
│   │           ├── marketing/       # Marketing (1 model)
│   │           │   └── promotions/
│   │           │       └── coupon.model.ts
│   │           │
│   │           ├── finance/         # Finance (5 models)
│   │           │   ├── payouts/
│   │           │   │   └── payout.model.ts
│   │           │   ├── wallets/
│   │           │   │   └── wallet-transaction.model.ts
│   │           │   └── commission/
│   │           │       ├── commission-rule.model.ts
│   │           │       ├── commission-transaction.model.ts
│   │           │       └── commission-adjustment.model.ts
│   │           │
│   │           ├── logistics/       # Logistics (13 models)
│   │           │   ├── inventory/
│   │           │   │   ├── store/
│   │           │   │   │   └── inventory.model.ts
│   │           │   │   └── tracking/
│   │           │   │       └── stock-movement.model.ts
│   │           │   │
│   │           │   ├── warehouse/
│   │           │   │   ├── structure/
│   │           │   │   │   ├── warehouse.model.ts
│   │           │   │   │   ├── warehouse-location.model.ts
│   │           │   │   │   └── warehouse-zone.model.ts
│   │           │   │   └── activities/
│   │           │   │       ├── packing-station.model.ts
│   │           │   │       └── pick-list.model.ts
│   │           │   │
│   │           │   └── shipping/
│   │           │       ├── core/
│   │           │       │   └── shipment.model.ts
│   │           │       ├── configuration/
│   │           │       │   ├── zone.model.ts
│   │           │       │   └── rate-card.model.ts
│   │           │       └── exceptions/
│   │           │           ├── rto-event.model.ts
│   │           │           ├── ndr-event.model.ts
│   │           │           └── ndr-workflow.model.ts
│   │           │
│   │           ├── orders/          # Orders (1 model)
│   │           │   └── core/
│   │           │       └── order.model.ts
│   │           │
│   │           ├── marketplaces/    # Marketplaces (12 models)
│   │           │   ├── amazon/
│   │           │   │   ├── amazon-store.model.ts
│   │           │   │   ├── amazon-sync-log.model.ts
│   │           │   │   └── amazon-product-mapping.model.ts
│   │           │   │
│   │           │   ├── flipkart/
│   │           │   │   ├── flipkart-store.model.ts
│   │           │   │   ├── flipkart-sync-log.model.ts
│   │           │   │   └── flipkart-product-mapping.model.ts
│   │           │   │
│   │           │   ├── shopify/
│   │           │   │   ├── shopify-store.model.ts
│   │           │   │   ├── shopify-sync-log.model.ts
│   │           │   │   └── shopify-product-mapping.model.ts
│   │           │   │
│   │           │   └── woocommerce/
│   │           │       ├── woocommerce-store.model.ts
│   │           │       ├── woocommerce-sync-log.model.ts
│   │           │       └── woocommerce-product-mapping.model.ts
│   │           │
│   │           └── system/          # System (5 models)
│   │               ├── integrations/
│   │               │   ├── integration.model.ts
│   │               │   ├── webhook-event.model.ts
│   │               │   └── webhook-dead-letter.model.ts
│   │               ├── audit/
│   │               │   └── audit-log.model.ts
│   │               └── reporting/
│   │                   └── report-config.model.ts
│   │
│   ├── external/                    # External API Integrations (17)
│   │   │
│   │   ├── ai/                      # AI Services
│   │   │   └── openai/
│   │   │       └── openai.service.ts
│   │   │
│   │   ├── communication/           # Communication APIs
│   │   │   ├── exotel/
│   │   │   │   └── exotel.client.ts
│   │   │   └── whatsapp/
│   │   │       └── whatsapp.service.ts
│   │   │
│   │   ├── couriers/                # Courier Integrations
│   │   │   ├── base/
│   │   │   │   └── courier.adapter.ts
│   │   │   └── velocity/
│   │   │       ├── velocity-shipfast.provider.ts
│   │   │       ├── velocity.auth.ts
│   │   │       ├── velocity.mapper.ts
│   │   │       └── velocity-error-handler.ts
│   │   │
│   │   ├── ecommerce/               # E-commerce Platforms
│   │   │   ├── amazon/
│   │   │   │   └── amazon.client.ts
│   │   │   ├── flipkart/
│   │   │   │   └── flipkart.client.ts
│   │   │   ├── shopify/
│   │   │   │   └── shopify.client.ts
│   │   │   └── woocommerce/
│   │   │       └── woocommerce.client.ts
│   │   │
│   │   └── storage/                 # File Storage
│   │       └── cloudinary/
│   │           └── cloudinary-storage.service.ts
│   │
│   ├── jobs/                        # Background Jobs (9 jobs)
│   │   ├── logistics/
│   │   │   └── shipping/
│   │   │       └── ndr-resolution.job.ts
│   │   │
│   │   ├── marketplaces/
│   │   │   ├── amazon/
│   │   │   │   └── amazon-order-sync.job.ts
│   │   │   ├── flipkart/
│   │   │   │   ├── flipkart-order-sync.job.ts
│   │   │   │   └── flipkart-webhook-processor.job.ts
│   │   │   ├── shopify/
│   │   │   │   ├── shopify-order-sync.job.ts
│   │   │   │   └── shopify-webhook-processor.job.ts
│   │   │   └── woocommerce/
│   │   │       └── woocommerce-order-sync.job.ts
│   │   │
│   │   └── system/
│   │       ├── maintenance/
│   │       │   └── account-deletion.job.ts
│   │       └── reporting/
│   │           └── scheduled-report.job.ts
│   │
│   ├── payment/                     # Payment Gateway
│   │   └── razorpay/
│   │       └── RazorpayPayoutProvider.ts
│   │
│   └── utilities/                   # Infrastructure Utilities (5)
│       ├── cache.service.ts
│       ├── queue-manager.ts
│       ├── rate-limiter.ts
│       └── redis.connection.ts
│
├── presentation/                    # HTTP INTERFACE LAYER
│   └── http/
│       │
│       ├── controllers/             # 42 HTTP Controllers
│       │   │
│       │   ├── analytics/           # Analytics Controllers (2)
│       │   │   ├── analytics.controller.ts
│       │   │   └── export.controller.ts
│       │   │
│       │   ├── auth/                # Auth Controllers (3)
│       │   │   ├── auth.controller.ts
│       │   │   ├── recovery.controller.ts
│       │   │   └── session.controller.ts
│       │   │
│       │   ├── commission/          # Commission Controllers (5)
│       │   │   ├── commission-analytics.controller.ts
│       │   │   ├── commission-rule.controller.ts
│       │   │   ├── commission-transaction.controller.ts
│       │   │   ├── payout.controller.ts
│       │   │   └── sales-representative.controller.ts
│       │   │
│       │   ├── communication/       # Communication Controllers (3)
│       │   │   ├── email.controller.ts
│       │   │   ├── notification.controller.ts
│       │   │   └── whatsapp.controller.ts
│       │   │
│       │   ├── identity/            # Identity Controllers (4)
│       │   │   ├── account.controller.ts
│       │   │   ├── kyc.controller.ts
│       │   │   ├── profile.controller.ts
│       │   │   └── user.controller.ts
│       │   │
│       │   ├── integrations/        # Integration Controllers (6)
│       │   │   ├── amazon.controller.ts
│       │   │   ├── amazon-product-mapping.controller.ts
│       │   │   ├── flipkart.controller.ts
│       │   │   ├── flipkart-product-mapping.controller.ts
│       │   │   ├── shopify.controller.ts
│       │   │   ├── woocommerce.controller.ts
│       │   │   └── product-mapping.controller.ts
│       │   │
│       │   ├── ndr/                 # NDR Controller (1)
│       │   │   └── ndr.controller.ts
│       │   │
│       │   ├── organization/        # Organization Controllers (2)
│       │   │   ├── company.controller.ts
│       │   │   └── team.controller.ts
│       │   │
│       │   ├── public/              # Public Controllers (1)
│       │   │   └── address-update.controller.ts
│       │   │
│       │   ├── rto/                 # RTO Controller (1)
│       │   │   └── rto.controller.ts
│       │   │
│       │   ├── shipping/            # Shipping Controllers (4)
│       │   │   ├── order.controller.ts
│       │   │   ├── ratecard.controller.ts
│       │   │   ├── shipment.controller.ts
│       │   │   └── zone.controller.ts
│       │   │
│       │   ├── system/              # System Controllers (1)
│       │   │   └── audit.controller.ts
│       │   │
│       │   ├── warehouse/           # Warehouse Controllers (4)
│       │   │   ├── inventory.controller.ts
│       │   │   ├── packing.controller.ts
│       │   │   ├── picking.controller.ts
│       │   │   └── warehouse.controller.ts
│       │   │
│       │   └── webhooks/            # Webhook Controllers (4)
│       │       ├── flipkart.webhook.controller.ts
│       │       ├── shopify.webhook.controller.ts
│       │       ├── velocity.webhook.controller.ts
│       │       └── woocommerce.webhook.controller.ts
│       │
│       ├── middleware/              # 14 Middleware
│       │   ├── auth/
│       │   │   ├── auth.ts          # JWT authentication
│       │   │   ├── company.ts       # Company context
│       │   │   └── permissions.ts   # RBAC authorization
│       │   │
│       │   ├── system/
│       │   │   ├── audit-log.middleware.ts
│       │   │   ├── rate-limiter.middleware.ts
│       │   │   └── security-headers.middleware.ts
│       │   │
│       │   └── webhooks/            # Webhook Authentication (5)
│       │       ├── flipkart-webhook-auth.middleware.ts
│       │       ├── razorpay-webhook-auth.middleware.ts
│       │       ├── shopify-webhook-auth.middleware.ts
│       │       ├── velocity-webhook-auth.middleware.ts
│       │       └── woocommerce-webhook-auth.middleware.ts
│       │
│       └── routes/                  # API Routes
│           ├── public/              # Public Routes
│           │   └── address-update.routes.ts
│           │
│           └── v1/                  # API v1 Routes (54 route files)
│               ├── index.ts         # Main route aggregator
│               │
│               ├── analytics/       # Analytics Routes
│               │   └── export.routes.ts
│               │
│               ├── auth/            # Authentication Routes (3)
│               │   ├── auth.routes.ts
│               │   ├── recovery.routes.ts
│               │   └── session.routes.ts
│               │
│               ├── commission/      # Commission Routes (5)
│               │   ├── analytics.routes.ts
│               │   ├── commission-rules.routes.ts
│               │   ├── commission-transactions.routes.ts
│               │   ├── payouts.routes.ts
│               │   └── sales-representatives.routes.ts
│               │
│               ├── communication/   # Communication Routes (3)
│               │   ├── email.routes.ts
│               │   ├── notification.routes.ts
│               │   └── whatsapp.routes.ts
│               │
│               ├── identity/        # Identity Routes (4)
│               │   ├── account.routes.ts
│               │   ├── kyc.routes.ts
│               │   ├── profile.routes.ts
│               │   └── user.routes.ts
│               │
│               ├── integrations/    # Integration Routes (7)
│               │   ├── index.ts
│               │   ├── amazon.routes.ts
│               │   ├── amazon-product-mapping.routes.ts
│               │   ├── flipkart.routes.ts
│               │   ├── flipkart-product-mapping.routes.ts
│               │   ├── shopify.routes.ts
│               │   ├── woocommerce.routes.ts
│               │   └── product-mapping.routes.ts
│               │
│               ├── ndr/             # NDR Routes (1)
│               │   └── ndr.routes.ts
│               │
│               ├── organization/    # Organization Routes (2)
│               │   ├── company.routes.ts
│               │   └── team.routes.ts
│               │
│               ├── rto/             # RTO Routes (1)
│               │   └── rto.routes.ts
│               │
│               ├── shipping/        # Shipping Routes (4)
│               │   ├── order.routes.ts
│               │   ├── ratecard.routes.ts
│               │   ├── shipment.routes.ts
│               │   └── zone.routes.ts
│               │
│               ├── system/          # System Routes (2)
│               │   ├── analytics.routes.ts
│               │   └── audit.routes.ts
│               │
│               ├── warehouses/      # Warehouse Routes (5)
│               │   ├── index.ts
│               │   ├── inventory.routes.ts
│               │   ├── packing.routes.ts
│               │   ├── picking.routes.ts
│               │   └── warehouse.routes.ts
│               │
│               └── webhooks/        # Webhook Routes (4)
│                   ├── flipkart.webhook.routes.ts
│                   ├── shopify.routes.ts
│                   ├── velocity.webhook.routes.ts
│                   └── woocommerce.webhook.routes.ts
│
├── shared/                          # CROSS-CUTTING CONCERNS
│   │
│   ├── constants/                   # Application Constants
│   │   └── security.ts
│   │
│   ├── errors/                      # Error Handling (4 files)
│   │   ├── app.error.ts             # Custom error class
│   │   ├── error-messages.ts        # Error message constants
│   │   ├── errorCodes.ts            # Error code enums
│   │   └── types.ts                 # Error type definitions
│   │
│   ├── events/                      # Event System (3 files)
│   │   ├── cache-invalidation.listener.ts
│   │   ├── commissionEventHandlers.ts
│   │   └── eventBus.ts
│   │
│   ├── helpers/                     # Helper Functions (5 files)
│   │   ├── controller.helpers.ts
│   │   ├── formatOperatingHours.ts
│   │   ├── jwt.ts
│   │   └── twilio.utils.ts
│   │
│   ├── logger/                      # Logging
│   │   └── winston.logger.ts        # Winston configuration
│   │
│   ├── services/                    # Shared Services (2)
│   │   ├── cache.service.ts
│   │   └── token.service.ts         # JWT token management
│   │
│   ├── types/                       # Shared Types
│   │   └── apiResponse.ts           # API response types
│   │
│   ├── utils/                       # Utility Functions (6 files)
│   │   ├── arrayValidators.ts
│   │   ├── asyncHandler.ts          # Async error wrapper
│   │   ├── encryption.ts            # Data encryption
│   │   ├── responseHelper.ts        # Standardized responses
│   │   └── transactionHelper.ts     # DB transactions
│   │
│   └── validation/                  # Zod Validation Schemas (7 files)
│       ├── analytics-schemas.ts
│       ├── commission-schemas.ts
│       ├── commonSchemas.ts
│       ├── ndr-schemas.ts
│       ├── rto-schemas.ts
│       ├── schemas.ts
│       └── warehouse.schemas.ts
│
├── types/                           # Global Type Definitions
│   └── (global type declarations)
│
└── index.ts                         # Application Entry Point

```

---

## Layer-by-Layer Breakdown

### 1. Core Layer (Application + Domain)

**Purpose**: Business logic, domain rules, and application services

**Sublayers**:

#### A. Application Services (64 services)
**Location**: `/core/application/services/`

**Organization by Domain**:

| Domain | Services | Purpose |
|--------|----------|---------|
| **Amazon** | 4 | Amazon marketplace integration |
| **Analytics** | 10 | Data analytics and reporting |
| **Auth** | 3 | Authentication and authorization |
| **Commission** | 6 | Sales commission management |
| **Communication** | 4 | Email, SMS, WhatsApp |
| **Courier** | 1 | Courier factory pattern |
| **Flipkart** | 5 | Flipkart marketplace integration |
| **Integrations** | 2 | Third-party integrations (DeepVue KYC) |
| **NDR** | 5 | Non-delivery report management |
| **RTO** | 1 | Return to origin processing |
| **Shipping** | 3 | Shipping and logistics |
| **Shopify** | 5 | Shopify marketplace integration |
| **User** | 6 | User management |
| **Wallet** | 1 | Wallet and transactions |
| **Warehouse** | 4 | Warehouse operations |
| **Webhooks** | 2 | Webhook processing |
| **WooCommerce** | 5 | WooCommerce marketplace integration |

#### B. Domain Entities (2 entities)
**Location**: `/core/domain/entities/`

- `shipment.entity.ts` - Shipment domain entity
- `user.entity.ts` - User domain entity

#### C. Domain Interfaces (5 interfaces)
**Location**: `/core/domain/interfaces/`

- Repository interfaces for shipment and user
- Warehouse service interfaces (inventory, packing, picking)

---

### 2. Infrastructure Layer

**Purpose**: External system integration, data persistence, background jobs

#### A. Database Models (48 models)
**Location**: `/infrastructure/database/mongoose/models/`

**Organization by Domain**:

| Domain | Models | Purpose |
|--------|--------|---------|
| **IAM** | 5 | Users, sessions, permissions |
| **Organization** | 3 | Companies, KYC, team activity |
| **CRM** | 3 | Leads, sales reps, call logs |
| **Marketing** | 1 | Coupons |
| **Finance** | 5 | Payouts, wallet, commissions |
| **Logistics - Inventory** | 2 | Inventory, stock movements |
| **Logistics - Warehouse** | 5 | Warehouses, locations, pick/pack |
| **Logistics - Shipping** | 6 | Shipments, rates, NDR, RTO |
| **Orders** | 1 | Order management |
| **Marketplaces** | 12 | 4 platforms × 3 models each |
| **System** | 5 | Integrations, webhooks, audit |

#### B. External Integrations (17 integrations)
**Location**: `/infrastructure/external/`

**Categories**:
- **AI**: OpenAI
- **Communication**: Exotel, WhatsApp
- **Couriers**: Velocity Shipfast
- **E-commerce**: Amazon, Flipkart, Shopify, WooCommerce
- **Storage**: Cloudinary

#### C. Background Jobs (9 jobs)
**Location**: `/infrastructure/jobs/`

**Job Types**:
1. **Marketplace Sync**: Shopify, WooCommerce, Amazon, Flipkart order sync
2. **Webhook Processing**: Shopify, Flipkart webhook processors
3. **NDR Resolution**: Automated NDR handling
4. **Maintenance**: Account deletion cleanup
5. **Reporting**: Scheduled report generation

**Technology**: BullMQ with Redis backend

#### D. Infrastructure Utilities (5 utilities)
**Location**: `/infrastructure/utilities/`

- Cache service (Redis)
- Queue manager (BullMQ)
- Rate limiter
- Redis connection pooling

---

### 3. Presentation Layer

**Purpose**: HTTP interface, request handling, response formatting

#### A. Controllers (42 controllers)
**Location**: `/presentation/http/controllers/`

**Responsibilities**:
- Request parsing
- Input validation (Zod schemas)
- Service orchestration
- Response formatting
- Error handling

**Organization**: By feature domain (analytics, auth, commission, etc.)

#### B. Middleware (14 middleware)
**Location**: `/presentation/http/middleware/`

**Categories**:

1. **Authentication** (3):
   - JWT authentication
   - Company context injection
   - RBAC permissions

2. **System** (3):
   - Audit logging
   - Rate limiting
   - Security headers

3. **Webhooks** (5):
   - Flipkart signature verification
   - Razorpay signature verification
   - Shopify HMAC verification
   - Velocity authentication
   - WooCommerce signature verification

4. **Global**:
   - CORS
   - Body parser
   - Compression
   - Cookie parser

#### C. Routes (54 route files)
**Location**: `/presentation/http/routes/v1/`

**Route Structure**:
```
/api/v1/
  ├── /auth/*              # Authentication
  ├── /orders/*            # Order management
  ├── /shipments/*         # Shipment operations
  ├── /warehouses/*        # Warehouse CRUD
  ├── /warehouse/*         # Warehouse operations (pick/pack)
  ├── /integrations/*      # Marketplace integrations
  ├── /ndr/*               # NDR management
  ├── /rto/*               # RTO processing
  ├── /analytics/*         # Analytics & reporting
  ├── /webhooks/*          # Webhook handlers
  └── ... (14 more domains)
```

---

### 4. Shared Layer

**Purpose**: Cross-cutting concerns, utilities, common code

#### Components:

**A. Error Handling**:
- Custom `AppError` class
- Error codes and messages
- Error type definitions

**B. Validation**:
- Zod schemas by domain
- Common validation schemas (email, phone, address)

**C. Utilities**:
- Async error handler wrapper
- Response formatters
- Encryption utilities
- Transaction helpers

**D. Services**:
- Token service (JWT)
- Cache service abstraction

**E. Events**:
- Event bus
- Event handlers
- Cache invalidation listeners

**F. Logging**:
- Winston logger configuration
- Log levels, formats, transports

---

## Data Flow Diagrams

### 1. Authentication Flow

```
┌──────────────┐
│    Client    │
└──────┬───────┘
       │
       │ POST /api/v1/auth/register
       │ { email, password, name, phone, companyName }
       ▼
┌────────────────────────────────────────────────┐
│  Presentation: AuthController.register()       │
│  - Validate input (Zod schema)                 │
│  - Rate limit check                            │
└────────────┬───────────────────────────────────┘
             │
             │ Call OAuthService.register()
             ▼
┌────────────────────────────────────────────────┐
│  Application: OAuthService                     │
│  1. Check email uniqueness                     │
│  2. Hash password (bcrypt)                     │
│  3. Create company record                      │
│  4. Create user record                         │
│  5. Generate email verification token          │
│  6. Send verification email (SendGrid)         │
└────────────┬───────────────────────────────────┘
             │
             │ Save to database
             ▼
┌────────────────────────────────────────────────┐
│  Infrastructure: Mongoose Models               │
│  - User.create({ ... })                        │
│  - Company.create({ ... })                     │
└────────────┬───────────────────────────────────┘
             │
             │ Return user + tokens
             ▼
┌────────────────────────────────────────────────┐
│  Response: { user, accessToken, refreshToken } │
│  - Set httpOnly cookies (accessToken)          │
│  - Return user object                          │
└────────────────────────────────────────────────┘
```

### 2. Order Fulfillment Flow (Shopify Integration)

```
┌─────────────┐
│   Shopify   │ Order Created
└──────┬──────┘
       │
       │ Webhook: POST /api/v1/webhooks/shopify/orders/create
       │ Headers: X-Shopify-Hmac-SHA256
       ▼
┌────────────────────────────────────────────────────────┐
│  Middleware: Shopify HMAC Verification                 │
│  - Verify webhook signature                            │
│  - Prevent replay attacks                              │
└────────────┬───────────────────────────────────────────┘
             │
             │ Webhook verified
             ▼
┌────────────────────────────────────────────────────────┐
│  Controller: ShopifyWebhookController.handleOrder()    │
│  - Parse Shopify order payload                         │
│  - Enqueue job for async processing                    │
└────────────┬───────────────────────────────────────────┘
             │
             │ Job: ShopifyWebhookProcessorJob
             ▼
┌────────────────────────────────────────────────────────┐
│  Service: ShopifyOrderSyncService.importOrder()        │
│  1. Map Shopify order to Shipcrowd order format        │
│  2. Extract customer details                           │
│  3. Map product SKUs                                   │
│  4. Create order in database                           │
└────────────┬───────────────────────────────────────────┘
             │
             │ Order created
             ▼
┌────────────────────────────────────────────────────────┐
│  Service: OrderService.assignWarehouse()               │
│  1. Query inventory levels across warehouses           │
│  2. Select warehouse with stock                        │
│  3. Update order.warehouse                             │
└────────────┬───────────────────────────────────────────┘
             │
             │ Warehouse assigned
             ▼
┌────────────────────────────────────────────────────────┐
│  Service: PickingService.createPickList()              │
│  1. Generate picking list from order items             │
│  2. Reserve inventory                                  │
│  3. Assign to warehouse staff                          │
│  4. Send notification                                  │
└────────────┬───────────────────────────────────────────┘
             │
             │ Staff picks items
             ▼
┌────────────────────────────────────────────────────────┐
│  Service: PickingService.complete()                    │
│  1. Mark pick list complete                            │
│  2. Update inventory (deduct reserved)                 │
│  3. Trigger packing workflow                           │
└────────────┬───────────────────────────────────────────┘
             │
             │ Items ready for packing
             ▼
┌────────────────────────────────────────────────────────┐
│  Service: PackingService.createPackingStation()        │
│  1. Assign to packing station                          │
│  2. Verify items                                       │
│  3. Record package dimensions/weight                   │
│  4. Mark packing complete                              │
└────────────┬───────────────────────────────────────────┘
             │
             │ Package ready
             ▼
┌────────────────────────────────────────────────────────┐
│  Service: ShipmentService.createShipment()             │
│  1. Calculate shipping charges (RateCard)              │
│  2. Deduct from wallet                                 │
│  3. Call Velocity API for AWB generation               │
│  4. Create shipment record                             │
│  5. Update order status                                │
└────────────┬───────────────────────────────────────────┘
             │
             │ AWB: VEL123456789
             ▼
┌────────────────────────────────────────────────────────┐
│  External: Velocity Shipfast API                       │
│  - Generate AWB                                        │
│  - Schedule pickup                                     │
│  - Return tracking details                             │
└────────────┬───────────────────────────────────────────┘
             │
             │ Tracking updates (webhooks)
             ▼
┌────────────────────────────────────────────────────────┐
│  Webhook: POST /api/v1/webhooks/velocity/tracking      │
│  - Update shipment.trackingStatus                      │
│  - Update shipment.currentLocation                     │
│  - Add to shipment.trackingHistory                     │
│  - Sync status back to Shopify                         │
└────────────┬───────────────────────────────────────────┘
             │
             │ Delivered
             ▼
┌────────────────────────────────────────────────────────┐
│  Service: ShipmentService.markDelivered()              │
│  1. Update order status: DELIVERED                     │
│  2. Calculate commission (if sales rep attributed)     │
│  3. Trigger COD remittance (if COD order)              │
│  4. Update analytics                                   │
│  5. Send delivery confirmation to customer             │
└────────────────────────────────────────────────────────┘
```

### 3. NDR to RTO Flow

```
┌────────────────┐
│ Velocity API   │ Delivery Failed
└────────┬───────┘
         │
         │ Webhook: Tracking Status = "NDR"
         ▼
┌────────────────────────────────────────────────────────┐
│  Service: NDRDetectionService.detectNDR()              │
│  1. Parse tracking update                              │
│  2. Check if shipment already has NDR event            │
│  3. Create NDR event if new                            │
└────────────┬───────────────────────────────────────────┘
             │
             │ NDR Event Created
             ▼
┌────────────────────────────────────────────────────────┐
│  Service: NDRClassificationService.classify()          │
│  1. Extract NDR reason from tracking update            │
│  2. Classify: Customer Unavailable / Address Incorrect │
│  3. Assign priority (HIGH/MEDIUM/LOW)                  │
│  4. Set ndrCategory                                    │
└────────────┬───────────────────────────────────────────┘
             │
             │ NDR Classified
             ▼
┌────────────────────────────────────────────────────────┐
│  Service: NDRResolutionService.initiateWorkflow()      │
│  1. Create NDRWorkflow                                 │
│  2. Assign to customer support team                    │
│  3. Send customer notification (SMS/Email/WhatsApp)    │
│  4. Wait for customer response (24-48 hours)           │
└────────────┬───────────────────────────────────────────┘
             │
             │ Customer Response / Timeout
             ▼
┌────────────────────────────────────────────────────────┐
│  Decision: Resolution Action                           │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   RETRY      │  │  UPDATE      │  │   RTO        │ │
│  │  DELIVERY    │  │  ADDRESS     │  │ INITIATE     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          ▼                  ▼                  ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ Schedule    │    │ Update      │    │ RTO         │
   │ reattempt   │    │ shipment    │    │ Service     │
   │ with        │    │ address &   │    │ Process     │
   │ Velocity    │    │ retry       │    │             │
   └─────────────┘    └─────────────┘    └──────┬──────┘
                                                 │
                                                 ▼
                                    ┌───────────────────────────┐
                                    │ RTOService.initiateRTO()  │
                                    │ 1. Calculate RTO charges  │
                                    │ 2. Deduct from wallet     │
                                    │ 3. Create RTO event       │
                                    │ 4. Notify Velocity        │
                                    │ 5. Update shipment status │
                                    └───────────────────────────┘
```

### 4. Payment & Commission Flow

```
┌──────────────┐
│ Order Created│
└──────┬───────┘
       │
       │ Has sales_representative?
       ▼
┌────────────────────────────────────────────────────────┐
│  Service: CommissionCalculationService.calculate()     │
│  1. Get active commission rules                        │
│  2. Match order to rules (product/category/value)      │
│  3. Calculate commission (flat/percentage/tiered)      │
│  4. Create CommissionTransaction (PENDING status)      │
└────────────┬───────────────────────────────────────────┘
             │
             │ Commission Calculated
             ▼
┌────────────────────────────────────────────────────────┐
│  Shipment Created                                      │
│  - Wallet debited for shipping charges                 │
│  - WalletTransaction.create({ type: 'DEBIT' })         │
└────────────┬───────────────────────────────────────────┘
             │
             │ Order Delivered (COD)
             ▼
┌────────────────────────────────────────────────────────┐
│  Background Job: COD Remittance (T+3 days)             │
│  1. Identify delivered COD orders                      │
│  2. Calculate remittance amount (COD - charges)        │
│  3. Credit wallet                                      │
│  4. WalletTransaction.create({ type: 'CREDIT' })       │
└────────────┬───────────────────────────────────────────┘
             │
             │ Commission Approval
             ▼
┌────────────────────────────────────────────────────────┐
│  Service: CommissionApprovalService.approve()          │
│  1. Admin reviews commission transaction               │
│  2. Update status: APPROVED                            │
│  3. Set approvedBy, approvedAt                         │
└────────────┬───────────────────────────────────────────┘
             │
             │ Payout Processing (Monthly)
             ▼
┌────────────────────────────────────────────────────────┐
│  Service: PayoutProcessingService.processPayouts()     │
│  1. Get all APPROVED commissions for sales rep         │
│  2. Sum total payout amount                            │
│  3. Call Razorpay Payout API                           │
│  4. Create Payout record                               │
│  5. Update CommissionTransaction: PAID                 │
└────────────┬───────────────────────────────────────────┘
             │
             │ Razorpay Webhook: Payout Success
             ▼
┌────────────────────────────────────────────────────────┐
│  Webhook: POST /api/v1/webhooks/razorpay               │
│  1. Verify webhook signature                           │
│  2. Update Payout.status: COMPLETED                    │
│  3. Set processedAt timestamp                          │
│  4. Send payout confirmation email to sales rep        │
└────────────────────────────────────────────────────────┘
```

---

## Service Dependency Graph

### Core Service Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                    External Dependencies                     │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Shopify  │  │WooCommer│  │ Velocity │  │ Razorpay │   │
│  │   API    │  │ ce API  │  │   API    │  │   API    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│           Infrastructure Layer (External Clients)            │
│                                                              │
│  ShopifyClient  WooCommerceClient  VelocityProvider         │
│           RazorpayPayoutProvider                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│               Application Layer (Services)                   │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ ShopifyOAuth     │───────▶ │ ShopifyOrderSync │         │
│  │ Service          │         │ Service          │         │
│  └──────────────────┘         └────────┬─────────┘         │
│                                         │                    │
│                                         ▼                    │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ OrderService     │◀────────│ ShipmentService  │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                             │                    │
│           ▼                             ▼                    │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ InventoryService │◀────────│ PickingService   │         │
│  └──────────────────┘         └────────┬─────────┘         │
│                                         │                    │
│                                         ▼                    │
│                               ┌──────────────────┐         │
│                               │ PackingService   │         │
│                               └────────┬─────────┘         │
│                                         │                    │
│                                         ▼                    │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ WalletService    │◀────────│ ShipmentService  │         │
│  └────────┬─────────┘         └──────────────────┘         │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │ CommissionCalc   │                                       │
│  │ Service          │                                       │
│  └──────────────────┘                                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│          Infrastructure Layer (Database Models)              │
│                                                              │
│  Order  Shipment  Inventory  PickList  PackingStation      │
│  WalletTransaction  CommissionTransaction                   │
└─────────────────────────────────────────────────────────────┘
```

### Service Communication Patterns

**1. Synchronous Dependencies** (Direct Service Calls):
```
ShipmentService
  ├─▶ OrderService.updateStatus()
  ├─▶ WalletService.deduct()
  ├─▶ VelocityProvider.generateAWB()
  └─▶ CommissionCalculationService.calculate()
```

**2. Asynchronous Dependencies** (Job Queues):
```
ShopifyWebhookController
  └─▶ Queue: shopify-webhook-processor
      └─▶ ShopifyOrderSyncService.importOrder()
          └─▶ OrderService.create()
```

**3. Event-Driven Dependencies** (Event Bus):
```
OrderService.create()
  └─▶ Event: order.created
      ├─▶ CommissionCalculationService (subscriber)
      ├─▶ AnalyticsService (subscriber)
      └─▶ NotificationService (subscriber)
```

---

## Route → Controller → Service → Model Mapping

### Example Mappings

#### 1. Order Creation Flow

| Layer | Component | File Path |
|-------|-----------|-----------|
| **Route** | `POST /api/v1/orders` | `/presentation/http/routes/v1/shipping/order.routes.ts` |
| **Middleware** | `auth` | `/presentation/http/middleware/auth/auth.ts` |
| **Middleware** | `company` | `/presentation/http/middleware/auth/company.ts` |
| **Controller** | `OrderController.create()` | `/presentation/http/controllers/shipping/order.controller.ts` |
| **Validation** | `createOrderSchema` | `/shared/validation/schemas.ts` |
| **Service** | `OrderService.createOrder()` | `/core/application/services/shipping/order.service.ts` |
| **Model** | `Order` | `/infrastructure/database/mongoose/models/orders/core/order.model.ts` |

**Data Flow**:
```
Client Request
    ↓
Route: POST /api/v1/orders
    ↓
Middleware: Auth (verify JWT)
    ↓
Middleware: Company (inject company context)
    ↓
Controller: OrderController.create()
    ├─ Validate: Zod schema
    ├─ Call: OrderService.createOrder()
    └─ Response: { order }
        ↓
Service: OrderService.createOrder()
    ├─ Business logic
    ├─ Model: Order.create()
    └─ Return order
        ↓
Model: Order (Mongoose)
    ├─ Save to MongoDB
    └─ Return saved document
```

---

#### 2. Shipment Tracking Webhook

| Layer | Component | File Path |
|-------|-----------|-----------|
| **Route** | `POST /api/v1/webhooks/velocity/tracking` | `/presentation/http/routes/v1/webhooks/velocity.webhook.routes.ts` |
| **Middleware** | `velocityWebhookAuth` | `/presentation/http/middleware/webhooks/velocity-webhook-auth.middleware.ts` |
| **Controller** | `VelocityWebhookController.tracking()` | `/presentation/http/controllers/webhooks/velocity.webhook.controller.ts` |
| **Service** | `VelocityWebhookService.processTracking()` | `/core/application/services/webhooks/velocity-webhook.service.ts` |
| **Service** | `ShipmentService.updateTracking()` | `/core/application/services/shipping/shipment.service.ts` |
| **Service** | `NDRDetectionService.detectNDR()` | `/core/application/services/ndr/ndr-detection.service.ts` |
| **Model** | `Shipment` | `/infrastructure/database/mongoose/models/logistics/shipping/core/shipment.model.ts` |
| **Model** | `NDREvent` | `/infrastructure/database/mongoose/models/logistics/shipping/exceptions/ndr-event.model.ts` |

---

#### 3. Shopify Order Import

| Layer | Component | File Path |
|-------|-----------|-----------|
| **Route** | `POST /api/v1/webhooks/shopify/orders/create` | `/presentation/http/routes/v1/webhooks/shopify.routes.ts` |
| **Middleware** | `shopifyWebhookAuth` | `/presentation/http/middleware/webhooks/shopify-webhook-auth.middleware.ts` |
| **Controller** | `ShopifyWebhookController.orderCreate()` | `/presentation/http/controllers/webhooks/shopify.webhook.controller.ts` |
| **Job Queue** | `shopify-webhook-processor` | `/infrastructure/jobs/marketplaces/shopify/shopify-webhook-processor.job.ts` |
| **Service** | `ShopifyOrderSyncService.importOrder()` | `/core/application/services/shopify/shopify-order-sync.service.ts` |
| **Service** | `OrderService.createOrder()` | `/core/application/services/shipping/order.service.ts` |
| **Model** | `Order` | `/infrastructure/database/mongoose/models/orders/core/order.model.ts` |
| **Model** | `ShopifySyncLog` | `/infrastructure/database/mongoose/models/marketplaces/shopify/shopify-sync-log.model.ts` |

---

#### 4. Commission Calculation

| Layer | Component | File Path |
|-------|-----------|-----------|
| **Trigger** | Order Delivered Event | N/A |
| **Service** | `CommissionCalculationService.calculate()` | `/core/application/services/commission/commission-calculation.service.ts` |
| **Model (Read)** | `CommissionRule` | `/infrastructure/database/mongoose/models/finance/commission/commission-rule.model.ts` |
| **Model (Read)** | `Order` | `/infrastructure/database/mongoose/models/orders/core/order.model.ts` |
| **Model (Write)** | `CommissionTransaction` | `/infrastructure/database/mongoose/models/finance/commission/commission-transaction.model.ts` |

---

### Complete Route Mapping Table

| Domain | Route | Method | Controller | Service | Model |
|--------|-------|--------|------------|---------|-------|
| **Auth** | `/auth/register` | POST | AuthController.register | OAuthService.register | User, Company |
| **Auth** | `/auth/login` | POST | AuthController.login | OAuthService.login | User, Session |
| **Auth** | `/sessions` | GET | SessionController.list | SessionService.list | Session |
| **Orders** | `/orders` | POST | OrderController.create | OrderService.create | Order |
| **Orders** | `/orders/:id` | GET | OrderController.get | OrderService.findById | Order |
| **Shipments** | `/shipments` | POST | ShipmentController.create | ShipmentService.create | Shipment |
| **Shipments** | `/shipments/:awb` | GET | ShipmentController.track | ShipmentService.track | Shipment |
| **Warehouses** | `/warehouses` | GET | WarehouseController.list | - | Warehouse |
| **Inventory** | `/warehouses/:id/inventory` | GET | InventoryController.list | InventoryService.getByWarehouse | Inventory |
| **Picking** | `/warehouse/pick-lists` | POST | PickingController.create | PickingService.create | PickList, Inventory |
| **Packing** | `/warehouse/packing-stations` | POST | PackingController.create | PackingService.create | PackingStation |
| **NDR** | `/ndr` | GET | NDRController.list | - | NDREvent |
| **NDR** | `/ndr/:id/actions/retry` | POST | NDRController.retry | NDRResolutionService.retry | NDREvent |
| **RTO** | `/rto/:id` | GET | RTOController.get | RTOService.findById | RTOEvent |
| **Analytics** | `/analytics/dashboard` | GET | AnalyticsController.dashboard | OrderAnalyticsService | Order, Shipment |
| **Export** | `/export/excel` | POST | ExportController.excel | ExcelExportService | Various |
| **Shopify** | `/integrations/shopify/oauth` | POST | ShopifyController.oauth | ShopifyOAuthService | ShopifyStore |
| **Webhooks** | `/webhooks/velocity/tracking` | POST | VelocityWebhookController | VelocityWebhookService | Shipment |
| **Webhooks** | `/webhooks/shopify/orders/create` | POST | ShopifyWebhookController | ShopifyOrderSyncService | Order |

*(Table shows representative examples, not all 100+ endpoints)*

---

## Summary

The Shipcrowd server architecture demonstrates:

✅ **Clean Architecture Principles**:
- Clear layer separation (Presentation → Application → Domain → Infrastructure)
- Dependency inversion (core depends on abstractions, not implementations)
- Single Responsibility at all levels

✅ **Scalable Design**:
- Horizontal scaling ready (stateless services)
- Background job processing (BullMQ)
- Caching layer (Redis)
- Queue-based async operations

✅ **Maintainability**:
- Consistent file organization
- Descriptive naming conventions
- Separated concerns
- Comprehensive error handling

✅ **Production Readiness**:
- Security middleware (authentication, authorization, rate limiting)
- Webhook signature verification
- Input validation (Zod)
- Audit logging
- Transaction support

---

**End of Server Structure Map**
