/**
 * DeepVue KYC Verification API Mock
 * Mocks for the KYC verification service integration
 */

export interface DeepVuePANResponse {
    success: boolean;
    data: {
        pan: string;
        name: string;
        fatherName?: string;
        dob?: string;
        status: 'valid' | 'invalid' | 'pending';
    };
}

export interface DeepVueAadhaarResponse {
    success: boolean;
    data: {
        aadhaar: string;
        name: string;
        address: {
            street?: string;
            city?: string;
            state?: string;
            pincode?: string;
        };
        dob?: string;
        gender?: string;
        status: 'valid' | 'invalid' | 'pending';
    };
}

export interface DeepVueGSTINResponse {
    success: boolean;
    data: {
        gstin: string;
        legalName: string;
        tradeName?: string;
        status: 'active' | 'inactive' | 'cancelled';
        registrationDate?: string;
        businessType?: string;
        stateCode?: string;
    };
}

export interface DeepVueBankAccountResponse {
    success: boolean;
    data: {
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        branchName?: string;
        accountHolderName: string;
        accountType: 'savings' | 'current';
        status: 'valid' | 'invalid';
    };
}

/**
 * Mock PAN verification success
 */
export const mockVerifyPANSuccess = (pan: string, name: string = 'John Doe'): DeepVuePANResponse => ({
    success: true,
    data: {
        pan: pan.toUpperCase(),
        name,
        fatherName: 'Father Name',
        dob: '1990-01-01',
        status: 'valid',
    },
});

/**
 * Mock PAN verification failure
 */
export const mockVerifyPANFailure = (_pan: string, reason: string = 'Invalid PAN number') => ({
    success: false,
    error: {
        code: 'INVALID_PAN',
        message: reason,
    },
});

/**
 * Mock Aadhaar verification success
 */
export const mockVerifyAadhaarSuccess = (
    aadhaar: string,
    name: string = 'John Doe'
): DeepVueAadhaarResponse => ({
    success: true,
    data: {
        aadhaar: aadhaar.replace(/\d(?=\d{4})/g, 'X'), // Mask Aadhaar
        name,
        address: {
            street: '123 Test Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
        },
        dob: '1990-01-01',
        gender: 'M',
        status: 'valid',
    },
});

/**
 * Mock Aadhaar verification failure
 */
export const mockVerifyAadhaarFailure = (
    _aadhaar: string,
    reason: string = 'Invalid Aadhaar number'
) => ({
    success: false,
    error: {
        code: 'INVALID_AADHAAR',
        message: reason,
    },
});

/**
 * Mock GSTIN verification success
 */
export const mockVerifyGSTINSuccess = (
    gstin: string,
    legalName: string = 'ABC Enterprises Pvt Ltd'
): DeepVueGSTINResponse => ({
    success: true,
    data: {
        gstin: gstin.toUpperCase(),
        legalName,
        tradeName: 'ABC Enterprises',
        status: 'active',
        registrationDate: '2020-01-01',
        businessType: 'Private Limited Company',
        stateCode: gstin.substring(0, 2),
    },
});

/**
 * Mock GSTIN verification failure
 */
export const mockVerifyGSTINFailure = (
    _gstin: string,
    reason: string = 'Invalid GSTIN'
) => ({
    success: false,
    error: {
        code: 'INVALID_GSTIN',
        message: reason,
    },
});

/**
 * Mock Bank Account verification success
 */
export const mockVerifyBankAccountSuccess = (
    accountNumber: string,
    ifscCode: string,
    name: string = 'John Doe'
): DeepVueBankAccountResponse => ({
    success: true,
    data: {
        accountNumber: accountNumber.slice(-4).padStart(accountNumber.length, 'X'),
        ifscCode,
        bankName: 'State Bank of India',
        branchName: 'Main Branch',
        accountHolderName: name,
        accountType: 'savings',
        status: 'valid',
    },
});

/**
 * Mock Bank Account verification failure
 */
export const mockVerifyBankAccountFailure = (
    _accountNumber: string,
    reason: string = 'Invalid bank account'
) => ({
    success: false,
    error: {
        code: 'INVALID_BANK_ACCOUNT',
        message: reason,
    },
});

/**
 * Create a mock DeepVue client for testing
 */
export const createDeepVueMockClient = () => ({
    verifyPAN: jest.fn().mockImplementation((pan: string, name?: string) =>
        Promise.resolve(mockVerifyPANSuccess(pan, name))
    ),
    verifyAadhaar: jest.fn().mockImplementation((aadhaar: string, _otp?: string) =>
        Promise.resolve(mockVerifyAadhaarSuccess(aadhaar))
    ),
    verifyGSTIN: jest.fn().mockImplementation((gstin: string) =>
        Promise.resolve(mockVerifyGSTINSuccess(gstin))
    ),
    verifyBankAccount: jest.fn().mockImplementation((accountNumber: string, ifscCode: string) =>
        Promise.resolve(mockVerifyBankAccountSuccess(accountNumber, ifscCode))
    ),
    sendAadhaarOTP: jest.fn().mockResolvedValue({
        success: true,
        requestId: `req_${Date.now()}`,
        message: 'OTP sent successfully',
    }),
});

/**
 * Reset all DeepVue mocks
 */
export const resetDeepVueMocks = (client: ReturnType<typeof createDeepVueMockClient>) => {
    client.verifyPAN.mockClear();
    client.verifyAadhaar.mockClear();
    client.verifyGSTIN.mockClear();
    client.verifyBankAccount.mockClear();
    client.sendAadhaarOTP.mockClear();
};

/**
 * Configure DeepVue mock to return failures
 */
export const configureDeepVueFailures = (client: ReturnType<typeof createDeepVueMockClient>) => {
    client.verifyPAN.mockImplementation((pan: string) =>
        Promise.resolve(mockVerifyPANFailure(pan))
    );
    client.verifyAadhaar.mockImplementation((aadhaar: string) =>
        Promise.resolve(mockVerifyAadhaarFailure(aadhaar))
    );
    client.verifyGSTIN.mockImplementation((gstin: string) =>
        Promise.resolve(mockVerifyGSTINFailure(gstin))
    );
    client.verifyBankAccount.mockImplementation((accountNumber: string) =>
        Promise.resolve(mockVerifyBankAccountFailure(accountNumber))
    );
};
