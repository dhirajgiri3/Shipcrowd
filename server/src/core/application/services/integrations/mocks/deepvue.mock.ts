/**
 * Mock responses for DeepVue API
 * Used in development mode to avoid making real API calls that incur charges
 */

/**
 * Mock PAN card verification response
 * @param pan PAN card number
 * @param name Name on PAN card (optional)
 */
export const mockPanResponse = (pan: string, name?: string) => {
  const mockName = name || 'Test User';
  const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

  return {
    status: 'success',
    code: 200,
    data: {
      name: mockName,
      pan: pan,
      valid: isValid,
      dob: '1990-01-01',
      gender: 'M',
      last_updated: new Date().toISOString()
    }
  };
};

/**
 * Mock Aadhaar verification response
 * @param aadhaar Aadhaar number
 */
export const mockAadhaarResponse = (aadhaar: string) => {
  const isValid = /^\d{12}$/.test(aadhaar);

  return {
    status: 'success',
    code: 200,
    data: {
      aadhaar_number: aadhaar,
      valid: isValid,
      name: 'Test User',
      gender: 'M',
      dob: '1990-01-01',
      address: '123 Test Street, Test City, Test State - 123456',
      mobile: '9876543210',
      email: 'test@example.com',
      last_updated: new Date().toISOString()
    }
  };
};

// Note: The OTP-based Aadhaar verification mock functions have been removed as they are deprecated.

/**
 * Mock GSTIN verification response
 * @param gstin GSTIN number
 */
export const mockGstinResponse = (gstin: string) => {
  const isValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);

  if (!isValid) {
    return {
      status: 'error',
      code: 400,
      message: 'Invalid GSTIN format'
    };
  }

  return {
    status: 'success',
    code: 200,
    data: {
      gstin: gstin,
      tradeName: 'Test Business',
      legalName: 'Test Business Pvt Ltd',
      status: 'Active',
      registrationType: 'Regular',
      businessType: ['Wholesale Business', 'Retail Business'],
      addresses: [
        {
          type: 'Principal Place of Business',
          address: '123 Business Street, Business City, Business State - 123456',
          businessNature: 'Wholesale and Retail Trade'
        }
      ],
      registrationDate: '2020-01-01',
      lastUpdated: new Date().toISOString(),
      valid: true
    }
  };
};

/**
 * Mock bank account verification response
 * @param accountNumber Account number
 * @param ifsc IFSC code
 * @param accountHolderName Account holder name
 */
export const mockBankAccountResponse = (accountNumber: string, ifsc: string, accountHolderName: string) => {
  // Validate input
  const isValidAccount = /^\d{9,18}$/.test(accountNumber);
  const isValidIfsc = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);

  // Return error response for invalid inputs
  if (!isValidAccount || !isValidIfsc) {
    return {
      status: 'error',
      code: 422,
      message: 'Invalid account number or IFSC format',
      transaction_id: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
    };
  }

  // Generate mock data
  const mockUtr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
  const timestamp = Date.now();
  const transactionId = `mock-${timestamp}-${Math.random().toString(36).substring(2, 10)}`;

  // Determine bank name based on IFSC code
  const bankCode = ifsc.substring(0, 4);
  let bankName = 'Test Bank';
  let branchName = 'Test Branch';

  switch (bankCode) {
    case 'SBIN':
      bankName = 'State Bank of India';
      branchName = 'Main Branch';
      break;
    case 'HDFC':
      bankName = 'HDFC Bank';
      branchName = 'Corporate Branch';
      break;
    case 'ICIC':
      bankName = 'ICICI Bank';
      branchName = 'City Branch';
      break;
    case 'UTIB':
      bankName = 'Axis Bank';
      branchName = 'Regional Branch';
      break;
  }

  // Create a cleaned version of the account holder name
  const nameAtBankCleaned = accountHolderName.toUpperCase().trim();

  // Return success response with mock data
  return {
    code: 200,
    timestamp: timestamp,
    transaction_id: transactionId,
    data: {
      message: "Bank Account details verified successfully.",
      account_exists: true,
      name_at_bank: accountHolderName,
      utr: mockUtr,
      amount_deposited: 1,
      name_information: {
        name_at_bank_cleaned: nameAtBankCleaned
      },
      account_number: accountNumber,
      ifsc: ifsc,
      bank_name: bankName,
      branch_name: branchName,
      ifsc_verified: true,
      last_updated: new Date().toISOString()
    }
  };
};

/**
 * Mock IFSC verification response
 * @param ifsc IFSC code
 */
export const mockIfscResponse = (ifsc: string) => {
  const isValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);

  if (!isValid) {
    return {
      status: 'error',
      code: 400,
      message: 'Invalid IFSC format'
    };
  }

  const bankCode = ifsc.substring(0, 4);
  const bankMap: Record<string, string> = {
    SBIN: 'State Bank of India',
    HDFC: 'HDFC Bank',
    ICIC: 'ICICI Bank',
    UTIB: 'Axis Bank',
    YESB: 'Yes Bank',
    KKBK: 'Kotak Mahindra Bank',
    PUNB: 'Punjab National Bank',
    BARB: 'Bank of Baroda',
    CNRB: 'Canara Bank',
  };
  const bankName = bankMap[bankCode] || 'Test Bank';

  return {
    status: 'success',
    code: 200,
    data: {
      ifsc: ifsc,
      bank_name: bankName,
      branch: 'Test Branch',
      address: '123 Bank Street, Bank City, Bank State - 123456',
      city: 'Bank City',
      state: 'Bank State',
      valid: true,
      last_updated: new Date().toISOString()
    }
  };
};
