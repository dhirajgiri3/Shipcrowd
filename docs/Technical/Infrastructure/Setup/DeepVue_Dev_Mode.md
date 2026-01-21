# DeepVue API Development Mode

This document explains how to use the development mode for DeepVue API integration in the Helix application.

## Overview

DeepVue API charges for each API call made to their service. To avoid incurring charges during development and testing, we've implemented a development mode that uses mock responses instead of making real API calls.

## How It Works

When development mode is enabled, the DeepVue service will:

1. Skip making real API calls to DeepVue endpoints
2. Return realistic mock responses for all verification types
3. Log information about the mock responses being used
4. Maintain the same response structure as the real API

## Enabling Development Mode

### Environment Variable

Add the following variable to your `.env` file:

```
DEEPVUE_DEV_MODE=true
```

### Postman Testing

When testing with Postman, the environment already includes a `deepvueDevMode` variable set to `true`. This is used in the pre-request scripts to set the appropriate environment variable.

## Mock Data

The mock data is designed to mimic real DeepVue API responses and includes:

- PAN card verification
- Aadhaar card verification
- Aadhaar OTP generation and verification
- GSTIN verification
- Bank account verification
- IFSC code verification

## Validation Logic

Even in development mode, the mock responses include validation logic:

- PAN numbers are validated against the format `[A-Z]{5}[0-9]{4}[A-Z]{1}`
- Aadhaar numbers are validated against the format `\d{12}`
- GSTIN numbers are validated against the format `[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}`
- Bank account numbers are validated against the format `\d{9,18}`
- IFSC codes are validated against the format `[A-Z]{4}0[A-Z0-9]{6}`

## Switching to Production Mode

When you're ready to use the real DeepVue API:

1. Set `DEEPVUE_DEV_MODE=false` in your `.env` file (or remove it)
2. Ensure your DeepVue API credentials are correctly set:
   ```
   DEEPVUE_CLIENT_ID=your_client_id
   DEEPVUE_API_KEY=your_api_key
   ```

## Logging

When development mode is active, all mock responses are logged with a `[DEV MODE]` prefix, making it easy to identify when you're using mock data versus real API calls.

Example log:
```
[DEV MODE] Using mock response for PAN verification: ABCDE1234F
```

## Important Notes

- Development mode is enabled by default in the Postman environment
- Always disable development mode in production environments
- Mock responses are designed to be realistic but may not cover all edge cases
- The validation logic in mock responses is simplified compared to the real API
