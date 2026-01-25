// Site configuration
export const siteConfig = {
    name: 'Shipcrowd',
    description: 'AI-Powered Multi-Carrier Shipping Platform',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

    // Navigation
    nav: {
        main: [
            { name: 'Features', href: '#features' },
            { name: 'How It Works', href: '#how-it-works' },
            { name: 'Pricing', href: '#pricing' },
            { name: 'About', href: '#about' },
        ],
    },

    // Links
    links: {
        twitter: 'https://twitter.com/Shipcrowd',
        github: 'https://github.com/Shipcrowd',
        linkedin: 'https://linkedin.com/company/Shipcrowd',
    },

    // Features
    features: {
        carriers: [
            'Delhivery',
            'DTDC',
            'Blue Dart',
            'FedEx',
            'DHL',
            'Xpressbees',
            'Ekart',
            'India Post',
            'Ecom Express',
            'Shadowfax',
        ],
    },
} as const;

export type SiteConfig = typeof siteConfig;
