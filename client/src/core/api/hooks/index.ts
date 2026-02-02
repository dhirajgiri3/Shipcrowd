/**
 * API Hooks - Main Barrel Export
 * 
 * All hooks are organized into domain-based folders for better maintainability.
 * This barrel export maintains backward compatibility with existing imports.
 * 
 * Usage:
 *   import { useOrders, useWallet, useCouriers } from '@/src/core/api/hooks';
 * 
 * Or import from specific domains:
 *   import { useOrders } from '@/src/core/api/hooks/orders';
 *   import { useWallet } from '@/src/core/api/hooks/finance';
 */

// Orders & Shipment Management
export * from './orders';

// Logistics & Delivery
export * from './logistics';

// Returns & Disputes
export * from './returns';

// Financial Operations
export * from './finance';

// External Integrations
export * from './integrations';

// Communication & Notifications
export * from './support';
export * from './communication';

// Security & Compliance
export * from './security';

// Settings & Configuration
export * from './settings';

// Analytics & Reporting
export * from './analytics';

// Seller-specific Actions
export * from './seller';

// Commission Management
// Commission Management (Moved to Admin)
// export * from './commission';

// Admin Operations
export * from './admin';

// System Health & Monitoring
export * from './system';
