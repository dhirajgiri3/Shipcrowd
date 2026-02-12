const COURIER_LOGO_MAP: Record<string, string> = {
    velocity: '/logos/velocity.png',
    'velocity-shipfast': '/logos/velocity.png',
    delhivery: '/logos/delhivery.png',
    ekart: '/logos/ekart.png',
};

export function getCourierLogoPath(providerCode?: string, providerName?: string): string | undefined {
    const normalizedCode = (providerCode || '').trim().toLowerCase();
    if (normalizedCode && COURIER_LOGO_MAP[normalizedCode]) {
        return COURIER_LOGO_MAP[normalizedCode];
    }

    const normalizedName = (providerName || '').trim().toLowerCase();
    if (!normalizedName) return undefined;
    if (normalizedName.includes('velocity')) return COURIER_LOGO_MAP.velocity;
    if (normalizedName.includes('delhivery')) return COURIER_LOGO_MAP.delhivery;
    if (normalizedName.includes('ekart')) return COURIER_LOGO_MAP.ekart;

    return undefined;
}
