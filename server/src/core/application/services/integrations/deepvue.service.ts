/**
 * Deepvue
 * 
 * Purpose: Get a valid access token for DeepVue API
 * 
 * DEPENDENCIES:
 * - Error Handling, Logger
 * 
 * TESTING:
 * Unit Tests: tests/unit/services/.../{filename}.test.ts
 * Coverage: TBD
 * 
 * NOTE: This service needs comprehensive documentation.
 * See SERVICE_TEMPLATE.md for documentation standards.
 */

import axios from 'axios';
import logger from '../../../../shared/logger/winston.logger';
import dotenv from 'dotenv';
import {
  mockPanResponse,
  mockAadhaarResponse,
  mockGstinResponse,
  mockBankAccountResponse,
  mockIfscResponse
} from './mocks/deepvue.mock';
import { ExternalServiceError } from '../../../../shared/errors/app.error';
import { ErrorCode } from '../../../../shared/errors/errorCodes';

dotenv.config();

// DeepVue API base URL - Updated to match the production URL from the examples
const DEEPVUE_API_BASE_URL = 'https://production.deepvue.tech/v1';

// SECURITY: Removed hardcoded fallback API keys
const DEEPVUE_CLIENT_ID = process.env.DEEPVUE_CLIENT_ID;
const DEEPVUE_API_KEY = process.env.DEEPVUE_API_KEY;

// Development mode flag - set to 'true' to use mock responses instead of real API calls
// SECURITY: Mock mode is NEVER allowed in production - verification would be bypassed
const DEEPVUE_DEV_MODE = process.env.DEEPVUE_DEV_MODE === 'true';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (IS_PRODUCTION && DEEPVUE_DEV_MODE) {
  throw new Error(
    'SECURITY: DEEPVUE_DEV_MODE=true is not allowed in production. Set DEEPVUE_DEV_MODE=false and configure DEEPVUE_CLIENT_ID/DEEPVUE_API_KEY for real API verification.'
  );
}

// Validate credentials are present (skip if in dev mode)
if (!DEEPVUE_DEV_MODE && (!DEEPVUE_CLIENT_ID || !DEEPVUE_API_KEY)) {
  logger.warn('DEEPVUE_CLIENT_ID or DEEPVUE_API_KEY not configured - DeepVue API calls will fail');
}

// Access token storage and management
let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;
let tokenRefreshPromise: Promise<string> | null = null;

/**
 * Get a valid access token for DeepVue API
 * Uses a queue so concurrent callers share one refresh; token is refreshed 1min before expiry.
 */
