/**
 * Carrier/Courier Constants
 * 
 * Centralized carrier definitions with logos, IDs, and metadata.
 * Single source of truth for all carrier-related data.
 */

export const CARRIERS = {
    DELHIVERY: {
        name: 'Delhivery',
        logo: '/logos/delhivery.png',
        id: 'delhivery',
    },
    DTDC: {
        name: 'DTDC',
        logo: '/logos/dtdc.png',
        id: 'dtdc',
    },
    BLUE_DART: {
        name: 'Blue Dart',
        logo: '/logos/blue-dart.png',
        id: 'bluedart',
    },
    FEDEX: {
        name: 'FedEx',
        logo: '/logos/fedex.png',
        id: 'fedex',
    },
    DHL: {
        name: 'DHL',
        logo: '/logos/dhl.png',
        id: 'dhl',
    },
    XPRESSBEES: {
        name: 'Xpressbees',
        logo: '/logos/xpressbees.png',
        id: 'xpressbees',
    },
    EKART: {
        name: 'Ekart',
        logo: '/logos/ekart.png',
        id: 'ekart',
    },
    INDIA_POST: {
        name: 'India Post',
        logo: '/logos/india-post.png',
        id: 'indiapost',
    },
    ECOM_EXPRESS: {
        name: 'Ecom Express',
        logo: '/logos/ecom-express.png',
        id: 'ecomexpress',
    },
    SHADOWFAX: {
        name: 'Shadowfax',
        logo: '/logos/shadowfax.png',
        id: 'shadowfax',
    },
} as const;

export const CARRIER_LIST = Object.values(CARRIERS);

export type CarrierId = typeof CARRIERS[keyof typeof CARRIERS]['id'];
export type Carrier = typeof CARRIERS[keyof typeof CARRIERS];

/**
 * Legacy courier logo mapping for backward compatibility
 * Maps courier names to logo paths
 */
export const COURIER_LOGOS: Record<string, string> = {
    'Delhivery': CARRIERS.DELHIVERY.logo,
    'Xpressbees': CARRIERS.XPRESSBEES.logo,
    'DTDC': CARRIERS.DTDC.logo,
    'Bluedart': CARRIERS.BLUE_DART.logo,
    'Blue Dart': CARRIERS.BLUE_DART.logo,
    'EcomExpress': CARRIERS.ECOM_EXPRESS.logo,
    'Ecom Express': CARRIERS.ECOM_EXPRESS.logo,
    'DHL': CARRIERS.DHL.logo,
    'FedEx': CARRIERS.FEDEX.logo,
    'Ekart': CARRIERS.EKART.logo,
    'Shadowfax': CARRIERS.SHADOWFAX.logo,
    'IndiaPost': CARRIERS.INDIA_POST.logo,
    'India Post': CARRIERS.INDIA_POST.logo,
};

/**
 * Get courier logo by name
 * @param courierName - Name of the courier
 * @returns Logo path or default carrier logo
 */
export const getCourierLogo = (courierName: string): string => {
    return COURIER_LOGOS[courierName] || '/logos/default-carrier.png';
};
