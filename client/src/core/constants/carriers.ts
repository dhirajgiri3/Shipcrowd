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
