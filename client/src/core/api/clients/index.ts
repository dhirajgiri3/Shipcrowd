/**
 * API Clients Barrel File
 * Exports all API clients grouped by domain
 */

// Finance
export * from './finance/financialsApi';
export * from './finance/walletApi';
export * from './finance/billingApi';
export * from './finance/bankAccountApi';
export * from './finance/profitApi';
export * from './finance/recoveryApi';

// Shipping
export * from './shipping/shipmentApi';
export * from './shipping/ratesApi';
export * from './shipping/weightApi';
export * from './shipping/ndrApi';
export * from './shipping/courierRecommendationApi';

// Auth
export * from './auth/authApi';
export * from './auth/sessionApi';
export * from './auth/consentApi';
export * from './auth/kycApi';

// Analytics
export * from './analytics/analyticsApi';
export * from './analytics/intelligenceApi';
export * from './analytics/sellerHealthApi';

// Orders
export * from './orders/orderApi';

// Marketing
export * from './marketing/promotionApi';

// General
export * from './general/companyApi';
export * from './general/notificationsApi';
