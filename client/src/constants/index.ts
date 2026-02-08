export * from './geography';
export * from './carriers';

export const isUsingMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

export const getCourierLogo = (courierName: string) => {
    const slug = courierName?.toLowerCase() || '';
    switch (slug) {
        case 'delhivery': return '/logos/delhivery.png';
        case 'ekart': return '/logos/ekart.png';
        case 'xpressbees': return '/logos/xpressbees.png';
        case 'dtdc': return '/logos/dtdc.png';
        case 'blue dart': return '/logos/blue-dart.png';
        case 'ecom express': return '/logos/ecom-express.png';
        case 'fedex': return '/logos/fedex.png';
        case 'shadowfax': return '/logos/shadowfax.png';
        case 'amazon': return '/logos/amazon.svg';
        case 'dhl': return '/logos/dhl.png';
        case 'india post': return '/logos/india-post.png';
        case 'velocity': return '/logos/velocity.png';
        default: return `/logos/${slug}.png`;
    }
};