const getAccessToken = async (): Promise<string> => {
  if (accessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return accessToken;
  }

  if (tokenRefreshPromise) {
    logger.debug('DeepVue token refresh in progress, waiting...');
    return tokenRefreshPromise;
  }

  logger.info('Starting DeepVue token refresh');
  tokenRefreshPromise = (async (): Promise<string> => {
    try {
      const formData = new URLSearchParams();
      if (!DEEPVUE_CLIENT_ID || !DEEPVUE_API_KEY) {
        throw new ExternalServiceError(
          'DeepVue API credentials not configured. Set DEEPVUE_CLIENT_ID and DEEPVUE_API_KEY environment variables.',
          ErrorCode.EXT_SERVICE_ERROR
        );
      }
      formData.append('client_id', DEEPVUE_CLIENT_ID);
      formData.append('client_secret', DEEPVUE_API_KEY);

      const response = await axios.post(
        `${DEEPVUE_API_BASE_URL}/authorize`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      if (response.data && response.data.access_token) {
        const refreshedToken = String(response.data.access_token);
        accessToken = refreshedToken;
        const expiresIn = response.data.expires_in || 3600;
        tokenExpiryTime = Date.now() + (expiresIn * 1000) - 60000; // 1min buffer

        logger.info('DeepVue token refreshed successfully', {
          expiresIn,
          expiresAt: new Date(tokenExpiryTime).toISOString(),
        });
        return refreshedToken;
      }

      logger.error('Invalid response from DeepVue authorization endpoint:', response.data);
      throw new ExternalServiceError(
        'Failed to obtain access token from DeepVue API',
        ErrorCode.EXT_SERVICE_ERROR
      );
    } catch (error) {
      accessToken = null;
      tokenExpiryTime = null;
      logger.error('Failed to refresh DeepVue token', { error });
      if (axios.isAxiosError(error)) {
        throw new ExternalServiceError(
          `DeepVue authentication failed: ${error.response?.data?.message || error.message}`,
          ErrorCode.EXT_SERVICE_ERROR
        );
      }
      throw new ExternalServiceError(
        'Failed to authenticate with DeepVue API',
        ErrorCode.EXT_SERVICE_ERROR
      );
    } finally {
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
};

// Create axios instance for DeepVue API with updated headers
const createDeepVueApiInstance = async () => {
  const token = await getAccessToken();

  return axios.create({
    baseURL: DEEPVUE_API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-api-key': DEEPVUE_API_KEY,
    },
  });
};

/**
 * Verify PAN card details
 * @param pan PAN card number
 * @param name Name on PAN card (optional)
 * @returns Verification result
 */
export const verifyPan = async (pan: string, name?: string): Promise<any> => {
  try {
    // If in development mode, return mock response
    if (DEEPVUE_DEV_MODE) {
      logger.info(`[DEV MODE] Using mock response for PAN verification: ${pan}`);
      return processPanResponse(mockPanResponse(pan, name));
    }

    // Updated endpoint based on provided examples
    const endpoint = '/verification/panbasic';

    // Create query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('pan_number', pan);
    if (name) {
      queryParams.append('name', name);
    }

    // Get API instance with fresh token
    const apiInstance = await createDeepVueApiInstance();

    // Make the API call
    const response = await apiInstance.get(`${endpoint}?${queryParams.toString()}`);

    // Process the response to ensure consistent format
    return processPanResponse(response.data);
  } catch (error) {
    logger.error('Error verifying PAN:', error);
    if (axios.isAxiosError(error)) {
      throw new ExternalServiceError(
        `DeepVue PAN verification failed: ${error.response?.data?.message || error.message}`,
        ErrorCode.EXT_SERVICE_ERROR
      );
    }
    throw error;
  }
};

/**
 * Process PAN verification response to extract and structure information
 * @param responseData Raw response data from DeepVue API
 * @returns Processed response with structured information
 */
export const processPanResponse = (responseData: any): any => {
  try {
    // Check if the response has the expected format
    if (responseData.code === 200 && responseData.data) {
      const data = responseData.data;

      // Extract PAN information
      const panInfo = {
        pan: data.pan,
        name: data.full_name,
        status: data.status === 'VALID' ? 'valid' : 'invalid',
        category: data.category || '',
        nameClean: data.name_information?.pan_name_cleaned || data.full_name,
        valid: data.status === 'VALID',
      };

      return {
        status: 'success',
        data: panInfo,
        transactionId: responseData.transaction_id,
        rawResponse: responseData
      };
    }

    // If the response doesn't match the expected format, return it as is
    return responseData;
  } catch (error) {
    logger.error('Error processing PAN response:', error);
    // Return the original response if processing fails
    return responseData;
  }
};

/**
 * Verify Aadhaar card details (basic verification)
 * @param aadhaar Aadhaar card number
 * @returns Verification result with basic information like age_range, state, gender, etc.
 */
export const verifyAadhaar = async (aadhaar: string): Promise<any> => {
  try {
    // If in development mode, return mock response
    if (DEEPVUE_DEV_MODE) {
      logger.info(`[DEV MODE] Using mock response for Aadhaar verification: ${aadhaar}`);
      return processBasicAadhaarResponse(mockAadhaarResponse(aadhaar));
    }

    // Basic Aadhaar verification endpoint
    const endpoint = '/verification/aadhaar';

    // Create query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('aadhaar_number', aadhaar);

    // Get API instance with fresh token
    const apiInstance = await createDeepVueApiInstance();

    // Make the API call
    const response = await apiInstance.get(`${endpoint}?${queryParams.toString()}`);

    // Log the raw response for debugging
    logger.info('Raw DeepVue Aadhaar verification response:', JSON.stringify(response.data));

    // Process the response to ensure consistent format
    return processBasicAadhaarResponse(response.data);
  } catch (error) {
    logger.error('Error verifying Aadhaar:', error);
    if (axios.isAxiosError(error)) {
      throw new ExternalServiceError(
        `DeepVue Aadhaar verification failed: ${error.response?.data?.message || error.message}`,
        ErrorCode.EXT_SERVICE_ERROR
      );
    }
    throw error;
  }
};

/**
 * Process basic Aadhaar verification response (without OTP)
 * @param responseData Raw response data from DeepVue API
 * @returns Processed response with structured information
 */
export const processBasicAadhaarResponse = (responseData: any): any => {
  try {
    // Check if the response has the expected format for basic verification
    if (responseData.code === 200 && responseData.data) {
      const data = responseData.data;

      // Create a structured response with the basic Aadhaar information
      return {
        status: 'success',
        message: responseData.message || 'Aadhaar verified successfully',
        data: {
          aadhaar_number: data.aadhaar_number || '',
          age_range: data.age_range || '',
          state: data.state || '',
          gender: data.gender || '',
          last_digits: data.last_digits || '',
          is_mobile: data.is_mobile || false,
          verified: true,
        },
        transactionId: responseData.transaction_id,
        rawResponse: responseData
      };
    }

    // If the response doesn't match the expected format, return it as is
    return responseData;
  } catch (error) {
    logger.error('Error processing basic Aadhaar response:', error);
    // Return the original response if processing fails
    return responseData;
  }
};

/**
 * Process Aadhaar OTP verification response
 * @param responseData Raw response data from DeepVue API
 * @returns Processed response with structured information
 */
export const processAadhaarResponse = (responseData: any): any => {
  try {
    // Check if the response has the expected format
    if (responseData.code === 200) {
      // For OTP verification responses
      if (responseData.data && responseData.data.ref_id) {
        return {
          status: 'success',
          message: responseData.message || 'OTP sent to registered mobile number',
          data: {
            ref_id: responseData.data.ref_id,
            aadhaar_number: responseData.data.aadhaar_number || '',
          },
          transactionId: responseData.transaction_id,
        };
      }

      // If we have a successful response but no specific data structure we recognize,
      // create a generic success response with a generated reference ID
      const refId = responseData.transaction_id || `aadhaar-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

      return {
        status: 'success',
        message: responseData.message || 'Aadhaar verification successful',
        data: {
          ref_id: refId,
          ...responseData.data,
        },
        transactionId: responseData.transaction_id,
      };
    }

    // If the response doesn't match the expected format, return it as is
    return responseData;
  } catch (error) {
    logger.error('Error processing Aadhaar response:', error);
    // Return the original response if processing fails
    return responseData;
  }
};

// Note: The OTP-based Aadhaar verification methods have been removed as they are deprecated.
// The DeepVue API provides a direct verification method that doesn't use OTP.
// Use verifyAadhaar() instead of the OTP-based flow.

/**
 * Verify GSTIN (GST registration number)
 * @param gstin GSTIN number
 * @returns Verification result
 */
export const verifyGstin = async (gstin: string): Promise<any> => {
  try {
    // If in development mode, return mock response
    if (DEEPVUE_DEV_MODE) {
      logger.info(`[DEV MODE] Using mock response for GSTIN verification: ${gstin}`);
      return processGstinResponse(mockGstinResponse(gstin));
    }

    // Updated endpoint based on provided examples
    const endpoint = '/verification/gstinlite';

    // Create query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('gstin_number', gstin);

    // Get API instance with fresh token
    const apiInstance = await createDeepVueApiInstance();

    // Make the API call
    const response = await apiInstance.get(`${endpoint}?${queryParams.toString()}`);

    // Process the response to ensure consistent format
    const processedResponse = processGstinResponse(response.data);

    return processedResponse;
  } catch (error) {
    logger.error('Error verifying GSTIN:', error);
    if (axios.isAxiosError(error)) {
      throw new ExternalServiceError(
        `DeepVue GSTIN verification failed: ${error.response?.data?.message || error.message}`,
        ErrorCode.EXT_SERVICE_ERROR
      );
    }
    throw error;
  }
};

/**
 * Process GSTIN verification response to extract and structure business information
 * @param responseData Raw response data from DeepVue API
 * @returns Processed response with structured business information
 */
export const processGstinResponse = (responseData: any): any => {
  try {
    // Handle different response formats
    const data = responseData.data || responseData;

    // Extract business information
    const businessInfo = {
      gstin: data.gstin || data.stjCd,
      tradeName: data.lgnm || data.tradeNam || data.tradeName || '',
      legalName: data.lgnm || data.legalName || '',
      status: data.sts || data.status || '',
      registrationType: data.dty || data.registrationType || '',
      businessType: extractBusinessType(data),
      addresses: extractAddresses(data),
      registrationDate: data.rgdt || '',
      lastUpdated: data.lstupdt || '',
      valid: true, // Assuming if we got a response, the GSTIN is valid
    };

    return {
      status: 'success',
      data: businessInfo,
      rawResponse: responseData // Keep the original response for reference
    };
  } catch (error) {
    logger.error('Error processing GSTIN response:', error);
    // Return the original response if processing fails
    return {
      status: 'success',
      data: responseData,
      processingError: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Extract business type information from GSTIN response
 * @param data GSTIN response data
 * @returns Structured business type information
 */
const extractBusinessType = (data: any): string[] => {
  try {
    // Check different possible fields for business type
    if (data.nba && Array.isArray(data.nba)) {
      return data.nba;
    }

    if (data.businessType) {
      return Array.isArray(data.businessType) ? data.businessType : [data.businessType];
    }

    return [];
  } catch (error) {
    logger.error('Error extracting business type:', error);
    return [];
  }
};

/**
 * Extract address information from GSTIN response
 * @param data GSTIN response data
 * @returns Array of structured address objects
 */
const extractAddresses = (data: any): any[] => {
  try {
    const addresses = [];

    // Principal place of business
    if (data.pradr && data.pradr.addr) {
      addresses.push({
        type: 'Principal',
        address: formatAddress(data.pradr.addr),
        businessNature: data.pradr.ntr || ''
      });
    }

    // Additional addresses
    if (data.adadr && Array.isArray(data.adadr)) {
      data.adadr.forEach((addrData: any, index: number) => {
        if (addrData.addr) {
          addresses.push({
            type: `Additional ${index + 1}`,
            address: formatAddress(addrData.addr),
            businessNature: addrData.ntr || ''
          });
        }
      });
    }

    // If we already have addresses in the expected format, return them directly
    if (Array.isArray(data.addresses)) {
      // Check if the addresses are already in the correct format
      const isCorrectFormat = data.addresses.every((addr: any) =>
        typeof addr === 'object' &&
        !Array.isArray(addr) &&
        addr !== null &&
        'type' in addr &&
        'address' in addr
      );

      if (isCorrectFormat) {
        return data.addresses;
      } else {
        // Try to convert each address to the correct format
        return data.addresses.map((addr: any, index: number) => {
          if (typeof addr === 'object' && addr !== null) {
            // If it's an object but doesn't have the right properties
            return {
              type: addr.type || `Address ${index + 1}`,
              address: addr.address || formatAddress(addr) || JSON.stringify(addr),
              businessNature: addr.businessNature || addr.ntr || ''
            };
          } else if (typeof addr === 'string') {
            // If it's a string, use it as the address
            return {
              type: `Address ${index + 1}`,
              address: addr,
              businessNature: ''
            };
          } else {
            // Fallback for any other type
            return {
              type: `Address ${index + 1}`,
              address: String(addr),
              businessNature: ''
            };
          }
        });
      }
    }

    // If addresses is a string (possibly JSON), try to parse it
    if (typeof data.addresses === 'string') {
      try {
        const parsedAddresses = JSON.parse(data.addresses);
        if (Array.isArray(parsedAddresses)) {
          return parsedAddresses.map((addr: any, index: number) => {
            if (typeof addr === 'object' && addr !== null) {
              return {
                type: addr.type || `Address ${index + 1}`,
                address: addr.address || formatAddress(addr) || JSON.stringify(addr),
                businessNature: addr.businessNature || addr.ntr || ''
              };
            } else {
              return {
                type: `Address ${index + 1}`,
                address: String(addr),
                businessNature: ''
              };
            }
          });
        }
      } catch (e) {
        logger.error('Error parsing addresses string:', e);
        // If parsing fails, create a single address entry
        return [{
          type: 'Unknown',
          address: data.addresses,
          businessNature: ''
        }];
      }
    }

    return addresses;
  } catch (error) {
    logger.error('Error extracting addresses:', error);
    return [];
  }
};

/**
 * Format address object into a readable string
 * @param addrObj Address object from GSTIN response
 * @returns Formatted address string
 */
const formatAddress = (addrObj: any): string => {
  try {
    // If addrObj is a string, return it directly
    if (typeof addrObj === 'string') {
      return addrObj;
    }

    // If addrObj is not an object or is null, return a default message
    if (typeof addrObj !== 'object' || addrObj === null) {
      return 'Address unavailable';
    }

    // If addrObj has an 'address' property that's a string, use it directly
    if (addrObj.address && typeof addrObj.address === 'string') {
      return addrObj.address;
    }

    // Handle standard GST API address format
    if (addrObj.bno || addrObj.bnm || addrObj.st || addrObj.loc) {
      const components = [
        addrObj.bno, // Building number
        addrObj.bnm, // Building name
        addrObj.flno, // Floor number
        addrObj.st, // Street
        addrObj.loc, // Locality
        addrObj.dst, // District
        addrObj.stcd, // State
        addrObj.pncd // PIN code
      ];

      // Filter out empty components and join with commas
      const formattedAddress = components.filter(Boolean).join(', ');
      if (formattedAddress) {
        return formattedAddress;
      }
    }

    // Fallback: try to extract any string properties that might be part of an address
    const addressComponents = [];
    for (const key in addrObj) {
      if (typeof addrObj[key] === 'string' && !['type', 'businessNature', 'ntr'].includes(key)) {
        addressComponents.push(addrObj[key]);
      }
    }

    if (addressComponents.length > 0) {
      return addressComponents.join(', ');
    }

    // Last resort: stringify the object
    return JSON.stringify(addrObj);
  } catch (error) {
    logger.error('Error formatting address:', error);
    return 'Address formatting error';
  }
};

/**
 * Verify bank account using penny drop
 * @param accountNumber Bank account number
 * @param ifsc IFSC code
 * @param name Account holder name (optional)
 * @returns Verification result
 */
export const verifyBankAccount = async (
  accountNumber: string,
  ifsc: string,
  name?: string
): Promise<any> => {
  try {
    // If in development mode, return mock response (never in production - enforced at startup)
    if (DEEPVUE_DEV_MODE) {
      logger.info(`[DEV MODE] Using mock response for bank account verification: ${accountNumber}, IFSC: ${ifsc}`);
      return processBankAccountResponse(mockBankAccountResponse(accountNumber, ifsc, name || 'Test User'));
    }

    // Endpoint for bank account verification
    const endpoint = '/verification/bankaccount';

    // Create query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('account_number', accountNumber);
    queryParams.append('ifsc', ifsc);
    if (name) {
      queryParams.append('name', name);
    }

    // Get API instance with fresh token
    const apiInstance = await createDeepVueApiInstance();

    try {
      // Make the API call
      const response = await apiInstance.get(`${endpoint}?${queryParams.toString()}`);

      // Process the response to ensure consistent format
      return processBankAccountResponse(response.data);
    } catch (apiError) {
      logger.error('API error in bank account verification:', apiError);

      // Return a structured error response
      return {
        status: 'error',
        message: axios.isAxiosError(apiError)
          ? apiError.response?.data?.message || apiError.message
          : 'Bank account verification failed',
        data: {
          valid: false,
          accountExists: false,
          error: axios.isAxiosError(apiError)
            ? apiError.response?.data?.message || apiError.message
            : 'Unknown error'
        }
      };
    }
  } catch (error) {
    logger.error('Error verifying bank account:', error);

    // Return a structured error response
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Bank account verification failed',
      data: {
        valid: false,
        accountExists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

/**
 * Process bank account verification response to extract and structure information
 * @param responseData Raw response data from DeepVue API
 * @returns Processed response with structured information
 */
export const processBankAccountResponse = (responseData: any): any => {
  try {
    // Check if the response has the expected format for success
    if (responseData.code === 200 && responseData.data) {
      const data = responseData.data;

      // Extract bank account information with enhanced fields
      const bankAccountInfo = {
        accountExists: data.account_exists === true,
        accountHolderName: data.name_at_bank || '',
        accountHolderNameClean: data.name_information?.name_at_bank_cleaned || data.name_at_bank || '',
        utr: data.utr || '',
        amountDeposited: data.amount_deposited || 0,
        valid: data.account_exists === true,
        message: data.message || '',
        bankName: data.bank_name || '',
        branchName: data.branch_name || '',
        ifscVerified: data.ifsc_verified === true,
        transactionId: data.transaction_id || responseData.transaction_id || '',
        transactionTimestamp: data.timestamp || responseData.timestamp || new Date().toISOString(),
      };

      // Mask account number for logging
      const maskedAccountNumber = data.account_number ?
        '****' + data.account_number.slice(-4) :
        '****';

      // Log minimal information for security
      logger.info('Bank account verification successful:', {
        accountNumber: maskedAccountNumber,
        accountExists: bankAccountInfo.accountExists,
      });

      if (bankAccountInfo.accountExists) {
        return {
          status: 'success',
          message: data.message || 'Bank account verified successfully',
          data: bankAccountInfo,
          transactionId: responseData.transaction_id
        };
      }

      return {
        status: 'error',
        message: data.message || 'Bank account does not exist',
        data: {
          ...bankAccountInfo,
          valid: false,
          accountExists: false,
          error: data.message || 'account_not_found'
        },
        transactionId: responseData.transaction_id
      };
    }

    // If the response indicates an error
    if (responseData.code >= 400 ||
      responseData.message?.toLowerCase().includes('invalid') ||
      responseData.message?.toLowerCase().includes('error') ||
      responseData.status === 'error') {
      return {
        status: 'error',
        message: responseData.message || 'Bank account verification failed',
        data: {
          valid: false,
          accountExists: false,
          error: responseData.message || 'Unknown error'
        },
        transactionId: responseData.transaction_id
      };
    }

    // If the response doesn't match any expected format, return a standardized response
    return {
      status: 'unknown',
      message: 'Unexpected response format from bank verification API',
      data: {
        valid: false,
        accountExists: false,
        rawResponse: responseData
      }
    };
  } catch (error) {
    logger.error('Error processing bank account response:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error processing bank account response',
      data: {
        valid: false,
        accountExists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

/**
 * Verify IFSC code
 * @param ifsc IFSC code
 * @returns Verification result with bank details
 */
export const verifyIfsc = async (ifsc: string): Promise<any> => {
  try {
    // If in development mode, return mock response (never in production - enforced at startup)
    if (DEEPVUE_DEV_MODE) {
      logger.info(`[DEV MODE] Using mock response for IFSC verification: ${ifsc}`);
      return processIfscResponse(mockIfscResponse(ifsc));
    }

    // Updated endpoint based on provided examples
    const endpoint = '/verification/ifsc';

    // Create query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('ifsc', ifsc);

    // Get API instance with fresh token
    const apiInstance = await createDeepVueApiInstance();

    // Make the API call
    const response = await apiInstance.get(`${endpoint}?${queryParams.toString()}`);

    // Process the response to ensure consistent format
    return processIfscResponse(response.data);
  } catch (error) {
    logger.error('Error verifying IFSC:', error);
    if (axios.isAxiosError(error)) {
      throw new ExternalServiceError(
        `DeepVue IFSC verification failed: ${error.response?.data?.message || error.message}`,
        ErrorCode.EXT_SERVICE_ERROR
      );
    }
    throw error;
  }
};

/**
 * Fallback: Get bank name from IFSC prefix when API returns empty
 * Covers common Indian banks (ICICI, HDFC, SBI, etc.)
 */
const getBankNameFromIfscPrefix = (ifsc: string): string => {
  if (!ifsc || ifsc.length < 4) return '';
  const prefix = ifsc.substring(0, 4).toUpperCase();
  const map: Record<string, string> = {
    ICIC: 'ICICI Bank',
    HDFC: 'HDFC Bank',
    SBIN: 'State Bank of India',
    UTIB: 'Axis Bank',
    YESB: 'Yes Bank',
    KKBK: 'Kotak Mahindra Bank',
    INDB: 'IndusInd Bank',
    PUNB: 'Punjab National Bank',
    BARB: 'Bank of Baroda',
    CNRB: 'Canara Bank',
    UBIN: 'Union Bank of India',
    FDRL: 'Federal Bank',
    IDIB: 'Indian Bank',
    CBIN: 'Central Bank of India',
  };
  return map[prefix] || '';
};

/**
 * Process IFSC verification response to extract and structure information
 * @param responseData Raw response data from DeepVue API
 * @returns Processed response with structured information
 */
export const processIfscResponse = (responseData: any): any => {
  try {
    // Check if the response has the expected format for success
    if (responseData.code === 200 && responseData.data) {
      const data = responseData.data;
      const rawIfsc = (data.ifsc || responseData.ifsc || '').toString().toUpperCase();

      // Extract bank name - support multiple API response formats (bank_name, bankName, bank, BANK)
      const bankName =
        (data.bank_name || data.bankName || data.bank || data.BANK || '').toString().trim()
        || getBankNameFromIfscPrefix(rawIfsc);

      // Extract IFSC information
      const ifscInfo = {
        ifsc: data.ifsc || rawIfsc || '',
        bankName,
        branch: data.branch || data.branch_name || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        valid: true,
      };

      return {
        status: 'success',
        message: 'IFSC code verified successfully',
        data: ifscInfo,
        transactionId: responseData.transaction_id,
        rawResponse: responseData
      };
    }

    // Check if the response indicates an error
    if (responseData.code === 422 || responseData.message === 'Invalid IFSC') {
      return {
        status: 'error',
        message: responseData.message || 'Invalid IFSC code',
        valid: false,
        transactionId: responseData.transaction_id,
        rawResponse: responseData
      };
    }

    // If the response doesn't match any expected format, return it as is
    return responseData;
  } catch (error) {
    logger.error('Error processing IFSC response:', error);
    // Return the original response if processing fails
    return responseData;
  }
};

/**
 * Test the DeepVue API connection
 * @returns Connection status
 */
export const testConnection = async (): Promise<any> => {
  try {
    // If in development mode, return mock success response
    if (DEEPVUE_DEV_MODE) {
      logger.info('[DEV MODE] Using mock response for DeepVue API connection test');
      return {
        status: 'success',
        message: '[DEV MODE] DeepVue API connection simulation successful',
        data: {
          status: 'success',
          code: 200,
          data: {
            ifsc: 'SBIN0000001',
            bank_name: 'State Bank of India',
            branch: 'Main Branch',
            address: '123 Bank Street, Mumbai, Maharashtra - 400001',
            city: 'Mumbai',
            state: 'Maharashtra',
            valid: true
          }
        },
        devMode: true
      };
    }

    // Use IFSC verification as a simple test endpoint
    const testIfsc = 'SBIN0000001'; // State Bank of India, Main Branch
    const result = await verifyIfsc(testIfsc);

    // Check if the result indicates a successful connection
    const isSuccess = result.status === 'success' ||
      (result.code === 200) ||
      (result.data && Object.keys(result.data).length > 0);

    if (isSuccess) {
      return {
        status: 'success',
        message: 'DeepVue API connection successful',
        data: result,
      };
    } else {
      // If we got a response but it's not a success, still consider the connection working
      return {
        status: 'success',
        message: 'DeepVue API connection successful, but verification failed',
        data: result,
      };
    }
  } catch (error) {
    logger.error('Error testing DeepVue API connection:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export default {
  // Main verification functions
  verifyPan,
  verifyAadhaar,
  verifyGstin,
  verifyBankAccount,
  verifyIfsc,
  testConnection,

  // Response processing functions
  processPanResponse,
  processBasicAadhaarResponse,
  processAadhaarResponse,
  processGstinResponse,
  processBankAccountResponse,
  processIfscResponse,
};
