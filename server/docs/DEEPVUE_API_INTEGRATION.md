# DeepVue API Integration Guide

This guide explains how to use the DeepVue API integration for KYC verification in the Shipcrowd application.

## Overview

DeepVue provides a comprehensive API for KYC (Know Your Customer) verification, including:

- PAN card verification
- Aadhaar card verification
- GSTIN verification
- Bank account verification
- IFSC code verification

### Important Note on Aadhaar Verification

The DeepVue API provides a basic Aadhaar verification endpoint that doesn't use an OTP process. Instead, it directly verifies the Aadhaar number and returns basic information like age range, state, gender, and the last three digits of the registered mobile number.

The API endpoints in our application (`/api/kyc/aadhaar/generate-otp` and `/api/kyc/aadhaar/verify-otp`) are named for backward compatibility, but they actually perform:

1. Basic Aadhaar verification (Step 1)
2. Verification confirmation (Step 2)

No actual OTP is sent or verified in this process.

## Setup Instructions

### 1. Environment Variables

Add the following variables to your `.env` file:

```
DEEPVUE_CLIENT_ID=your_client_id
DEEPVUE_API_KEY=your_api_key
```

For testing, you can use the free tier credentials:

```
DEEPVUE_CLIENT_ID=free_tier_hello_24083411f2
DEEPVUE_API_KEY=066c1703385e4fd8bb3e34ddb526df89
```

### 2. Testing the Integration

You can test the DeepVue API integration using the provided test script:

```bash
# Navigate to the server directory
cd server

# Run the test script
npx ts-node src/scripts/test-deepvue.ts
```

## API Endpoints

The Shipcrowd API provides the following endpoints for KYC verification:

### PAN Card Verification

- **URL**: `/api/kyc/verify-pan`
- **Method**: `POST`
- **Authentication**: Required
- **CSRF Protection**: Required
- **Request Body**:
  ```json
  {
    "pan": "ABCDE1234F",
    "name": "Dev Paanchal" // Optional
  }
  ```
- **Response**:
  ```json
  {
    "message": "PAN verification completed",
    "verified": true,
    "data": {
      "name": "Dev Paanchal",
      "valid": true,
      "pan": "ABCDE1234F"
    }
  }
  ```

### GSTIN Verification

- **URL**: `/api/kyc/verify-gstin`
- **Method**: `POST`
- **Authentication**: Required
- **CSRF Protection**: Required
- **Request Body**:
  ```json
  {
    "gstin": "27AAPFU0939F1ZV"
  }
  ```
- **Response**:
  ```json
  {
    "message": "GSTIN verification completed",
    "verified": true,
    "data": {
      "valid": true,
      "gstin": "27AAPFU0939F1ZV",
      "trade_name": "ABC COMPANY"
    }
  }
  ```

### Bank Account Verification

- **URL**: `/api/kyc/verify-bank-account`
- **Method**: `POST`
- **Authentication**: Required
- **CSRF Protection**: Required
- **Request Body**:
  ```json
  {
    "accountNumber": "1234567890",
    "ifsc": "SBIN0000001",
    "accountHolderName": "Dev Paanchal" // Optional
  }
  ```
- **Response**:
  ```json
  {
    "message": "Bank account verification completed",
    "verified": true,
    "data": {
      "accountHolderName": "Dev Paanchal",
      "bankName": "State Bank of India"
    }
  }
  ```

### Aadhaar Verification (Simplified One-Step Process)

- **URL**: `/api/kyc/verify-aadhaar`
- **Method**: `POST`
- **Authentication**: Required
- **CSRF Protection**: Required
- **Description**: This endpoint performs a direct Aadhaar verification in a single step.
- **Request Body**:
  ```json
  {
    "aadhaar": "123456789012"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Aadhaar verification successful",
    "data": {
      "aadhaarNumber": "123456789012",
      "verified": true,
      "ageRange": "20-30",
      "state": "Karnataka",
      "gender": "F",
      "lastDigits": "012",
      "isMobile": true
    }
  }
  ```



## Testing the API Connection

You can test the DeepVue API connection using the following endpoint:

- **URL**: `/api/kyc/test-deepvue`
- **Method**: `GET`
- **Authentication**: Required (Admin only)
- **Response**:
  ```json
  {
    "status": "success",
    "message": "DeepVue API connection successful",
    "data": {
      // IFSC verification result
    }
  }
  ```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages in the response body:

```json
{
  "message": "Error message",
  "error": "Detailed error information"
}
```

## Troubleshooting

### API Connection Issues

1. Check that your DeepVue API credentials are correct
2. Verify that the DeepVue API is accessible from your server
3. Check the application logs for specific error messages

### Verification Failures

1. Ensure that the input data is correct and properly formatted
2. Check if the verification service is available
3. Verify that the document being verified is valid

## Best Practices

1. Always validate input data before sending it to the DeepVue API
2. Store verification results securely in the database
3. Implement proper error handling for API failures
4. Use the test endpoint to verify API connectivity before performing actual verifications
