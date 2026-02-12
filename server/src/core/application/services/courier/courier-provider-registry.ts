type IntegrationMatch = Record<string, unknown>;

export type CanonicalCourierProvider = 'velocity' | 'delhivery' | 'ekart';

const SUPPORTED_PROVIDERS: readonly CanonicalCourierProvider[] = [
    'velocity',
    'delhivery',
    'ekart',
] as const;

const PROVIDER_ALIASES: Record<CanonicalCourierProvider, readonly string[]> = {
    velocity: ['velocity', 'velocity-shipfast', 'velocity shipfast', 'shipfast'],
    delhivery: ['delhivery'],
    ekart: ['ekart', 'e-kart'],
};

const PROVIDER_LABELS: Record<CanonicalCourierProvider, string> = {
    velocity: 'Velocity',
    delhivery: 'Delhivery',
    ekart: 'Ekart',
};

const INTEGRATION_PROVIDER: Record<CanonicalCourierProvider, string> = {
    velocity: 'velocity-shipfast',
    delhivery: 'delhivery',
    ekart: 'ekart',
};

export class CourierProviderRegistry {
    static getSupportedProviders(): readonly CanonicalCourierProvider[] {
        return SUPPORTED_PROVIDERS;
    }

    static normalize(provider: string): string {
        return String(provider || '').trim().toLowerCase();
    }

    static toCanonical(provider: string): CanonicalCourierProvider | null {
        const normalized = this.normalize(provider);
        if (!normalized) return null;

        const matched = SUPPORTED_PROVIDERS.find((candidate) =>
            PROVIDER_ALIASES[candidate].includes(normalized)
        );

        return matched || null;
    }

    static isSupported(provider: string): boolean {
        return this.toCanonical(provider) !== null;
    }

    static getAliases(provider: string): string[] {
        const canonical = this.toCanonical(provider);
        if (!canonical) {
            const normalized = this.normalize(provider);
            return normalized ? [normalized] : [];
        }

        return [...PROVIDER_ALIASES[canonical]];
    }

    static getLabel(provider: string): string {
        const canonical = this.toCanonical(provider);
        if (!canonical) {
            const normalized = this.normalize(provider);
            return normalized ? normalized.toUpperCase() : 'UNKNOWN';
        }

        return PROVIDER_LABELS[canonical];
    }

    static getIntegrationProvider(provider: string): string {
        const canonical = this.toCanonical(provider);
        if (!canonical) {
            return this.normalize(provider);
        }

        return INTEGRATION_PROVIDER[canonical];
    }

    static buildIntegrationMatch(provider: string): IntegrationMatch {
        const canonical = this.toCanonical(provider);
        if (!canonical) {
            return { provider: this.normalize(provider) };
        }

        if (canonical === 'ekart') {
            return {
                $or: [{ provider: 'ekart' }, { platform: 'ekart' }],
            };
        }

        const aliases = this.getAliases(canonical).map((alias) => ({ provider: alias }));
        return aliases.length > 1 ? { $or: aliases } : aliases[0];
    }

    static buildIntegrationPatch(provider: string): Record<string, unknown> {
        const canonical = this.toCanonical(provider);
        if (!canonical) {
            return { provider: this.normalize(provider) };
        }

        if (canonical === 'ekart') {
            return { provider: 'ekart', platform: 'ekart' };
        }

        return { provider: this.getIntegrationProvider(canonical) };
    }

    static getCarrierCandidates(provider: string): string[] {
        return this.getAliases(provider);
    }
}

export default CourierProviderRegistry;
