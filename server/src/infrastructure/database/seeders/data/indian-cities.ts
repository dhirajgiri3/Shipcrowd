/**
 * Indian Cities Database
 * 
 * Complete city data with coordinates and pincodes for realistic address generation.
 */

import { SEED_CONFIG } from '../config';
import { selectRandom, selectWeightedFromObject } from '../utils/random.utils';

export interface CityData {
    name: string;
    state: string;
    stateCode: string;
    lat: number;
    lng: number;
    pincodes: string[];
}

export type CityTier = 'metro' | 'tier2' | 'tier3';

/**
 * Select a weighted city based on tier distribution defined in config
 */
export function selectWeightedCity(): CityData {
    const tier = selectWeightedFromObject(SEED_CONFIG.cityTiers) as CityTier;
    const cities = INDIAN_CITIES[tier];
    return selectRandom(cities);
}

export const INDIAN_CITIES: Record<CityTier, CityData[]> = {
    metro: [
        {
            name: 'Mumbai',
            state: 'Maharashtra',
            stateCode: '27',
            lat: 19.0760,
            lng: 72.8777,
            pincodes: ['400001', '400020', '400053', '400070', '400092', '400037', '400058', '400076', '400080', '400097'],
        },
        {
            name: 'Delhi',
            state: 'Delhi',
            stateCode: '07',
            lat: 28.7041,
            lng: 77.1025,
            pincodes: ['110001', '110016', '110065', '110092', '110017', '110019', '110024', '110025', '110044', '110048'],
        },
        {
            name: 'Bangalore',
            state: 'Karnataka',
            stateCode: '29',
            lat: 12.9716,
            lng: 77.5946,
            pincodes: ['560001', '560037', '560068', '560103', '560011', '560022', '560043', '560066', '560078', '560095'],
        },
        {
            name: 'Hyderabad',
            state: 'Telangana',
            stateCode: '36',
            lat: 17.3850,
            lng: 78.4867,
            pincodes: ['500001', '500034', '500072', '500095', '500016', '500028', '500044', '500063', '500081', '500013'],
        },
        {
            name: 'Chennai',
            state: 'Tamil Nadu',
            stateCode: '33',
            lat: 13.0827,
            lng: 80.2707,
            pincodes: ['600001', '600028', '600095', '600116', '600017', '600024', '600040', '600042', '600086', '600119'],
        },
        {
            name: 'Kolkata',
            state: 'West Bengal',
            stateCode: '19',
            lat: 22.5726,
            lng: 88.3639,
            pincodes: ['700001', '700019', '700053', '700091', '700012', '700028', '700037', '700064', '700068', '700084'],
        },
    ],
    tier2: [
        {
            name: 'Pune',
            state: 'Maharashtra',
            stateCode: '27',
            lat: 18.5204,
            lng: 73.8567,
            pincodes: ['411001', '411028', '411057', '411011', '411014', '411021', '411030', '411038', '411041', '411048'],
        },
        {
            name: 'Jaipur',
            state: 'Rajasthan',
            stateCode: '08',
            lat: 26.9124,
            lng: 75.7873,
            pincodes: ['302001', '302021', '302039', '302004', '302012', '302015', '302017', '302019', '302020', '302033'],
        },
        {
            name: 'Lucknow',
            state: 'Uttar Pradesh',
            stateCode: '09',
            lat: 26.8467,
            lng: 80.9462,
            pincodes: ['226001', '226016', '226028', '226002', '226003', '226004', '226005', '226006', '226007', '226018'],
        },
        {
            name: 'Ahmedabad',
            state: 'Gujarat',
            stateCode: '24',
            lat: 23.0225,
            lng: 72.5714,
            pincodes: ['380001', '380015', '380054', '380004', '380006', '380007', '380009', '380013', '380021', '380027'],
        },
        {
            name: 'Surat',
            state: 'Gujarat',
            stateCode: '24',
            lat: 21.1702,
            lng: 72.8311,
            pincodes: ['395001', '395007', '395017', '395002', '395003', '395004', '395005', '395006', '395009', '395010'],
        },
        {
            name: 'Indore',
            state: 'Madhya Pradesh',
            stateCode: '23',
            lat: 22.7196,
            lng: 75.8577,
            pincodes: ['452001', '452010', '452018', '452002', '452003', '452004', '452005', '452006', '452007', '452009'],
        },
    ],
    tier3: [
        {
            name: 'Coimbatore',
            state: 'Tamil Nadu',
            stateCode: '33',
            lat: 11.0168,
            lng: 76.9558,
            pincodes: ['641001', '641012', '641035', '641002', '641003', '641004', '641005', '641006', '641007', '641018'],
        },
        {
            name: 'Kanpur',
            state: 'Uttar Pradesh',
            stateCode: '09',
            lat: 26.4499,
            lng: 80.3319,
            pincodes: ['208001', '208012', '208027', '208002', '208003', '208004', '208005', '208006', '208007', '208011'],
        },
        {
            name: 'Nagpur',
            state: 'Maharashtra',
            stateCode: '27',
            lat: 21.1458,
            lng: 79.0882,
            pincodes: ['440001', '440010', '440025', '440002', '440003', '440004', '440006', '440008', '440009', '440012'],
        },
        {
            name: 'Visakhapatnam',
            state: 'Andhra Pradesh',
            stateCode: '37',
            lat: 17.6869,
            lng: 83.2185,
            pincodes: ['530001', '530016', '530045', '530002', '530003', '530004', '530005', '530006', '530007', '530013'],
        },
    ],
};

