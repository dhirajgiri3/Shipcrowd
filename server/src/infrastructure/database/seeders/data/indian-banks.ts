/**
 * Indian Banks Database
 * 
 * Bank data with IFSC prefixes for realistic banking details.
 */

import { selectRandom, randomInt, generateNumericString } from '../utils/random.utils';

export interface BankData {
    name: string;
    shortName: string;
    ifscPrefix: string;
    branchCount: number; // Approximate number of branches
    isNationalized: boolean;
    supportedUPI: boolean;
}

export const INDIAN_BANKS: BankData[] = [
    // Public Sector Banks
    { name: 'State Bank of India', shortName: 'SBI', ifscPrefix: 'SBIN', branchCount: 22000, isNationalized: true, supportedUPI: true },
    { name: 'Bank of Baroda', shortName: 'BOB', ifscPrefix: 'BARB', branchCount: 8000, isNationalized: true, supportedUPI: true },
    { name: 'Punjab National Bank', shortName: 'PNB', ifscPrefix: 'PUNB', branchCount: 10000, isNationalized: true, supportedUPI: true },
    { name: 'Canara Bank', shortName: 'CB', ifscPrefix: 'CNRB', branchCount: 9000, isNationalized: true, supportedUPI: true },
    { name: 'Union Bank of India', shortName: 'UBI', ifscPrefix: 'UBIN', branchCount: 9000, isNationalized: true, supportedUPI: true },
    { name: 'Bank of India', shortName: 'BOI', ifscPrefix: 'BKID', branchCount: 5000, isNationalized: true, supportedUPI: true },
    { name: 'Indian Bank', shortName: 'IB', ifscPrefix: 'IDIB', branchCount: 6000, isNationalized: true, supportedUPI: true },
    { name: 'Central Bank of India', shortName: 'CBI', ifscPrefix: 'CBIN', branchCount: 5000, isNationalized: true, supportedUPI: true },

    // Private Sector Banks
    { name: 'HDFC Bank', shortName: 'HDFC', ifscPrefix: 'HDFC', branchCount: 6000, isNationalized: false, supportedUPI: true },
    { name: 'ICICI Bank', shortName: 'ICICI', ifscPrefix: 'ICIC', branchCount: 5200, isNationalized: false, supportedUPI: true },
    { name: 'Axis Bank', shortName: 'AXIS', ifscPrefix: 'UTIB', branchCount: 4500, isNationalized: false, supportedUPI: true },
    { name: 'Kotak Mahindra Bank', shortName: 'KOTAK', ifscPrefix: 'KKBK', branchCount: 1600, isNationalized: false, supportedUPI: true },
    { name: 'Yes Bank', shortName: 'YES', ifscPrefix: 'YESB', branchCount: 1100, isNationalized: false, supportedUPI: true },
    { name: 'IndusInd Bank', shortName: 'INDUS', ifscPrefix: 'INDB', branchCount: 2000, isNationalized: false, supportedUPI: true },
    { name: 'IDFC First Bank', shortName: 'IDFC', ifscPrefix: 'IDFB', branchCount: 700, isNationalized: false, supportedUPI: true },
    { name: 'Federal Bank', shortName: 'FB', ifscPrefix: 'FDRL', branchCount: 1300, isNationalized: false, supportedUPI: true },
    { name: 'RBL Bank', shortName: 'RBL', ifscPrefix: 'RATN', branchCount: 500, isNationalized: false, supportedUPI: true },
    { name: 'South Indian Bank', shortName: 'SIB', ifscPrefix: 'SIBL', branchCount: 950, isNationalized: false, supportedUPI: true },
];

/**
 * Select a random bank
 */
export function selectBank(): BankData {
    // Weight towards popular banks
    const popularBanks = INDIAN_BANKS.filter(
        (b) => ['SBI', 'HDFC', 'ICICI', 'AXIS', 'PNB', 'BOB'].includes(b.shortName)
    );

    // 70% chance of popular bank
    if (Math.random() < 0.7) {
        return selectRandom(popularBanks);
    }

    return selectRandom(INDIAN_BANKS);
}

/**
 * Get bank by name
 */
