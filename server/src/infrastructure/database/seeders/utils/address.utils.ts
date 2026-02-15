/**
 * Address Generation Utilities
 * 
 * Utilities for generating realistic Indian addresses.
 */

import { maybeExecute, selectRandom } from './random.utils';

// Street name templates
const STREET_NAMES = [
    'MG Road',
    'Main Street',
    'Park Avenue',
    'Gandhi Road',
    'Station Road',
    'Market Street',
    'Railway Road',
    'Temple Street',
    'Church Road',
    'Lake View Road',
    'Ring Road',
    'Bypass Road',
    'Industrial Road',
    'College Road',
];

// Apartment/Building names
const APARTMENT_NAMES = [
    'Shanti Apartments',
    'Green Heights',
    'Royal Palace',
    'Krishna Residency',
    'Gokul Apartments',
    'Paradise Towers',
    'Sunrise Villa',
    'Lake View Heights',
    'Garden City Apartments',
    'Metro Heights',
    'Fortune Plaza',
    'Silver Oak Residency',
    'Golden Meadows',
    'Pearl Heights',
];

// Society names
const SOCIETY_NAMES = [
    'Harmony Society',
    'Unity Housing Complex',
    'Prasad Nagar',
    'Ram Nagar',
    'Gandhi Nagar',
    'Nehru Colony',
    'Shastri Nagar',
    'Patel Colony',
    'Vidya Nagar',
    'Ashok Nagar',
    'Indira Colony',
    'Rajiv Nagar',
];

// Industrial area names
const INDUSTRIAL_AREAS = [
    'MIDC Industrial Area',
    'SEZ Zone',
    'Industrial Estate',
    'Export Promotion Zone',
    'Electronic City',
    'IT Park',
    'Industrial Park',
    'Manufacturing Hub',
    'Techno Park',
    'Business Park',
];

// Landmarks
const LANDMARKS = [
    'Near City Hospital',
    'Opposite Metro Station',
    'Behind Central Mall',
    'Near HDFC Bank',
    'Next to Coffee Day',
    'Adjacent to Post Office',
    'Near Railway Station',
    'Behind Bus Stand',
    'Near SBI Branch',
    'Opposite Police Station',
    'Near Municipal Office',
    'Behind Reliance Mart',
    'Near Petrol Pump',
    'Opposite School',
    'Near Temple',
    'Behind Mosque',
    'Near Church',
    'Opposite Park',
    'Near Sports Complex',
    'Behind Shopping Complex',
];

/**
 * Generate a street address for residential/commercial use
 */
export function generateStreetAddress(_city: string): string {
    const templates = [
        // House number + Street
        () => `${randomHouseNumber()} ${selectRandom(STREET_NAMES)}`,
        // Flat in apartment
        () => `Flat ${randomFlat()}, ${selectRandom(APARTMENT_NAMES)}`,
        // Plot in sector
        () => `Plot ${randomPlot()}, Sector ${randomSector()}`,
        // House in society
        () => `House ${randomHouseNumber()}, ${selectRandom(SOCIETY_NAMES)}`,
        // Building address
        () => `${randomFloor()}, ${selectRandom(APARTMENT_NAMES)}, ${selectRandom(STREET_NAMES)}`,
    ];

    return selectRandom(templates)();
}

/**
 * Generate a landmark (60% probability)
 */
export function generateLandmark(): string | undefined {
    return maybeExecute(() => selectRandom(LANDMARKS), 0.6);
}

/**
 * Generate an industrial/warehouse address
 */
export function generateIndustrialAddress(_city: string): string {
    const templates = [
        () => `Plot ${randomPlot()}, ${selectRandom(INDUSTRIAL_AREAS)}`,
        () => `Unit ${randomUnit()}, ${selectRandom(INDUSTRIAL_AREAS)}`,
        () => `Shed ${randomShed()}, ${selectRandom(INDUSTRIAL_AREAS)}`,
        () => `Gala ${randomGala()}, ${selectRandom(INDUSTRIAL_AREAS)}`,
        () => `Survey No. ${randomSurvey()}, ${selectRandom(INDUSTRIAL_AREAS)}`,
    ];

    return selectRandom(templates)();
}

/**
 * Generate a warehouse location code
 * Format: Zone-Aisle-Rack (e.g., "A-12-03")
 */
export function generateLocationCode(): string {
    const zones = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const zone = selectRandom(zones);
    const aisle = Math.floor(Math.random() * 30 + 1).toString().padStart(2, '0');
    const rack = Math.floor(Math.random() * 50 + 1).toString().padStart(2, '0');
    return `${zone}-${aisle}-${rack}`;
}

/**
 * Generate a barcode for a product
 */
export function generateBarcode(sku: string): string {
    const prefix = sku.replace(/-/g, '').slice(0, 4).toUpperCase();
    const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${prefix}${random}`;
}

// Helper functions for random address components
function randomHouseNumber(): string {
    const num = Math.floor(Math.random() * 999) + 1;
    return Math.random() > 0.7 ? `${num}/${Math.floor(Math.random() * 99) + 1}` : num.toString();
}

function randomFlat(): string {
    const floor = Math.floor(Math.random() * 20) + 1;
    const unit = Math.floor(Math.random() * 4) + 1;
    return Math.random() > 0.5 ? `${floor}0${unit}` : `${String.fromCharCode(64 + unit)}-${floor}`;
}

function randomPlot(): string {
    return (Math.floor(Math.random() * 200) + 1).toString();
}

function randomSector(): string {
    return (Math.floor(Math.random() * 50) + 1).toString();
}

function randomFloor(): string {
    const floor = Math.floor(Math.random() * 20) + 1;
    const suffix = floor === 1 ? 'st' : floor === 2 ? 'nd' : floor === 3 ? 'rd' : 'th';
    return `${floor}${suffix} Floor`;
}

function randomUnit(): string {
    return (Math.floor(Math.random() * 100) + 1).toString();
}

function randomShed(): string {
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const num = Math.floor(Math.random() * 50) + 1;
    return `${letter}-${num}`;
}

function randomGala(): string {
    return (Math.floor(Math.random() * 500) + 1).toString();
}

function randomSurvey(): string {
    const num = Math.floor(Math.random() * 999) + 1;
    return Math.random() > 0.7 ? `${num}/${Math.floor(Math.random() * 9) + 1}` : num.toString();
}
