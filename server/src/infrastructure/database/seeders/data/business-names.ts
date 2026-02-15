/**
 * Business Names Database
 * 
 * Templates and data for generating realistic Indian business names.
 */

import { BusinessType } from '../config';
import { selectRandom } from '../utils/random.utils';

// Adjectives for business names
const ADJECTIVES = [
    'Modern',
    'Elite',
    'Premium',
    'Royal',
    'Classic',
    'Trendy',
    'Urban',
    'Supreme',
    'Prime',
    'Golden',
    'Silver',
    'Diamond',
    'Crystal',
    'Mega',
    'Super',
    'Star',
    'Global',
    'National',
    'United',
    'Express',
];

// Indian words for business names
const INDIAN_WORDS = [
    'Bharat',
    'Desi',
    'Swadeshi',
    'Bharatiya',
    'Hindustani',
    'Apna',
    'Desh',
    'Jan',
    'Lok',
    'Shri',
];

// Founder/Family names for businesses
const FOUNDER_NAMES = [
    'Sharma',
    'Patel',
    'Kumar',
    'Singh',
    'Gupta',
    'Agarwal',
    'Reddy',
    'Jain',
    'Verma',
    'Rao',
    'Mehta',
    'Shah',
    'Kapoor',
    'Malhotra',
    'Bajaj',
    'Tata',
    'Birla',
    'Ambani',
    'Mittal',
    'Mahindra',
];

// Business name templates by category
const BUSINESS_NAME_TEMPLATES: Record<BusinessType, string[]> = {
    fashion: [
        '{City} Fashion Hub',
        '{Adjective} Styles',
        '{IndianWord} Garments',
        'Trendy {City} Boutique',
        '{Founder} Fashion House',
        'Saree {City}',
        'Ethnic {IndianWord}',
        '{City} Ethnic Wear',
        '{Adjective} Fabrics',
        '{Founder} Collection',
        'Style Street {City}',
        '{IndianWord} Fashion',
        'Dress Code {City}',
        '{Adjective} Threads',
        '{City} Apparel',
        'Vogue {City}',
        '{Founder} Textiles',
        '{IndianWord} Silks',
        'Fashion Forward {City}',
        '{Adjective} Couture',
    ],
    electronics: [
        '{City} Electronics',
        'Tech {Adjective} Store',
        '{IndianWord} Gadgets',
        'Digital {City} Hub',
        '{Founder} Tech Solutions',
        'Mobile {City}',
        'Smart Electronics {City}',
        '{City} Computers',
        '{Adjective} Tech Zone',
        'Gadget World {City}',
        '{Founder} Mobiles',
        'E-Zone {City}',
        '{IndianWord} Tech',
        'Digital Store {City}',
        '{Adjective} Electronics',
        'Tech Mart {City}',
        '{City} IT Solutions',
        '{Founder} Digital',
        'Click & Shop {City}',
        'Online Tech {City}',
    ],
    b2b: [
        '{City} Wholesale Traders',
        '{Founder} Distributors',
        'Industrial {City} Supplies',
        '{IndianWord} B2B Solutions',
        'Bulk Bazaar {City}',
        '{Adjective} Trading Company',
        '{Founder} Enterprises',
        '{City} Industrial Mart',
        'Wholesale Hub {City}',
        '{IndianWord} Traders',
        '{Founder} & Sons',
        'Mega Trade {City}',
        '{Adjective} Wholesale',
        'Business Mart {City}',
        '{IndianWord} Exports',
        '{Founder} Industries',
        'Trade Zone {City}',
        'B2B Express {City}',
        '{Adjective} Supplies',
        '{City} Trade Center',
    ],
};

/**
 * Generate a business name based on type and city
 */
export function generateBusinessName(businessType: BusinessType, city: string): string {
    const template = selectRandom(BUSINESS_NAME_TEMPLATES[businessType]);

    return template
        .replace('{City}', city)
        .replace('{Adjective}', selectRandom(ADJECTIVES))
        .replace('{IndianWord}', selectRandom(INDIAN_WORDS))
        .replace('{Founder}', selectRandom(FOUNDER_NAMES));
}

/**
 * Generate a business domain from company name
 */
export function generateBusinessDomain(companyName: string): string {
    // Remove common suffixes and create a domain-friendly name
    const cleanName = companyName
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);

    const tlds = ['com', 'in', 'co.in', 'net', 'org'];
    return `${cleanName}.${selectRandom(tlds)}`;
}

/**
 * Generate a tagline based on business type
 */
export function generateTagline(businessType: BusinessType): string {
    const taglines: Record<BusinessType, string[]> = {
        fashion: [
            'Style that speaks',
            'Fashion for everyone',
            'Dress to impress',
            'Your style destination',
            'Traditional meets modern',
            'Elegance redefined',
            'Wear your confidence',
        ],
        electronics: [
            'Technology for tomorrow',
            'Smart solutions, smarter life',
            'Innovation at your fingertips',
            'The future is here',
            'Connecting you to the world',
            'Quality electronics, best prices',
        ],
        b2b: [
            'Your business partner',
            'Wholesale excellence',
            'Quality at scale',
            'Trusted by businesses',
            'Industrial solutions',
            'Bulk orders, bulk savings',
        ],
    };

    return selectRandom(taglines[businessType]);
}

/**
 * Get the typical order values for a business type
 */
export function getOrderValueRange(businessType: BusinessType): { min: number; max: number } {
    const ranges: Record<BusinessType, { min: number; max: number }> = {
        fashion: { min: 500, max: 5000 },
        electronics: { min: 2000, max: 50000 },
        b2b: { min: 10000, max: 200000 },
    };
    return ranges[businessType];
}

/**
 * Get typical return rate for a business type
 */
export function getReturnRate(businessType: BusinessType): number {
    const rates: Record<BusinessType, number> = {
        fashion: 0.15, // 15% returns
        electronics: 0.08, // 8% returns
        b2b: 0.03, // 3% returns
    };
    return rates[businessType];
}