export function getBankByName(name: string): BankData | undefined {
    return INDIAN_BANKS.find(
        (b) => b.name.toLowerCase() === name.toLowerCase() ||
            b.shortName.toLowerCase() === name.toLowerCase()
    );
}

/**
 * Generate an IFSC code for a bank
 */
export function generateIFSC(bankNameOrData: string | BankData): string {
    let bank: BankData | undefined;

    if (typeof bankNameOrData === 'string') {
        bank = getBankByName(bankNameOrData);
        if (!bank) {
            bank = selectBank();
        }
    } else {
        bank = bankNameOrData;
    }

    // IFSC format: AAAA0NNNNNN (4 chars bank code + 0 + 6 chars branch code)
    const branchCode = generateNumericString(6);
    return `${bank.ifscPrefix}0${branchCode}`;
}

/**
 * Generate a bank account number
 * Different banks have different account number formats
 */
export function generateAccountNumber(bank?: BankData): string {
    const lengths: Record<string, number> = {
        HDFC: 14,
        ICIC: 12,
        SBIN: 11,
        UTIB: 15,
        KKBK: 14,
        PUNB: 16,
        BARB: 14,
        CNRB: 13,
        UBIN: 14,
        BKID: 15,
    };

    const prefix = bank?.ifscPrefix || 'HDFC';
    const length = lengths[prefix] || 14;

    return generateNumericString(length);
}

/**
 * Generate a UPI ID
 */
export function generateUPIId(name: string, domain: string = 'paytm'): string {
    const cleanName = name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);

    const upiProviders = ['paytm', 'gpay', 'phonepe', 'ybl', 'oksbi', 'okhdfcbank', 'okicici', 'okaxis'];
    const provider = selectRandom(upiProviders);

    const random = randomInt(10, 99);
    return `${cleanName}${random}@${provider}`;
}

/**
 * Generate a PAN number
 * Format: AAAAA9999A (5 letters + 4 digits + 1 letter)
 */
export function generatePAN(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // First 3 chars: Random
    const first3 = Array.from({ length: 3 }, () => chars[randomInt(0, 25)]).join('');

    // 4th char: P for individual, C for company, etc.
    const type = selectRandom(['P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G']);

    // 5th char: First letter of surname (random for our purpose)
    const surname = chars[randomInt(0, 25)];

    // 4 digits
    const digits = generateNumericString(4);

    // Last char: Check letter (random for our purpose)
    const check = chars[randomInt(0, 25)];

    return `${first3}${type}${surname}${digits}${check}`;
}

/**
 * Generate a GSTIN number
 * Format: 22AAAAA0000A1Z5
 * - First 2 digits: State code
 * - Next 10 chars: PAN
 * - 13th char: Entity number (1-9, A-Z)
 * - 14th char: Z (default)
 * - 15th char: Checksum
 */
export function generateGSTIN(stateCode: string, pan?: string): string {
    const panNumber = pan || generatePAN();
    const entityNumber = selectRandom(['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']);

    // Simplified checksum (in reality, it's calculated using a specific algorithm)
    const checksumChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const checksum = checksumChars[randomInt(0, checksumChars.length - 1)];

    return `${stateCode}${panNumber}${entityNumber}Z${checksum}`;
}

/**
 * Generate an Aadhaar number
 * Format: XXXX XXXX XXXX (12 digits)
 * First digit cannot be 0 or 1
 */
export function generateAadhaar(): string {
    // First digit: 2-9
    const firstDigit = randomInt(2, 9).toString();

    // Remaining 11 digits
    const remaining = generateNumericString(11);

    const number = firstDigit + remaining;

    // Format with spaces
    return `${number.slice(0, 4)} ${number.slice(4, 8)} ${number.slice(8, 12)}`;
}

/**
 * Validate PAN format (basic validation)
 */
export function isValidPAN(pan: string): boolean {
    const panRegex = /^[A-Z]{3}[PCHATFBLJ][A-Z][0-9]{4}[A-Z]$/;
    return panRegex.test(pan);
}

/**
 * Validate GSTIN format (basic validation)
 */
export function isValidGSTIN(gstin: string): boolean {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
    return gstinRegex.test(gstin);
}
