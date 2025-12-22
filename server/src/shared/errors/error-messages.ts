/**
 * User-Friendly Error Messages
 * Maps error codes to human-readable messages
 */

export interface AppError extends Error {
    code?: string;
}

export const authErrorMessages: Record<string, string> = {
    // Authentication Errors
    'auth/email-already-in-use': 'This email address is already registered. Please login instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/weak-password': 'Password is too weak. Please use a stronger password with at least 8 characters.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again in 30 minutes.',
    'auth/account-locked': 'Your account has been temporarily locked due to multiple failed login attempts.',
    'auth/invalid-credentials': 'Invalid email or password. Please check your credentials and try again.',
    'auth/user-disabled': 'Your account has been disabled. Please contact support.',
    'auth/email-not-verified': 'Please verify your email address before logging in. Check your inbox for the verification link.',
    'auth/token-expired': 'Your session has expired. Please login again.',
    'auth/invalid-token': 'Invalid or expired token. Please try again.',
    'auth/password-mismatch': 'Passwords do not match. Please ensure both passwords are identical.',

    // Registration Errors
    'validation/email-required': 'Email address is required.',
    'validation/password-required': 'Password is required.',
    'validation/name-required': 'Name is required.',
    'validation/password-too-short': 'Password must be at least 8 characters long.',
    'validation/password-no-uppercase': 'Password must contain at least one uppercase letter.',
    'validation/password-no-lowercase': 'Password must contain at least one lowercase letter.',
    'validation/password-no-number': 'Password must contain at least one number.',
    'validation/password-no-special': 'Password must contain at least one special character.',
    'validation/invalid-invitation-token': 'Invalid or expired invitation link.',

    // KYC Errors
    'kyc/pan-invalid-format': 'Invalid PAN format. Please enter a valid 10-character PAN (e.g., ABCDE1234F).',
    'kyc/pan-not-found': 'PAN not found in government database. Please verify and try again.',
    'kyc/pan-verification-failed': 'Unable to verify PAN. Please try again later.',
    'kyc/aadhaar-invalid-format': 'Invalid Aadhaar format. Please enter a valid 12-digit Aadhaar number.',
    'kyc/aadhaar-verification-failed': 'Unable to verify Aadhaar. Please try again later.',
    'kyc/gstin-invalid-format': 'Invalid GSTIN format. Please enter a valid 15-character GSTIN.',
    'kyc/gstin-not-found': 'GSTIN not found. Please verify and try again.',
    'kyc/bank-account-invalid': 'Invalid bank account details. Please verify and try again.',
    'kyc/ifsc-invalid-format': 'Invalid IFSC code format. Please enter a valid 11-character IFSC code.',
    'kyc/already-verified': 'This document has already been verified.',
    'kyc/no-company': 'Please create a company profile before submitting KYC documents.',
    'kyc/document-upload-failed': 'Failed to upload document. Please try again.',

    // General Errors
    'server/internal-error': 'Something went wrong on our end. Please try again later.',
    'server/network-error': 'Network error. Please check your internet connection and try again.',
    'server/timeout': 'Request timed out. Please try again.',
    'server/not-found': 'Resource not found.',
    'server/unauthorized': 'You are not authorized to perform this action.',
    'server/forbidden': 'Access denied. You do not have permission to access this resource.',
    'server/validation-error': 'Please check your input and try again.',
};

export const kycErrorMessages: Record<string, string> = {
    // DeepVue specific errors
    'deepvue/authentication-failed': 'Failed to authenticate with verification service. Please try again later.',
    'deepvue/invalid-response': 'Received invalid response from verification service. Please try again.',
    'deepvue/api-error': 'Verification service is temporarily unavailable. Please try again later.',
    'deepvue/rate-limit-exceeded': 'Too many verification attempts. Please try again after some time.',
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (errorCode: string, defaultMessage?: string): string => {
    const message = authErrorMessages[errorCode] || kycErrorMessages[errorCode];
    return message || defaultMessage || 'An unexpected error occurred. Please try again.';
};

/**
 * Extract error code from error object
 */
export const extractErrorCode = (error: any): string => {
    // Zod validation errors
    if (error.name === 'ZodError') {
        return 'server/validation-error';
    }

    // MongoDB errors
    if (error.code === 11000) {
        return 'auth/email-already-in-use';
    }

    // Custom error codes
    if (error.code) {
        return error.code;
    }

    // Error messages
    if (error.message) {
        // Try to match common patterns
        if (error.message.includes('email already exists')) return 'auth/email-already-in-use';
        if (error.message.includes('user not found')) return 'auth/user-not-found';
        if (error.message.includes('invalid credentials')) return 'auth/invalid-credentials';
        if (error.message.includes('account locked')) return 'auth/account-locked';
        if (error.message.includes('too many requests')) return 'auth/too-many-requests';
    }

    return 'server/internal-error';
};

/**
 * Format error for API response
 */
export interface FormattedError {
    code: string;
    message: string;
    details?: any;
}

export const formatError = (error: any): FormattedError => {
    const code = extractErrorCode(error);
    const message = getErrorMessage(code);

    return {
        code,
        message,
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    };
};
