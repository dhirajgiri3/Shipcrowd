/**
 * Indian Validation Utilities
 * Reusable validation functions for common Indian document formats
 */

// PAN: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// GSTIN: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Aadhaar: 12 digits
export const AADHAAR_REGEX = /^\d{12}$/;

// Indian Pincode: 6 digits
export const PINCODE_REGEX = /^\d{6}$/;

// Indian Phone: 10 digits (without country code)
export const PHONE_REGEX = /^[6-9]\d{9}$/;

// IFSC Code: 4 letters + 0 + 6 alphanumeric
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Bank Account: 9-18 digits
export const BANK_ACCOUNT_REGEX = /^\d{9,18}$/;

// Validators (return true if valid or empty - for optional fields)
export const isValidPAN = (pan: string): boolean =>
    !pan || PAN_REGEX.test(pan.toUpperCase());

export const isValidGSTIN = (gstin: string): boolean =>
    !gstin || GSTIN_REGEX.test(gstin.toUpperCase());

export const isValidAadhaar = (aadhaar: string): boolean =>
    !aadhaar || AADHAAR_REGEX.test(aadhaar);

export const isValidPincode = (pincode: string): boolean =>
    PINCODE_REGEX.test(pincode);

export const isValidPhone = (phone: string): boolean =>
    PHONE_REGEX.test(phone.replace(/\D/g, '').slice(-10));

export const isValidIFSC = (ifsc: string): boolean =>
    !ifsc || IFSC_REGEX.test(ifsc.toUpperCase());

export const isValidBankAccount = (account: string): boolean =>
    !account || BANK_ACCOUNT_REGEX.test(account);

// Strict validators (return true only if valid and non-empty)
export const isStrictValidPAN = (pan: string): boolean =>
    !!pan && PAN_REGEX.test(pan.toUpperCase());

export const isStrictValidGSTIN = (gstin: string): boolean =>
    !!gstin && GSTIN_REGEX.test(gstin.toUpperCase());

// Formatters
export const formatPAN = (pan: string): string =>
    pan.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

export const formatGSTIN = (gstin: string): string =>
    gstin.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);

export const formatAadhaar = (aadhaar: string): string =>
    aadhaar.replace(/\D/g, '').slice(0, 12);

export const formatPincode = (pincode: string): string =>
    pincode.replace(/\D/g, '').slice(0, 6);

export const formatPhone = (phone: string): string =>
    phone.replace(/\D/g, '').slice(0, 10);

export const formatIFSC = (ifsc: string): string =>
    ifsc.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
