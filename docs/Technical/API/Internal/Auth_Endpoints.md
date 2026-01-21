# Helix Authentication API Documentation

## Overview

The Authentication API provides endpoints for user registration, login, token refresh, password reset, email verification, and logout.

## Endpoints

### Register

- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Description**: Register a new user
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "Dev Paanchal",
    "role": "seller" // Optional, defaults to "seller"
  }
  ```
- **Response**:
  - `201 Created`: User registered successfully
  - `400 Bad Request`: Validation error or user already exists

### Login

- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Description**: Login a user
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  - `200 OK`: Login successful
    ```json
    {
      "accessToken": "jwt_token",
      "user": {
        "id": "user_id",
        "name": "Dev Paanchal",
        "email": "user@example.com",
        "role": "seller",
        "companyId": "company_id" // If applicable
      }
    }
    ```
  - `401 Unauthorized`: Invalid credentials or account not active

### Refresh Token

- **URL**: `/api/auth/refresh`
- **Method**: `POST`
- **Description**: Refresh access token using refresh token
- **Request Body** (optional if refresh token is in cookie):
  ```json
  {
    "refreshToken": "refresh_token"
  }
  ```
- **Response**:
  - `200 OK`: Token refreshed successfully
    ```json
    {
      "accessToken": "new_jwt_token"
    }
    ```
  - `401 Unauthorized`: Invalid refresh token

### Request Password Reset

- **URL**: `/api/auth/reset-password`
- **Method**: `POST`
- **Description**: Request a password reset
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**:
  - `200 OK`: Reset email sent (or would be sent if email exists)

### Reset Password

- **URL**: `/api/auth/reset-password/confirm`
- **Method**: `POST`
- **Description**: Reset password using token
- **Request Body**:
  ```json
  {
    "token": "reset_token",
    "password": "new_password123"
  }
  ```
- **Response**:
  - `200 OK`: Password reset successful
  - `400 Bad Request`: Invalid or expired token

### Verify Email

- **URL**: `/api/auth/verify-email`
- **Method**: `POST`
- **Description**: Verify email using token
- **Request Body**:
  ```json
  {
    "token": "verification_token"
  }
  ```
- **Response**:
  - `200 OK`: Email verified successfully
  - `400 Bad Request`: Invalid or expired token

### Logout

- **URL**: `/api/auth/logout`
- **Method**: `POST`
- **Description**: Logout a user
- **Response**:
  - `200 OK`: Logged out successfully

## Authentication

Most API endpoints require authentication using JWT tokens. To authenticate requests, include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## CSRF Protection

For security, all mutation endpoints (POST, PUT, PATCH, DELETE) require a CSRF token in the request header:

```
X-CSRF-Token: <csrf_token>
```

## Rate Limiting

Login attempts are rate-limited to 5 requests per 15 minutes to prevent brute force attacks.

## Error Handling

All endpoints return appropriate HTTP status codes and error messages in the response body:

```json
{
  "message": "Error message",
  "errors": [] // Optional validation errors
}
```
