/**
 * Database Seeding Configuration
 * 
 * Centralized configuration for all seeding parameters.
 * Adjust these values to control data volume and distribution.
 */

export const SEED_CONFIG = {
    // Data Volume Targets
    volume: {
        users: {
            admin: 5,
            sellers: { min: 100, max: 120 },
            staff: { min: 45, max: 75 },
        },
        warehousesPerCompany: { min: 2, max: 3 },
        warehousesPerB2BCompany: { min: 2, max: 4 },
        ordersPerCompanyPerMonth: {
            fashion: { min: 40, max: 60 },
            electronics: { min: 30, max: 50 },
            b2b: { min: 20, max: 40 },
        },
        skusPerWarehouse: { min: 10, max: 15 },
        pickListBatchSize: { min: 5, max: 15 },
        sessionsPerUser: { min: 2, max: 5 },
    },

    // Business Type Distribution (must sum to 100)
    businessTypes: {
        fashion: 40,
        electronics: 35,
        b2b: 25,
    },

    // Company Status Distribution (must sum to 100)
    companyStatus: {
        approved: 85,
        kyc_submitted: 10,
        suspended: 5,
    },

    // KYC Status Distribution (must sum to 100)
    kycStatus: {
        verified: 65,
        pending: 30,
        rejected: 5,
    },

    // Delivery Status Distribution (must sum to 100)
    deliveryStatus: {
        delivered: 87,
        ndr: 7,
        rto: 6,
    },

    // Payment Method by City Tier
    paymentMethodByTier: {
        metro: { cod: 50, prepaid: 50 },
        tier2: { cod: 65, prepaid: 35 },
        tier3: { cod: 75, prepaid: 25 },
    },

    // Electronics category has higher prepaid (trust factor)
    electronicsPayment: { cod: 40, prepaid: 60 },

    // NDR Type Distribution (must sum to 100)
    ndrTypes: {
        customer_unavailable: 40,
        address_issue: 30,
        payment_issue: 20,
        refused: 10,
    },

    // NDR Status Distribution (must sum to 100)
    ndrStatus: {
        detected: 40,
        in_resolution: 30,
        resolved: 20,
        rto_triggered: 10,
    },

    // RTO Reason Distribution (must sum to 100)
    rtoReasons: {
        ndr_unresolved: 60,
        customer_cancellation: 25,
        damaged_in_transit: 10,
        refused: 5,
    },

    // RTO Return Status Distribution
    rtoReturnStatus: {
        onTime: 60,
        delayed: 30,
        inTransit: 10,
    },

    // QC Pass Rate (percentage)
    qcPassRate: 70,

    // Carrier Distribution (must sum to 100)
    carriers: {
        delhivery: 33,
        /*
        bluedart: 0,
        ecom_express: 0,
        dtdc: 0,
        xpressbees: 0,
        */
        velocity: 34,
        ekart: 33,
    },

    // City Tier Distribution (must sum to 100)
    cityTiers: {
        metro: 50,
        tier2: 35,
        tier3: 15,
    },

    // Customer Location Distribution
    customerLocation: {
        sameState: 60,
        differentState: 40,
    },

    // Seasonal Multipliers
    seasonalMultipliers: {
        diwali: 1.5,      // October-November
        christmas: 1.3,    // December
        wedding: 1.2,      // January-February, November-December
        monsoon: 0.9,      // June-August
        summer: 0.95,      // March-May
        normal: 1.0,
    },

    // Wallet Configuration
    wallet: {
        initialBalance: { min: 5000, max: 50000 },
        lowBalanceThreshold: 500,
        rechargeAmount: { min: 10000, max: 30000 },
        rtoChargeMultiplier: { min: 1.2, max: 1.5 },
    },

    // Pick List Configuration
    pickList: {
        status: {
            PENDING: 40,
            ASSIGNED: 20,
            IN_PROGRESS: 15,
            COMPLETED: 20,
            PARTIAL: 5,
        },
        priority: {
            LOW: 5,
            MEDIUM: 60,
            HIGH: 25,
            URGENT: 10,
        },
        minutesPerItem: 1.5,
        accuracyRange: { min: 85, max: 100 },
    },

    // Order Source Distribution
    orderSources: {
        manual: 40,
        shopify: 30,
        woocommerce: 20,
        api: 10,
    },

    // OAuth Distribution
    oauthDistribution: {
        email: 70,
        google: 30,
    },

    // Profile Completion
    profileCompletion: {
        seller: { min: 80, max: 100 },
        staff: { min: 60, max: 90 },
    },

    // Team Status Distribution
    teamStatus: {
        active: 90,
        invited: 10,
    },

    // Discount Distribution
    discounts: {
        none: 70,
        tenPercent: 20,
        fifteenPercent: 10,
    },

    // Date Range (12 months of data)
    dateRange: {
        monthsBack: 12,
    },

    // Delivery Time Estimates (in days)
    deliveryTimes: {
        metroToMetro: { min: 2, max: 3 },
        metroToTier2: { min: 3, max: 5 },
        crossRegion: { min: 4, max: 7 },
    },

    // RTO Transit Time (in days)
    rtoTransitDays: { min: 5, max: 10 },

    // COD Remittance Delay (in days)
    codRemittanceDays: { min: 3, max: 7 },

    // Pickup Delay (in days after order)
    pickupDelay: { min: 1, max: 3 },

    // NDR Resolution SLA (in hours)
    ndrResolutionSLA: 48,
};

export type BusinessType = 'fashion' | 'electronics' | 'b2b';
export type CityTier = 'metro' | 'tier2' | 'tier3';
export type PaymentMethod = 'cod' | 'prepaid';
export type DeliveryStatus = 'delivered' | 'ndr' | 'rto';
export type NDRType = 'address_issue' | 'customer_unavailable' | 'refused' | 'payment_issue' | 'other';
export type RTOReason = 'ndr_unresolved' | 'customer_cancellation' | 'damaged_in_transit' | 'refused' | 'other';
export type CarrierName = 'delhivery' | 'velocity' | 'ekart'; // | 'bluedart' | 'ecom_express' | 'dtdc' | 'xpressbees';
