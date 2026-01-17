/**
 * India-specific field validators for Mongoose schemas
 * 
 * Usage:
 * phone: { type: String, validate: IndiaValidators.phone }
 */
export const IndiaValidators = {
    phone: {
        validator: (v: string) => !v || /^[6-9]\d{9}$/.test(v),
        message: 'Invalid Indian mobile number (must be 10 digits starting with 6-9)'
    },

    pincode: {
        validator: (v: string) => !v || /^[1-9][0-9]{5}$/.test(v),
        message: 'Invalid pincode (must be 6 digits, cannot start with 0)'
    },

    gstin: {
        validator: (v: string) => !v || /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(v),
        message: 'Invalid GSTIN format'
    },

    pan: {
        validator: (v: string) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v),
        message: 'Invalid PAN format (e.g., ABCDE1234F)'
    },

    ifsc: {
        validator: (v: string) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v),
        message: 'Invalid IFSC code format'
    },

    email: {
        validator: (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Invalid email address'
    }
};
