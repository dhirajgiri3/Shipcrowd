/**
 * Address Validation Service
 *
 * Validates shipping addresses for completeness, accuracy, and deliverability.
 * enhancing the prevention layer for NDRs.
 */

import PincodeLookupService from '../logistics/pincode-lookup.service';
import logger from '../../../../shared/logger/winston.logger';
import axios from 'axios';

interface Address {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
}

interface ValidationResult {
    isValid: boolean;
    score: number; // 0 to 1
    issues: string[];
    normalizedAddress?: Address;
    type: 'valid' | 'invalid' | 'suspicious';
}

export class AddressValidationService {

    // Keywords indicating incomplete or junk addresses
    private static JUNK_KEYWORDS = [
        'test', 'demo', 'sample', 'abc', 'xyz', 'asd', '123', 'na',
        'undefined', 'null', 'unknown', 'check', 'fake'
    ];

    /**
     * Validate an address
     */
    static async validate(address: Address): Promise<ValidationResult> {
        const issues: string[] = [];
        let score = 1.0;

        // 1. Basic Completeness Check
        if (!address.line1 || address.line1.trim().length < 5) {
            issues.push('Address Line 1 is too short or missing');
            score -= 0.3;
        }

        if (this.containsJunkKeywords(address.line1)) {
            issues.push('Address Line 1 contains junk keywords');
            score -= 0.5;
        }

        // 2. Pincode Validation
        const cleanPincode = address.pincode?.trim();
        if (!PincodeLookupService.isValidPincodeFormat(cleanPincode)) {
            issues.push('Invalid pincode format');
            score -= 0.4;
            return {
                isValid: false,
                score: 0,
                issues,
                type: 'invalid'
            };
        }

        const pincodeDetails = PincodeLookupService.getPincodeDetails(cleanPincode);
        if (!pincodeDetails) {
            issues.push('Pincode not found in database (may be non-serviceable)');
            score -= 0.2;
        } else {
            // 3. City/State Consistency Check
            const cleanCity = address.city?.trim().toUpperCase();
            const cleanState = address.state?.trim().toUpperCase();

            const cityMatch = cleanCity === pincodeDetails.city || pincodeDetails.city.includes(cleanCity);
            const stateMatch = cleanState === pincodeDetails.state;

            if (!cityMatch) {
                // Soft failure for city mismatch (allow fuzzy matching or spelling diffs)
                issues.push(`City mismatch: Provided '${address.city}' but pincode belongs to '${pincodeDetails.city}'`);
                score -= 0.1;
            }

            if (!cleanState || !stateMatch) {
                issues.push(`State mismatch: Provided '${address.state}' but pincode belongs to '${pincodeDetails.state}'`);
                score -= 0.2;
            }
        }

        // 4. Determine validity based on score
        const isValid = score > 0.6;
        const type = score > 0.8 ? 'valid' : (score > 0.4 ? 'suspicious' : 'invalid');

        return {
            isValid,
            score: Math.max(0, score),
            issues,
            normalizedAddress: {
                ...address,
                city: pincodeDetails?.city || address.city,
                state: pincodeDetails?.state || address.state,
                pincode: cleanPincode
            },
            type
        };
    }

    /**
     * Check for junk keywords
     */
    private static containsJunkKeywords(text: string): boolean {
        if (!text) return false;
        const lowerText = text.toLowerCase();
        return this.JUNK_KEYWORDS.some(keyword => lowerText.includes(keyword) || lowerText === keyword);
    }
}

export default AddressValidationService;
