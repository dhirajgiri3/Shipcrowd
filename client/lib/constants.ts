// Courier logo mappings from /public/logos
export const COURIER_LOGOS: Record<string, string> = {
    'Delhivery': '/logos/delhivery.png',
    'Xpressbees': '/logos/xpressbees.png',
    'DTDC': '/logos/dtdc.png',
    'Bluedart': '/logos/blue-dart.png',
    'EcomExpress': '/logos/ecom-express.png',
    'DHL': '/logos/dhl.png',
    'FedEx': '/logos/fedex.png',
    'Ekart': '/logos/ekart.png',
    'Shadowfax': '/logos/shadowfax.png',
    'IndiaPost': '/logos/india-post.png',
};

export const getCourierLogo = (courierName: string): string => {
    return COURIER_LOGOS[courierName] || '/logos/default-carrier.png';
};