// Flatten all cities for easy access
export const ALL_CITIES: CityData[] = [
    ...INDIAN_CITIES.metro,
    ...INDIAN_CITIES.tier2,
    ...INDIAN_CITIES.tier3,
];

/**
 * Get a city by name
 */
export function getCityByName(name: string): CityData | undefined {
    return ALL_CITIES.find((city) => city.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get the state for a city
 */
export function getStateForCity(cityName: string): string {
    const city = getCityByName(cityName);
    return city?.state || 'Maharashtra';
}

/**
 * Get the state code for a city (for GSTIN generation)
 */
export function getStateCodeForCity(cityName: string): string {
    const city = getCityByName(cityName);
    return city?.stateCode || '27';
}

/**
 * Get the tier for a city
 */
export function getCityTier(cityName: string): CityTier {
    if (INDIAN_CITIES.metro.some((c) => c.name === cityName)) return 'metro';
    if (INDIAN_CITIES.tier2.some((c) => c.name === cityName)) return 'tier2';
    return 'tier3';
}

/**
 * Get coordinates for a city
 */
export function getCityCoordinates(cityName: string): { lat: number; lng: number } {
    const city = getCityByName(cityName);
    return city ? { lat: city.lat, lng: city.lng } : { lat: 19.0760, lng: 72.8777 }; // Mumbai fallback
}

/**
 * Generate a random pincode for a city
 */
export function generatePincodeForCity(cityName: string): string {
    const city = getCityByName(cityName);
    if (city && city.pincodes.length > 0) {
        return city.pincodes[Math.floor(Math.random() * city.pincodes.length)];
    }
    return '400001'; // Mumbai fallback
}

/**
 * Get nearby cities (for multi-warehouse scenarios)
 */
export function getNearbyCities(cityName: string): CityData[] {
    const city = getCityByName(cityName);
    if (!city) return INDIAN_CITIES.metro;

    const state = city.state;

    // First, try to find cities in the same state
    const sameStateCities = ALL_CITIES.filter(
        (c) => c.state === state && c.name !== cityName
    );

    if (sameStateCities.length > 0) {
        return sameStateCities;
    }

    // Otherwise, return metro cities
    return INDIAN_CITIES.metro.filter((c) => c.name !== cityName);
}

/**
 * Calculate approximate distance between two cities (in km)
 */
export function calculateDistance(city1: string, city2: string): number {
    const c1 = getCityCoordinates(city1);
    const c2 = getCityCoordinates(city2);

    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
    const dLon = ((c2.lng - c1.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((c1.lat * Math.PI) / 180) *
        Math.cos((c2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

/**
 * Check if two cities are in the same state
 */
export function isSameState(city1: string, city2: string): boolean {
    const c1 = getCityByName(city1);
    const c2 = getCityByName(city2);
    return c1?.state === c2?.state;
}

/**
 * Get shipping zone based on origin and destination cities
 */
export function getShippingZone(originCity: string, destCity: string): string {
    if (isSameState(originCity, destCity)) {
        return 'zone_a'; // Intra-state
    }

    const distance = calculateDistance(originCity, destCity);
    if (distance < 500) return 'zone_b'; // Adjacent states
    if (distance < 1000) return 'zone_c'; // Regional
    if (distance < 2000) return 'zone_d'; // Long distance
    return 'zone_e'; // Pan-India
}
