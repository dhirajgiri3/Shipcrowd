/**
 * Enhanced Mock Data - Indian Market Context
 * 
 * This module provides realistic mock data tailored for the Indian shipping market.
 * All data includes Indian names, cities, pincodes, and realistic business scenarios.
 * 
 * Usage:
 * - Set VITE_USE_MOCK_DATA=true to use mock data in development
 * - Set VITE_API_FALLBACK=true to fallback to mock data if API fails
 */

// Export all Indian data utilities
export * from './indianData';

// Export smart insights
export * from './smartInsights';

// Export transaction history
export * from './transactions';

// Export order data
export * from './orders';

// Re-export commonly used functions for convenience
export {
    getRandomIndianName,
    getRandomCity,
    getRandomPincode,
    getRandomProduct,
    getRandomCourier
} from './indianData';

export {
    mockSmartInsights,
    getInsightsByPriority,
    getTopInsights
} from './smartInsights';

export {
    mockTransactions,
    generateTransactionHistory,
    getTransactionsByType,
    getTransactionsByCategory,
    getTotalCredits,
    getTotalDebits
} from './transactions';

export {
    mockOrders,
    generateOrder,
    generateBulkOrders,
    getOrdersByStatus,
    getOrdersByPaymentMode,
    getUrgentOrders,
    getPendingPickups,
    getActiveOrders,
    getRTOOrders
} from './orders';
