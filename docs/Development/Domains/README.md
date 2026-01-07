# Domains

Business domain documentation organized by functional area. Each domain contains context packages optimized for AI understanding.

## 📁 Domains

### [Auth/](./Auth/)
Authentication and user management
- User context and master context
- Session management
- Role-based access control

### [Orders/](./Orders/)
Order management system
- Order lifecycle and workflows
- Order processing context

### [Payments/](./Payments/)
Payment and wallet management
- Payment gateway integration
- Wallet system context
- Transaction management

### [Shipping/](./Shipping/)
Shipping and logistics
- Shipment tracking and management
- Warehouse and rate card management
- **[NDR_RTO/](./Shipping/NDR_RTO/)** - Non-Delivery Report and Return to Origin system

### [Integrations/](./Integrations/)
External platform integrations organized by type:
- **[Ecommerce/](./Integrations/Ecommerce/)** - Amazon SP-API, Flipkart, Shopify, WooCommerce
- **[Shipping/](./Integrations/Shipping/)** - Velocity Shipfast
- **[Payment/](./Integrations/Payment/)** - Razorpay
- **[KYC/](./Integrations/KYC/)** - DeepVue KYC

---

## 📖 Context Files

All context files are structured for AI consumption with:
- Clear domain boundaries
- Implementation status
- API contracts
- Database schemas
- Business logic flows

---

[← Back to Development](../README.md) | [↑ Main](../../README.md)
