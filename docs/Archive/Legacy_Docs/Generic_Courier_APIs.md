# Courier APIs Documentation for Helix

**Version:** 2025-04

## Table of Contents
- [General Guidelines](#general-guidelines)
- [DTDC APIs](#dtdc-apis)
- [Delhivery APIs](#delhivery-apis)
- [XpressBees APIs](#xpressbees-apis)
- [Shiprocket APIs](#shiprocket-apis)
- [EcomExpress APIs](#ecomexpress-apis)
- [NimbusPost APIs](#nimbuspost-apis)

## General Guidelines

### Base URLs
- Base URLs vary by courier partner (listed in respective sections).

### Authentication
- Required for all APIs, typically via API keys, tokens, or username/password.
- Store credentials securely and implement rotation mechanisms where supported.
- Use environment variables for storing sensitive keys.

### Content Type
- Most services use `application/json` for request/response bodies.
- Some services may require specific header configurations.

### Error Handling
- Check for HTTP status codes (200: success, 400+: client/server errors)
- Implement retry mechanisms with exponential backoff for transient failures.
- Log both request and response data for debugging purposes.
- Implement circuit breakers for unreliable services.

### Testing
- Create comprehensive test suites for all APIs.
- Test edge cases and error scenarios.
- Use mock servers for development and testing.

### Date Format
- All timestamps are in ISO 8601 format (e.g., `2023-06-01T12:00:00Z`).

## DTDC APIs

Base URL: `https://api.dtdc.com`

### Authentication
| Header | Value |
|--------|-------|
| api-key | {your_api_key} |
| customer-code | {your_customer_code} |

### Create Shipment
Creates a new shipment and obtains an AWB number.

**Endpoint:** `/api/shipments`  
**Method:** POST  
**Content-Type:** application/json

**Request Body:**
```json
{
  "consignments": [
    {
      "origin_details": {
        "name": "Sender Name",
        "phone": "9999999999",
        "address_line_1": "Address Line 1",
        "address_line_2": "Address Line 2", 
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
      },
      "destination_details": {
        "name": "Recipient Name",
        "phone": "8888888888",
        "address_line_1": "Delivery Address Line 1",
        "address_line_2": "Delivery Address Line 2",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560001"
      },
      "return_details": {
        "name": "Return Name",
        "phone": "9999999999",
        "address_line_1": "Return Address Line 1",
        "address_line_2": "Return Address Line 2",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
      },
      "customer_code": "YOUR_CUSTOMER_CODE",
      "load_type": "NON-DOCUMENT",
      "consignment_type": "Forward",
      "dimension_unit": "cm",
      "length": 10,
      "width": 10,
      "height": 10,
      "weight_unit": "kg",
      "num_pieces": 1,
      "commodity_id": "7",
      "customer_reference_number": "ORDER123",
      "weight": 0.5,
      "declared_value": 1000,
      "service_type_id": "B2C SMART EXPRESS",
      "description": "Product Description",
      "reference_number": ""
    }
  ]
}
```

**Response:**
```json
{
  "status": "OK",
  "message": "Success",
  "data": [
    {
      "reference_number": "DTDC123456789",
      "success": true,
      "customer_reference_number": "ORDER123",
      "message": "Shipment created successfully"
    }
  ]
}
```

### Track Shipment
Tracks a shipment using AWB number.

**Endpoint:** `/api/shipments/{awb}/track`  
**Method:** GET  

**Response:**
```json
{
  "status": "SUCCESS",
  "data": {
    "awb_number": "DTDC123456789",
    "current_status": "In Transit",
    "scans": [
      {
        "status": "Shipment Picked Up",
        "location": "Mumbai",
        "scan_date": "2023-06-01T12:00:00Z"
      }
    ]
  }
}
```

## Delhivery APIs

Base URL: `https://track.delhivery.com` (Tracking)  
Base URL: `https://api.delhivery.com` (Shipping)

### Authentication
| Header | Value |
|--------|-------|
| Authorization | Token {your_api_key} |

### Create Shipment
Creates a new shipment and obtains an AWB number.

**Endpoint:** `/api/cmu/create.json`  
**Method:** POST  
**Content-Type:** application/json

**Request Body:**
```json
{
  "shipments": [
    {
      "name": "Recipient Name",
      "add": "Address Line 1, Address Line 2",
      "pin": "560001",
      "city": "Bangalore",
      "state": "Karnataka",
      "country": "India",
      "phone": "8888888888",
      "order": "ORDER123",
      "payment_mode": "COD",
      "return_pin": "400001",
      "return_city": "Mumbai",
      "return_phone": "9999999999",
      "return_add": "Return Address",
      "return_state": "Maharashtra",
      "return_country": "India",
      "products_desc": "Product Description",
      "hsn_code": "",
      "cod_amount": "1000",
      "order_date": "",
      "total_amount": "1000",
      "seller_add": "",
      "seller_name": "",
      "seller_inv": "",
      "quantity": 1,
      "shipment_width": 10,
      "shipment_height": 10,
      "weight": 0.5,
      "seller_gst_tin": "",
      "shipping_mode": "Surface"
    }
  ],
  "pickup_location": {
    "name": "Warehouse Name",
    "add": "Pickup Address",
    "city": "Mumbai",
    "pin_code": "400001",
    "country": "India",
    "phone": "9999999999"
  }
}
```

**Response:**
```json
{
  "success": true,
  "packages": [
    {
      "client": "CLIENT ID",
      "waybill": "1234567890123",
      "refnum": "ORDER123",
      "status": "Success"
    }
  ]
}
```

### Track Shipment
Tracks a shipment using AWB number.

**Endpoint:** `/api/v1/packages/json/`  
**Method:** GET  
**Query Parameters:** `waybill={awb_number}`

**Response:**
```json
{
  "ShipmentData": [
    {
      "Shipment": {
        "AWB": "1234567890123",
        "Status": {
          "Status": "In Transit",
          "StatusDateTime": "2023-06-01T12:00:00Z"
        },
        "Scans": [
          {
            "ScanDetail": {
              "Scan": "Shipment Picked Up",
              "ScanDateTime": "2023-06-01T12:00:00Z",
              "ScannedLocation": "Mumbai"
            }
          }
        ]
      }
    }
  ]
}
```

## XpressBees APIs

Base URL: `https://shipment.xpressbees.com/api`

### Authentication
First obtain a token using login credentials, then use the token in subsequent requests.

**Login Endpoint:** `/users/login`  
**Method:** POST  
**Content-Type:** application/json

**Login Request:**
```json
{
  "email": "your_email@example.com",
  "password": "your_password"
}
```

**Login Response:**
```json
{
  "status": true,
  "data": "YOUR_ACCESS_TOKEN"
}
```

For subsequent requests:
| Header | Value |
|--------|-------|
| Authorization | Bearer {access_token} |

### Get Available Couriers
Fetches list of available couriers.

**Endpoint:** `/courier`  
**Method:** GET  

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "Express",
      "type": "Domestic",
      "mode": "Air"
    }
  ]
}
```

### Create Shipment
Creates a new shipment and obtains an AWB number.

**Endpoint:** `/shipments2`  
**Method:** POST  
**Content-Type:** application/json

**Request Body:**
```json
{
  "order_number": "ORDER123",
  "shipping_charges": 0,
  "discount": 0,
  "cod_charges": 0,
  "payment_type": "cod",
  "order_amount": 1000,
  "package_weight": 0.5,
  "package_length": 10,
  "package_breadth": 10,
  "package_height": 10,
  "request_auto_pickup": "yes",
  "consignee": {
    "name": "Recipient Name",
    "address": "Address Line 1",
    "address_2": "Address Line 2",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "phone": "8888888888"
  },
  "pickup": {
    "warehouse_name": "Warehouse Name",
    "name": "Sender Name",
    "address": "Pickup Address",
    "address_2": "Landmark",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phone": "9999999999"
  },
  "order_items": [
    {
      "name": "Product Name",
      "qty": 1,
      "price": 1000,
      "sku": "SKU123"
    }
  ],
  "courier_id": 1,
  "collectable_amount": "1000"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Shipment created successfully",
  "data": {
    "awb_number": "XBEES123456789",
    "order_id": "ORDER123",
    "label": "https://shipment.xpressbees.com/shipment/label/XBEES123456789.pdf",
    "manifest": "https://shipment.xpressbees.com/shipment/manifest/XBEES123456789.pdf"
  }
}
```

### Track Shipment
Tracks a shipment using AWB number.

**Endpoint:** `/shipments2/track/{awb_number}`  
**Method:** GET  

**Response:**
```json
{
  "status": true,
  "data": {
    "awb_number": "XBEES123456789",
    "status": "in transit",
    "scans": [
      {
        "status": "Shipment Picked Up",
        "location": "Mumbai",
        "date": "2023-06-01T12:00:00Z"
      }
    ]
  }
}
```

## Shiprocket APIs

Base URL: `https://apiv2.shiprocket.in/v1/external`

### Authentication
First obtain a token using login credentials, then use the token in subsequent requests.

**Login Endpoint:** `/auth/login`  
**Method:** POST  
**Content-Type:** application/json

**Login Request:**
```json
{
  "email": "your_email@example.com",
  "password": "your_password"
}
```

**Login Response:**
```json
{
  "token": "YOUR_ACCESS_TOKEN"
}
```

For subsequent requests:
| Header | Value |
|--------|-------|
| Authorization | Bearer {access_token} |
| Content-Type | application/json |

### Create Shipment
Creates a new shipment and obtains an AWB number.

**Endpoint:** `/shipments/create/forward-shipment`  
**Method:** POST  

**Request Body:**
```json
{
  "order_id": "ORDER123",
  "order_date": "2023-06-01",
  "mode": "Surface",
  "courier_id": 1,
  "billing_customer_name": "Recipient Name",
  "billing_address": "Address Line 1",
  "billing_address_2": "Address Line 2",
  "billing_city": "Bangalore",
  "billing_state": "Karnataka",
  "billing_pincode": "560001",
  "billing_country": "India",
  "billing_email": "recipient@example.com",
  "billing_phone": "8888888888",
  "shipping_is_billing": true,
  "order_items": [
    {
      "name": "Product Name",
      "units": 1,
      "selling_price": 1000,
      "sku": "SKU123"
    }
  ],
  "payment_method": "COD",
  "sub_total": 1000,
  "length": 10,
  "breadth": 10,
  "height": 10,
  "weight": 0.5,
  "pickup_location": "Warehouse Name",
  "vendor_details": {
    "email": "sender@example.com",
    "phone": "9999999999",
    "name": "Sender Name",
    "address": "Pickup Address",
    "address_2": "Landmark",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pin_code": "400001",
    "pickup_location": "Warehouse Name"
  }
}
```

**Response:**
```json
{
  "status": 1,
  "message": "Shipment created successfully",
  "payload": {
    "shipment_id": 123456,
    "order_id": 654321,
    "awb_code": "SR1234567890"
  }
}
```

### Track Shipment
Tracks a shipment using AWB number.

**Endpoint:** `/courier/track/awb/{awb_number}`  
**Method:** GET  

**Response:**
```json
{
  "tracking_data": {
    "awb_code": "SR1234567890",
    "shipment_status": 6,
    "current_status": "Shipped",
    "current_status_description": "Shipment has been shipped",
    "scans": [
      {
        "scan_date_time": "2023-06-01T12:00:00Z",
        "scan_type": "Pickup Done",
        "scan_location": "Mumbai"
      }
    ]
  }
}
```

## EcomExpress APIs

Base URL: `https://api.ecomexpress.in`

### Authentication
Username and password are typically sent as part of the form data in each request.

### Create Shipment (2-step process)

#### Step 1: Fetch AWB

**Endpoint:** `/apiv2/fetch_awb/`  
**Method:** POST  
**Content-Type:** multipart/form-data

**Request Form Data:**
```
username: your_username
password: your_password
count: 1
type: COD or PPD (Prepaid)
```

**Response:**
```json
{
  "success": "yes",
  "awb": ["7654321098"]
}
```

#### Step 2: Create Shipment

**Endpoint:** `/apiv2/manifest_awb/`  
**Method:** POST  
**Content-Type:** multipart/form-data

**Request Form Data:**
```
username: your_username
password: your_password
json_input: [
  {
    "AWB_NUMBER": "7654321098",
    "ORDER_NUMBER": "ORDER123",
    "PRODUCT": "COD",
    "CONSIGNEE": "Recipient Name",
    "CONSIGNEE_ADDRESS1": "Address Line 1",
    "CONSIGNEE_ADDRESS2": "Address Line 2",
    "DESTINATION_CITY": "Bangalore",
    "PINCODE": "560001",
    "STATE": "Karnataka",
    "MOBILE": "8888888888",
    "TELEPHONE": "8888888888",
    "ITEM_DESCRIPTION": "Product Description",
    "PIECES": 1,
    "COLLECTABLE_VALUE": 1000,
    "DECLARED_VALUE": 1000,
    "ACTUAL_WEIGHT": 0.5,
    "VOLUMETRIC_WEIGHT": 0.5,
    "LENGTH": 10,
    "BREADTH": 10,
    "HEIGHT": 10,
    "PICKUP_NAME": "Sender Name",
    "PICKUP_ADDRESS_LINE1": "Pickup Address",
    "PICKUP_ADDRESS_LINE2": "Landmark",
    "PICKUP_PINCODE": "400001",
    "PICKUP_PHONE": "9999999999",
    "PICKUP_MOBILE": "9999999999",
    "RETURN_NAME": "Return Name",
    "RETURN_ADDRESS_LINE1": "Return Address",
    "RETURN_ADDRESS_LINE2": "Return Landmark",
    "RETURN_PINCODE": "400001",
    "RETURN_PHONE": "9999999999",
    "RETURN_MOBILE": "9999999999",
    "DG_SHIPMENT": "false",
    "ADDITIONAL_INFORMATION": {
      "SELLER_GSTIN": "06FKCPS6109D3Z7",
      "INVOICE_DATE": "01-06-2023",
      "INVOICE_NUMBER": "SI_123",
      "GST_HSN": "8471",
      "ESSENTIALPRODUCT": "Y",
      "PICKUP_TYPE": "WH",
      "RETURN_TYPE": "WH"
    }
  }
]
```

**Response:**
```json
{
  "shipments": [
    {
      "awb": "7654321098",
      "order_number": "ORDER123",
      "success": true,
      "reason": ""
    }
  ]
}
```

### Track Shipment
Tracks a shipment using AWB number.

**Endpoint:** `/plapi.ecomexpress.in/track_me/api/mawbd/`  
**Method:** GET  
**Query Parameters:** `username={username}&password={password}&awb={awb_number}`

**Response:**
XML response with tracking details that needs to be parsed.

## NimbusPost APIs

Base URL: `https://api.nimbuspost.com/v1`

### Authentication
First obtain a token using login credentials, then use the token in subsequent requests.

**Login Endpoint:** `/users/login`  
**Method:** POST  
**Content-Type:** application/json

**Login Request:**
```json
{
  "email": "your_email@example.com",
  "password": "your_password"
}
```

**Login Response:**
```json
{
  "status": true,
  "data": "YOUR_ACCESS_TOKEN"
}
```

For subsequent requests:
| Header | Value |
|--------|-------|
| Authorization | Bearer {access_token} |
| Content-Type | application/json |

### Create Shipment
Creates a new shipment and obtains an AWB number.

**Endpoint:** `/shipments`  
**Method:** POST  

**Request Body:**
```json
{
  "order_number": "ORDER123",
  "shipping_charges": 0,
  "discount": 0,
  "cod_charges": 0,
  "payment_type": "cod",
  "order_amount": 1000,
  "package_weight": 0.5,
  "package_length": 10,
  "package_breadth": 10,
  "package_height": 10,
  "request_auto_pickup": "yes",
  "consignee": {
    "name": "Recipient Name",
    "address": "Address Line 1",
    "address_2": "Address Line 2",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "phone": "8888888888"
  },
  "pickup": {
    "warehouse_name": "Warehouse Name",
    "name": "Sender Name",
    "address": "Pickup Address",
    "address_2": "Landmark",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phone": "9999999999"
  },
  "order_items": [
    {
      "name": "Product Name",
      "qty": 1,
      "price": 1000,
      "sku": "SKU123"
    }
  ],
  "courier_id": 1,
  "collectable_amount": "1000"
}
```

**Response:**
```json
{
  "status": true,
  "message": "Shipment created successfully",
  "data": {
    "awb_number": "NP123456789",
    "shipment_id": "NP-SHIP-123456",
    "order_id": "ORDER123"
  }
}
```

### Track Shipment
Tracks a shipment using AWB number.

**Endpoint:** `/shipments/track/{awb_number}`  
**Method:** GET  

**Response:**
```json
{
  "status": true,
  "data": {
    "awb_number": "NP123456789",
    "status": "in transit",
    "scans": [
      {
        "status": "Shipment Picked Up",
        "location": "Mumbai",
        "timestamp": "2023-06-01T12:00:00Z"
      }
    ]
  }
}
```
XpressBees API Integration in Blueship
Authentication
URL: https://shipment.xpressbees.com/api/users/login
Method: POST
Headers: Content-Type: application/json

Request Body Format:
{
  "email": "your_email@example.com",
  "password": "your_password"
}

Response Format:
{
  "status": true,
  "data": "YOUR_ACCESS_TOKEN"
}

Get Available Couriers
URL: https://shipment.xpressbees.com/api/courier
Method: GET
Headers: Authorization: Bearer {access_token}

Response Format:
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "Express",
      "type": "Domestic",
      "mode": "Air"
    }
  ]
}

Create Shipment
URL: https://shipment.xpressbees.com/api/shipments2
Method: POST
Headers:

Authorization: Bearer {token}
Content-Type: application/json

Request Body Format:
{
  "order_number": "ORDER123",
  "shipping_charges": 0,
  "discount": 0,
  "cod_charges": 0,
  "payment_type": "cod",
  "order_amount": 1000,
  "package_weight": 0.5,
  "package_length": 10,
  "package_breadth": 10,
  "package_height": 10,
  "request_auto_pickup": "yes",
  "consignee": {
    "name": "Recipient Name",
    "address": "Address Line 1",
    "address_2": "Address Line 2",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": "560001",
    "phone": "8888888888"
  },
  "pickup": {
    "warehouse_name": "Warehouse Name",
    "name": "Sender Name",
    "address": "Pickup Address",
    "address_2": "Landmark",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phone": "9999999999"
  },
  "order_items": [
    {
      "name": "Product Name",
      "qty": 1,
      "price": 1000,
      "sku": "SKU123"
    }
  ],
  "courier_id": 1,
  "collectable_amount": "1000"
}

Response Format:
{
  "status": true,
  "message": "Shipment created successfully",
  "data": {
    "awb_number": "XBEES123456789",
    "order_id": "ORDER123",
    "label": "https://shipment.xpressbees.com/shipment/label/XBEES123456789.pdf",
    "manifest": "https://shipment.xpressbees.com/shipment/manifest/XBEES123456789.pdf"
  }
}

Check Serviceability
URL: https://shipment.xpressbees.com/api/courier/serviceability
Method: POST
Headers:
Authorization: Bearer {token}
Content-Type: application/json

Request Body Format:
{
  "origin": "400001",
  "destination": "560001",
  "payment_type": "cod",
  "order_amount": 1000,
  "weight": 0.5,
  "length": 10,
  "breadth": 10,
  "height": 10
}

Response Format:
{
  "status": true,
  "data": {
    "serviceability": true,
    "courier_id": 1,
    "courier_name": "Express",
    "etd": "2-3 days",
    "rate": 150.00
  }
}

Track Shipment
URL: https://shipment.xpressbees.com/api/shipments/{awb_number}/track
Method: GET
Headers: Authorization: Bearer {token}

Response Format:
{
  "status": true,
  "data": {
    "awb_number": "XB1234567890",
    "order_number": "ORDER123",
    "current_status": "In Transit",
    "status_date": "2023-06-01T12:00:00Z",
    "scans": [
      {
        "scan_type": "Pickup",
        "scan_date": "2023-06-01T10:00:00Z",
        "location": "Mumbai",
        "status_description": "Shipment Picked Up"
      },
      {
        "scan_type": "In Transit",
        "scan_date": "2023-06-01T12:00:00Z",
        "location": "Mumbai Hub",
        "status_description": "Shipment Processed at Origin Hub"
      }
    ]
  }
}

NDR Management
Get NDR List
URL: https://shipment.xpressbees.com/api/ndr
Method: GET
Headers: Authorization: Bearer {token}

Response Format:
{
  "status": true,
  "data": [
    {
      "awb": "XB1234567890",
      "order_number": "ORDER123",
      "ndr_date": "2023-06-05T14:00:00Z",
      "reason": "Customer not available",
      "attempts": 1,
      "customer_name": "Recipient Name",
      "customer_phone": "8888888888",
      "delivery_address": "Address Line 1, Address Line 2, Bangalore, Karnataka, 560001"
    }
  ]
}

Create NDR Action
URL: https://shipment.xpressbees.com/api/ndr/action
Method: POST
Headers:

Content-Type: application/json
Authorization: Bearer {token}
Request Body Format:
{
  "awb": "XB1234567890",
  "action": "reschedule",
  "action_data": {
    "date": "2023-06-07",
    "time_slot": "10:00-12:00"
  }
}

Response Format:
{
  "status": true,
  "data": {
    "message": "NDR action created successfully",
    "reference_id": "NDR123456"
  }
}

Cancel Shipment
URL: https://shipment.xpressbees.com/api/shipments/{awb_number}/cancel
Method: POST
Headers: Authorization: Bearer {token}

Request Body Format:
{
  "reason": "Customer requested cancellation"
}

Response Format:
{
  "status": true,
  "data": {
    "message": "Shipment cancelled successfully"
  }
}

Create Pickup Request
URL: https://shipment.xpressbees.com/api/pickup
Method: POST
Headers:

Content-Type: application/json
Authorization: Bearer {token}
Request Body Format:
{
  "awbs": ["XB1234567890", "XB1234567891"],
  "pickup_date": "2023-06-07",
  "pickup_time": "14:00-16:00",
  "contact_person": "Warehouse Manager",
  "contact_number": "9999999999"
}

Response Format:
{
  "status": true,
  "data": {
    "pickup_id": "PK123456",
    "message": "Pickup request created successfully"
  }
}