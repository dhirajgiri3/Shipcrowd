# Velocity Shipping API Documentation

## Overview

This document serves as a complete and developer-friendly reference to the Velocity Shipping API suite. It is intended to help sellers and third-party platforms seamlessly integrate their custom websites, ERPs, or order management systems with Velocity Shipping (Formerly Shipfast).

The documentation covers:
- Clear and detailed API endpoint definitions
- Field-level request specifications
- Sample request and response payloads
- Standard error codes with explanations

By using these APIs, integrators can efficiently create, manage, and track shipments, enabling end-to-end order manifestation and shipping operations through Velocity Shipping.

**Base URL**: `https://shazam.velocity.in/`

## Standard Error Codes

| HTTP Code | Description |
| :--- | :--- |
| **400** | Validation error in request parameters |
| **401** | Authorization failed due to invalid or missing credentials |
| **422** | Waybill operation failed |
| **422** | Shipment cancellation failed |

---

## 1. Authentication - Get Token

### Purpose
Obtain API token for Authorization header in subsequent requests.

**Method**: `POST`
**Endpoint**: `/custom/api/v1/auth-token`

### Request Fields

| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `username` | string | Yes | Mobile number with country code (Velocity Shipping Username) | `+91xxxxxxxxx` |
| `password` | string | Yes | Velocity Shipping Account password | `Your password` |

### Notes
- Use `Authorization: {{token}}` in all secured endpoints.
- Token will be valid for 24 Hrs.

### Sample Request Curl
```bash
curl --location '/custom/api/v1/auth-token' \
--header 'Content-Type: application/json' \
--data-raw '{
  "username": "+919866340090",
  "password": "Velocity@123"
}'
```

### Response
```json
{
  "token": "bbqRkOXw0xWLuYj9ubnDwg",
  "expires_at": "2025-09-17T10:11:40"
}
```

---

## 2. Create Warehouse

### Purpose
Creates a new pickup warehouse in the Velocity Shipping system.

**Method**: `POST`
**Endpoint**: `/custom/api/v1/warehouse`

### Request Fields

| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `name` | string | Yes | Warehouse display name | Demo Warehouse |
| `phone_number` | string | Yes | POC Contact number | 8860606061 |
| `gst_no` | string | Optional | Gst no. of the warehouse | TY9782399913 |
| `email` | string | Yes | POC email | shipfast-clickpost@velocity.in |
| `contact_person` | string | Yes | Warehouse POC | Raghuraj |
| `address_attributes.street_address` | string | Yes | Street address | Incubex HSR Layout ... |
| `address_attributes.zip` | string | Yes | PIN | 560102 |
| `address_attributes.city` | string | Yes | City | Bangalore |
| `address_attributes.state` | string | Yes | State | Karnataka |
| `address_attributes.country` | string | Yes | Country | India |

### Sample Request Curl
```bash
curl --location '/custom/api/v1/warehouse' \
--header 'Content-Type: application/json' \
--header 'Authorization: bbqRkOXw0xWLuYj9ubnDwg' \
--data-raw '{
  "name": "Demo Warehouse",
  "phone_number": "8860606061",
  "gst_no": "886060608861",
  "email": "shipfast-clickpost@velocity.in",
  "contact_person": "Raghuraj",
  "address_attributes": {
    "street_address": "Incubex HSR Layout (HSR6) #1504, 19th Main, 11th Cross Rd, opposite Decathlon, 1st Sector, HSR Layout",
    "zip": "560102",
    "city": "Bangalore",
    "state": "Karnataka",
    "country": "India"
  }
}'
```

### Response
```json
{
  "status": "SUCCESS",
  "payload": {
    "warehouse_id": "WH66DU"
  }
}
```

---

## 3. Serviceability API

### Purpose
Checks whether pickup and delivery are supported between two pincodes for a given payment mode and shipment type and also shares a list of eligible carriers for the lane.

**Method**: `POST`
**Endpoint**: `/custom/api/v1/serviceability`

### Request Fields

| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `from` | string | Yes | Pickup pincode | 560068 |
| `to` | string | Yes | Destination pincode | 560068 |
| `payment_mode` | enum | Yes | `cod` or `prepaid` | cod |
| `shipment_type` | enum | Yes | `forward` or `return` | forward |

### Sample Request Curl
```bash
curl --location 'https://shazam.velocity.in/custom/api/v1/serviceability' \
--header 'Content-Type: application/json' \
--header 'Authorization: DO190JE4z8qD4S7ly6hx9Q' \
--data '{
  "from": "560068",
  "to": "560068",
  "payment_mode": "cod",
  "shipment_type": "forward"
}'
```

### Response
```json
{
  "result": {
    "serviceability_results": [
      {
        "carrier_id": "CAR0EPDPJXXL4",
        "carrier_name": "DTDC Standard"
      },
      {
        "carrier_id": "CARCVBWTPRH08",
        "carrier_name": "Ekart Standard"
      },
      {
        "carrier_id": "CAR5IXXJVT5MD",
        "carrier_name": "Delhivery Standard 5 Kg"
      },
      {
        "carrier_id": "CARVKGNGNLOCU",
        "carrier_name": "Blitz Special"
      },
      {
        "carrier_id": "CARFYXUKCQHBM",
        "carrier_name": "Delhivery Special Standard 20 kg"
      },
      {
        "carrier_id": "CARVPHPLJQJOA",
        "carrier_name": "Delhivery Special Standard 10 kg"
      },
      {
        "carrier_id": "CARO0ZZQH1H6U",
        "carrier_name": "Delhivery Standard"
      },
      {
        "carrier_id": "CAR2FZNOLGJ2X",
        "carrier_name": "Bluedart Standard"
      },
      {
        "carrier_id": "CARLTTKCUYWRM",
        "carrier_name": "Delhivery Standard 250G"
      },
      {
        "carrier_id": "CARTS5SW8LSJT",
        "carrier_name": "XpressBees Standard"
      },
      {
        "carrier_id": "CARKX7WW6UNS8",
        "carrier_name": "Pikndel NDD"
      }
    ],
    "zone": "zone_a"
  },
  "status": "SUCCESS"
}
```

---

## 4. Forward Shipment - Create Order

### Purpose
Creates and manifests a forward shipment (i.e. create an order and also assign to a courier) after successful serviceability validation.

**Method**: `POST`
**Endpoint**: `/custom/api/v1/forward-order-orchestration`

### Request Fields

#### i) Order, Channel & Carrier
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `order_id` | string | Yes | Unique per order | ORDER-49 |
| `order_date` | string | Yes | `YYYY-MM-DD HH:mm` | 2018-05-08 12:23 |
| `channel_id` | string | Optional | Source/channel ID | 27202 |
| `carrier_id` | string | Optional | `carrier_id` fetched from Serviceability API. Leave blank for auto-assignment. | CARO0ZZQH1H6U |

#### ii) Billing & Shipping
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `billing_customer_name` | string | Yes | First name | Saurabh |
| `billing_last_name` | string | Optional | Last name | Jindal |
| `billing_address` | string | Yes | Address line 1 | Incubex, Velocity |
| `billing_city` | string | Yes | City | Bangalore |
| `billing_pincode` | string | Yes | 6-digit PIN | 560102 |
| `billing_state` | string | Yes | State | Karnataka |
| `billing_country` | string | Yes | Country | India |
| `billing_email` | string | Optional | Email | saurabh+123891@velocity.in |
| `billing_phone` | string | Yes | Phone | 8860697807 |
| `shipping_is_billing` | boolean | Optional | True if shipping is same as billing | TRUE |
| `print_label` | boolean | Yes | Auto-generate label | TRUE |

#### iii) Items & Payment
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `order_items[]` | array | Yes | List of items | (see JSON) |
| `payment_method` | enum | Yes | `COD` or `PREPAID` | COD |
| `sub_total` | number | Yes | Order subtotal | 990 |
| `cod_collectible` | number | Yes | Required if payment_method is COD, pass 0 for PREPAID | 990 |

#### iv) Dimensions & Warehouse
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `length` | number | Yes | cm | 100 |
| `breadth` | number | Yes | cm | 50 |
| `height` | number | Yes | cm | 10 |
| `weight` | number | Yes | kg | 0.5 |
| `pickup_location` | string | Yes | Pickup Location Name | Lucknow Warehouse |
| `warehouse_id` | string | Yes | Pickup warehouse Id in Velocity Shipping Portal | WHYYB5 |

#### v) Vendor Details (Pickup Location details)
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `email` | string | Optional | Vendor email | abcdd@abcdd.com |
| `phone` | string | Optional | Vendor phone | 9879879879 |
| `name` | string | Optional | Vendor name | Coco Cookie |
| `address` | string | Optional | Address | Street 1 |
| `city` | string | Optional | City | delhi |
| `state` | string | Optional | State | new delhi |
| `country` | string | Optional | Country | india |
| `pin_code` | string | Optional | PIN | 110077 |
| `pickup_location` | string | Optional | Pickup label | HomeNew |

### Sample Request Curl
```bash
curl --location 'https://shazam.velocity.in/custom/api/v1/forward-order-orchestration' \
--header 'Content-Type: application/json' \
--header 'Authorization: DO190JE4z8qD4S7ly6hx9Q' \
--data-raw '{
  "order_id": "ORDER-43242",
  "order_date": "2018-05-08 12:23",
  "channel_id": "27202",
  "carrier_id": "CARO0ZZQH1H6U",
  "billing_customer_name": "Saurabh",
  "billing_last_name": "Jindal",
  "billing_address": "Incubex, Velocity",
  "billing_city": "Bangalore",
  "billing_pincode": "560102",
  "billing_state": "Karnataka",
  "billing_country": "India",
  "billing_email": "saurabh+123891@velocity.in",
  "billing_phone": "8860697807",
  "shipping_is_billing": true,
  "print_label": true,
  "order_items": [{"name": "T-shirt Round Neck","sku": "t-shirt-round1474","units": 2,"selling_price": 1000,"discount": 100,"tax": 10}],
  "payment_method": "COD",
  "sub_total": 990,
  "cod_collectible": 990,
  "length": 100,
  "breadth": 50,
  "height": 10,
  "weight": 0.5,
  "pickup_location": "HomeNew",
  "warehouse_id": "WHZWUN",
  "vendor_details": {"email": "abcdd@abcdd.com","phone": "9879879879","name": "Coco Cookie","address": "Street 1","address_2": "","city": "delhi","state": "new delhi","country": "india","pin_code": "110077","pickup_location": "HomeNew"}}
}'
```

### Response
```json
{
  "status": 1,
  "payload": {
    "pickup_location_added": 1,
    "order_created": 1,
    "awb_generated": 1,
    "label_generated": 1,
    "pickup_generated": 1,
    "manifest_generated": 0,
    "pickup_scheduled_date": null,
    "pickup_booked_date": null,
    "order_id": "ORDKDKHOFL07I",
    "shipment_id": "SHIHB0BMT4DYM",
    "awb_code": "34812010700125",
    "courier_company_id": "CARO0ZZQH1H6U",
    "courier_name": "Delhivery Standard",
    "assigned_date_time": {
      "date": "2025-09-30T17:50:50.424+05:30",
      "timezone_type": 3,
      "timezone": "Asia/Kolkata"
    },
    "applied_weight": 0.5,
    "cod": 1,
    "label_url": "https://velocity-shazam-prod.s3.ap-south-1.amazonaws.com/n9u98s...",
    "manifest_url": null,
    "routing_code": null,
    "rto_routing_code": null,
    "pickup_token_number": null,
    "charges": {
      "frwd_charges": {
        "shipping_charges": "44.40",
        "cod_charges": "31.30",
        "dead_weight_billing": true
      },
      "rto_charges": {
        "rto_charges": "40.00"
      }
    }
  }
}
```

---

## 5. Forward Shipment - Split Flow (Order + Shipment)

Velocity Shipping allows you to create an order without assigning a courier and assign the courier later by creating the shipment in a separate step.

### 5.1. Create Order Only (No Courier Assignment)

**Method**: `POST`
**Endpoint**: `/custom/api/v1/forward-order`

### Sample Request Curl
```bash
curl --location 'https://shazam.velocity.in/custom/api/v1/forward-order' \
--header 'Authorization: Iu9npoZf8PWpvIIBeMZXWQ' \
--header 'Content-Type: application/json' \
--data-raw '{
    "order_id": "ORDER-0099iyhih",
    "order_date": "2018-05-08 12:23",
    "channel_id": "27202",
    "billing_customer_name": "Saurabh",
    "billing_last_name": "Jindal",
    "billing_address": "Incubex, Velocity",
    "billing_city": "Bangalore",
    "billing_pincode": "560102",
    "billing_state": "Karnataka",
    "billing_country": "India",
    "billing_email": "saurabh+123891@velocity.in",
    "billing_phone": "8860697807",
    "shipping_is_billing": true,
    "print_label": true,
    "order_items": [
        {
            "name": "T-shirt Round Neck",
            "sku": "t-shirt-round1474",
            "units": 2,
            "selling_price": 1000,
            "discount": 100,
            "tax": 10
        },
        {
            "name": "T-shirt Round Neck V2",
            "sku": "t-shirt-V",
            "units": 10,
            "selling_price": 100,
            "discount": 10,
            "tax": 10
        }
    ],
    "payment_method": "COD",
    "sub_total": 990,
    "length": 100,
    "cod_collectible": 990, 
    "breadth": 50,
    "height": 10,
    "weight": 0.50,
    "pickup_location": "HomeNew",
    "warehouse_id": "WHYYB5", 
    "vendor_details": {
        "email": "abcdd@abcdd.com",
        "phone": "9879879879",
        "name": "Coco Cookie",
        "address": "Street 1",
        "address_2": "",
        "city": "delhi",
        "state": "new delhi",
        "country": "india",
        "pin_code": "110077",
        "pickup_location": "HomeNew"
    }
}'
```

### Response
```json
{
   "status": 1,
   "payload": {
       "pickup_location_added": 1,
       "order_created": 1,
       "awb_generated": 0,
       "pickup_generated": 0,
       "shipment_id": "SHIXRE1ER7BQI",
       "order_id": "ORDBJSDAMG9YN",
       "assigned_date_time": {
           "date": "2026-01-20T16:59:16.669+05:30",
           "timezone_type": 3,
           "timezone": "Asia/Kolkata"
       },
       "applied_weight": null,
       "cod": 1,
       "label_url": null,
       "manifest_url": null,
       "routing_code": null,
       "rto_routing_code": null,
       "pickup_token_number": null
   }
}
```
*Note: At this stage, order & shipment are created, but no courier is assigned and no AWB is generated.*

### 5.2. Create Shipment (Assign Courier)

Use the `shipment_id` received in the previous step to assign a courier and create the shipment.

**Method**: `POST`
**Endpoint**: `/custom/api/v1/forward-order-shipment`

### Sample Request Curl
```bash
curl --location 'https://shazam.stagingvelocity.in/custom/api/v1/forward-order-shipment' \
--header 'Authorization: RJShHQFn_YuXsMzfZb9-1A' \
--header 'Content-Type: application/json' \
--data '{
    "shipment_id":"SHIXRE1ER7BQI",
    "carrier_id":"" // optional
}'
```

### Response
```json
{
  "status": 1,
  "payload": {
    "pickup_location_added": 1,
    "order_created": 1,
    "awb_generated": 1,
    "label_generated": 1,
    "pickup_generated": 1,
    "manifest_generated": 0,
    "pickup_scheduled_date": null,
    "pickup_booked_date": null,
    "order_id": "ORDKDKHOFL07I",
    "shipment_id": "SHIHB0BMT4DYM",
    "awb_code": "34812010700125",
    "courier_company_id": "CARO0ZZQH1H6U",
    "courier_name": "Delhivery Standard",
    "assigned_date_time": {
      "date": "2025-09-30T17:50:50.424+05:30",
      "timezone_type": 3,
      "timezone": "Asia/Kolkata"
    },
    "applied_weight": 0.5,
    "cod": 1,
    "label_url": "https://velocity-shazam-prod.s3.ap-south-1.amazonaws.com/n9u98s...",
    "manifest_url": null,
    "routing_code": null,
    "rto_routing_code": null,
    "pickup_token_number": null,
    "charges": {
      "frwd_charges": {
        "shipping_charges": "44.40",
        "cod_charges": "31.30",
        "dead_weight_billing": true
      },
      "rto_charges": {
        "rto_charges": "40.00"
      }
    }
  }
}
```

---

## 6. Reverse Pickup Shipment - Create Order

### Purpose
Creates and manifests a reverse (return) pickup shipment i.e. creates a reverse pickup order and also assigns a courier.

**Method**: `POST`
**Endpoint**: `/custom/api/v1/reverse-order-orchestration`

### Request Fields

#### i) Order, Channel & Carrier
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `order_id` | string | Yes | Unique per return | ORDER-49 |
| `order_date` | string | Yes | `YYYY-MM-DD HH:mm` | 2018-05-08 12:23 |
| `channel_id` | string | Optional | Source/channel ID | 27202 |
| `carrier_id` | string | Optional | `carrier_id` fetched from Serviceability API | CARO0ZZQH1H6U |

#### ii) Pickup Address (Customer)
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `pickup_customer_name` | string | Yes | First name | Saurabh |
| `pickup_last_name` | string | Optional | Last name | Jindal |
| `company_name` | string | Optional | Company name | iorn pvt ltd |
| `pickup_address` | string | Yes | Address line 1 | Incubex, Velocity |
| `pickup_address_2` | string | Optional | Address line 2 | |
| `pickup_city` | string | Yes | City | Bangalore |
| `pickup_state` | string | Yes | State | Karnataka |
| `pickup_country` | string | Yes | Country | India |
| `pickup_pincode` | string | Yes | PIN code | 560102 |
| `pickup_email` | string | Optional | Email | saurabh+123891@velocity.in |
| `pickup_phone` | string | Yes | Phone | 8860697807 |
| `pickup_isd_code` | string | Optional | Country code | 91 |

#### iii) Shipping Address (Destination / Warehouse)
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `shipping_customer_name` | string | Yes | Name | Jax |
| `shipping_last_name` | string | Optional | Last name | Doe |
| `shipping_address` | string | Yes | Address line 1 | Castle |
| `shipping_address_2` | string | Optional | Address line 2 | Bridge |
| `shipping_city` | string | Yes | City | Delhi |
| `shipping_state` | string | Yes | State | New Delhi |
| `shipping_country` | string | Yes | Country | India |
| `shipping_pincode` | string | Yes | PIN | 110015 |
| `shipping_email` | string | Optional | Email | kumar.abhishek@shiprocket.com |
| `shipping_isd_code` | string | Optional | Country code | 91 |
| `shipping_phone` | string | Yes | Phone | 8888888888 |

#### iv) Items & Payment
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `order_items[]` | array | Yes | List of items | (See JSON) |
| `payment_method` | enum | Yes | Usually `PREPAID` for returns | PREPAID |
| `total_discount` | number/string | Optional | Discount total | 0 |
| `sub_total` | number | Yes | Item value | 400 |

#### v) Dimensions & Warehouse
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `length` | number | Yes | cm | 3 |
| `breadth` | number | Yes | cm | 1 |
| `height` | number | Yes | cm | 1 |
| `weight` | number | Yes | kg | 0.3 |
| `warehouse_id` | string | Yes | Destination warehouse | WHYYB5 |
| `request_pickup` | boolean | Optional | Auto pickup scheduling | true |

### Manifesting a QC shipment

#### A) Mandatory Parameters for QC Shipments
For manifesting a QC shipment, following parameters must be passed:
- `qc_enable`: `true`
- `qc_product_name`: string
- `qc_product_image`: URL string (Mandatory)
- `qc_brand`: string
- `qc_size`, `qc_color`: as applicable

#### B) Prerequisites for Enabling QC
1. **Enable Return QC in Velocity Shipping**: Navigate to Settings → Return Quality Check to enable QC and select parameters.
2. **Check Courier-level QC Guidelines**:
    - Max SKUs per single return order: **2**
    - Max QC parameters for evaluation: **6**
    - If SKU count > 2, it will be manifested as Non-QC.
3. **Enable QC at SKU Level**: For each SKU requiring QC, specify details (image, brand, color, size). **Product image is mandatory.**

#### C) Courier Coverage for Return QC
Currently, Return QC is supported only for **Delhivery** and **Shadowfax**. If a QC-enabled courier is not serviceable on a route, it may be routed via a regular courier as a Non-QC shipment.

### Sample Request Curl
```bash
curl --location 'https://shazam.velocity.in/custom/api/v1/reverse-order-orchestration' \
--header 'Content-Type: application/json' \
--header 'Authorization: oEKN6oibwqhFWhSnBDBJUQ' \
--data-raw '{
  "order_id": "RET-12345157",
  "order_date": "2022-02-16",
  "carrier_id": "CARO0ZZQH1H6U",
  "pickup_customer_name": "Saurabh",
  "pickup_last_name": "Jindal",
  "company_name": "iorn pvt ltd",
  "pickup_address": "Incubex, Velocity",
  "pickup_address_2": "",
  "pickup_city": "Bangalore",
  "pickup_state": "Karnataka",
  "pickup_country": "India",
  "pickup_pincode": "560102",
  "pickup_email": "saurabh+123891@velocity.in",
  "pickup_phone": "8860697807",
  "pickup_isd_code": "91",
  "shipping_customer_name": "Jax",
  "shipping_last_name": "Doe",
  "shipping_address": "Castle",
  "shipping_address_2": "Bridge",
  "shipping_city": "Delhi",
  "shipping_country": "India",
  "shipping_pincode": 110015,
  "shipping_state": "New Delhi",
  "shipping_email": "kumar.abhishek123@velocity.in",
  "shipping_isd_code": "91",
  "shipping_phone": 8888888888,
  "warehouse_id": "WHO89A",
  "order_items": [{"name": "shoes","qc_enable": true,"qc_product_name": "shoes","sku": "WSH234","units": 1,"selling_price": 100,"discount": 0,"qc_brand": "Levi","qc_product_image": "https://example.com/image.jpg"}],
  "payment_method": "PREPAID",
  "total_discount": "0",
  "sub_total": 400,
  "length": 3,
  "breadth": 1,
  "height": 1,
  "weight": 0.3,
  "request_pickup": true
}'
```

### Response
```json
{
  "status": 1,
  "payload": {
    "order_created": 1,
    "awb_generated": 1,
    "pickup_generated": 1,
    "pickup_scheduled_date": null,
    "order_id": "ORDMUJCVLS7CB",
    "shipment_id": "SHIUEOB5S6CS5",
    "awb_code": "VEHR4336705675",
    "courier_company_id": "CARCVBWTPRH08",
    "courier_name": "Ekart Standard",
    "assigned_date_time": {
      "date": "2025-10-03T15:39:11.189+05:30",
      "timezone_type": 3,
      "timezone": "Asia/Kolkata"
    },
    "applied_weight": 0.34,
    "cod": 0,
    "is_return": 1,
    "routing_code": null,
    "rto_routing_code": null,
    "pickup_token_number": null,
    "charges": {
      "reverse_charges": "91.30",
      "qc": "0.00",
      "qc_leeway": "0.00",
      "dead_weight_billing": false
    }
  }
}
```

---

## 7. Reverse Shipment - Split Flow (Order + Shipment)

Velocity Shipping allows you to create a reverse pickup order without assigning a courier and assign the courier later by creating the shipment in a separate step.

### 7.1. Create Reverse Pickup Order Only

**Method**: `POST`
**Endpoint**: `/custom/api/v1/reverse-order`

### Sample Request Curl
```bash
curl --location 'https://shazam.stagingvelocity.in/custom/api/v1/reverse-order' \
--header 'Authorization: RJShHQFn_YuXsMzfZb9-1A' \
--header 'Content-Type: application/json' \
--data-raw '{
    "order_id": "rj-ddf21",
    "order_date": "2022-02-16",
    "channel_id": "2113680",
    "pickup_customer_name": "Saurabh",
    "pickup_last_name": "Jindal",
    "company_name": "iorn pvt ltd",
    "pickup_address": "Incubex, Velocity",
    "pickup_address_2": "",
    "pickup_city": "Bangalore",
    "pickup_state": "Karnataka",
    "pickup_country": "India",
    "pickup_pincode": "560068",
    "pickup_email": "saurabh+123891@velocity.in",
    "pickup_phone": "8860697807",
    "pickup_isd_code": "91",
    "shipping_customer_name": "Jax",
    "shipping_last_name": "Doe",
    "shipping_address": "Castle",
    "shipping_address_2": "Bridge",
    "shipping_city": "Delhi",
    "shipping_country": "India",
    "shipping_pincode": "560068",
    "shipping_state": "New Delhi",
    "shipping_email": "kumar.abhishek@shiprocket.com",
    "shipping_isd_code": "91",
    "shipping_phone": "8888888888",
    "warehouse_id": "WHFYPF",
    "order_items": [
        {
            "name": "shoes",
            "qc_enable": true,
            "qc_product_name": "shoes",
            "sku": "WSH234",
            "units": 1,
            "selling_price": 100,
            "discount": 0,
            "qc_brand": "Levi",
            "qc_product_image": "https://assets.vogue.in/photos/5d7224d50ce95e0008696c55/2:3/w_2240,c_limit/Joker.jpg"
        }
    ],
    "payment_method": "PREPAID",
    "total_discount": "0",
    "sub_total": 400,
    "length": 3,
    "breadth": 1,
    "height": 1,
    "weight": 0.3,
    "request_pickup": true
}'
```

### Response
```json
{
  "status": 1,
  "payload": {
    "order_created": 1,
    "awb_generated": 0,
    "pickup_generated": 0,
    "pickup_scheduled_date": null,
    "order_id": "ORDGMSLAUDVBF",
    "return_id": "RETVTLUPWTWIK",
    "assigned_date_time": {
      "date": "2026-01-20T17:01:40.864+05:30",
      "timezone_type": 3,
      "timezone": "Asia/Kolkata"
    },
    "cod": 0
  }
}
```

### 7.2. Create Reverse Shipment (Assign Courier)

Use the `return_id` received in the previous step to assign a courier and create the shipment.

**Method**: `POST`
**Endpoint**: `/custom/api/v1/reverse-order-shipment`

### Sample Request Curl
```bash
curl --location 'https://shazam.stagingvelocity.in/custom/api/v1/reverse-order-shipment' \
--header 'Authorization: bN9m81J0bQWEfPhK4xDu1g' \
--header 'Content-Type: application/json' \
--data '{
    "return_id": "RETYHL9924N5B",
    "warehouse_id": "WHYYB5",
    "carrier_id":"" //optional
}'
```

### Response
```json
{
   "status": 1,
   "payload": {
       "order_created": 0,
       "awb_generated": 1,
       "pickup_generated": 1,
       "pickup_scheduled_date": null,
       "order_id": null,
       "shipment_id": "SHILAVYR2A4YI",
       "awb_code": "R773426643VEL",
       "courier_company_id": "",
       "courier_name": "Shadowfax ROAD",
       "assigned_date_time": {
           "date": "2026-01-20T17:03:25.550+05:30",
           "timezone_type": 3,
           "timezone": "Asia/Kolkata"
       },
       "applied_weight": 0.0006,
       "cod": 0,
       "is_return": 1,
       "routing_code": null,
       "rto_routing_code": null,
       "pickup_token_number": null,
       "charges": {
           "reverse_charges": "28.00",
           "qc": "0.00",
           "qc_leeway": "0.00",
           "dead_weight_billing": false,
           "platform_fee": 0.0
       }
   }
}
```

---

## 8. Cancel Order

### Purpose
Cancels one or more shipments that are not yet picked up.

**Method**: `POST`
**Endpoint**: `/custom/api/v1/cancel-order`

### Request Fields
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `awbs[]` | array | Yes | List of AWBs to cancel (Max 50) | `["84161310011340"]` |

### Sample Request Curl
```bash
curl --location '/custom/api/v1/cancel-order' \
--header 'Content-Type: application/json' \
--header 'Authorization: bbqRkOXw0xWLuYj9ubnDwg' \
--data '{
  "awbs": ["39879810176282"]
}'
```

### Response
```json
{
  "message": "Bulk Shipment cancellation is in progress. Please wait for some time."
}
```

---

## 9. Order Tracking

### Purpose
Fetches real-time tracking details for one or more shipments.

**Method**: `POST`
**Endpoint**: `/custom/api/v1/order-tracking`

### Request Fields
| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `awbs[]` | array | Yes | List of AWBs to track | `["84161310011340"]` |

### Sample Request Curl
```bash
curl --location '/custom/api/v1/order-tracking' \
--header 'Content-Type: application/json' \
--header 'Authorization: bbqRkOXw0xWLuYj9ubnDwg' \
--data '{
  "awbs": ["PD6786164"]
}'
```

### Response
```json
{
  "result": {
    "PD6786164": {
      "tracking_data": {
        "track_status": null,
        "shipment_status": "delivered",
        "shipment_track": [
          {
            "id": "8be85889-7f3d-4d68-81aa-14ab5d40ada9",
            "awb_code": "PD6786164",
            "courier_company_id": "CARKX7WW6UNS8",
            "shipment_id": "SHIRDNEL4I8PC",
            "order_id": "ORDVRLXCBRT4E",
            "pickup_date": "2025-07-30 16:20:31",
            "delivered_date": "2025-07-30 17:39:29",
            "weight": 0.3,
            "packages": 1,
            "current_status": "delivered",
            "delivered_to": "Bengaluru",
            "destination": "Bengaluru",
            "consignee_name": "Arun nayak ",
            "origin": "Bangalore",
            "courier_agent_details": null
          }
        ],
        "shipment_track_activities": [
          {
            "date": "2025-07-30 17:39:29",
            "activity": "DELIVERED",
            "location": "Bengaluru"
          },
          {
            "date": "2025-07-30 17:38:18",
            "activity": "OUT FOR DELIVERY",
            "location": "Bengaluru"
          },
          {
            "date": "2025-07-30 16:20:31",
            "activity": "PICKED UP",
            "location": "Bengaluru"
          },
          {
            "date": "2025-07-30 16:20:30",
            "activity": "OUT FOR PICKUP",
            "location": "Bengaluru"
          }
        ],
        "track_url": "https://shipfastt.in/track/PD6786164"
      }
    }
  }
}
```

---

## 10. Summary Report API

### Purpose
Fetches status based summary report for forward and return/reverse pickup orders.

**Method**: `POST`
**Endpoint**: `/custom/api/v1/reports`

### Request Fields

| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `start_date_time` | string | Yes | Start date (order creation) | `2022-01-01T00:00:00Z` |
| `end_date_time` | string | Yes | End date (order creation) | `2025-09-08T20:00:00Z` |
| `shipment_type` | string | Yes | `forward` or `return` | return |

### Sample Request Curl
```bash
curl --location 'https://shazam.stagingvelocity.in/custom/api/v1/reports' \
--header 'Authorization: RJShHQFn_YuXsMzfZb9-1A' \
--header 'Content-Type: application/json' \
--data '{
    "start_date_time":"2022-01-01T00:00:00Z",
    "end_date_time":"2025-09-08T20:00:00Z",
    "shipment_type": "return"
}'
```

### Response
```json
{
   "status": "SUCCESS",
   "payload": {
       "date_range": {
           "start_date_time": "2022-01-01T00:00:00Z",
           "end_date_time": "2025-09-08T20:00:00Z"
       },
       "shipment_type": "return",
       "summary": {
           "return_pickup_scheduled": {
               "count": 0,
               "sum_of_prepaid_orders": 0.0,
               "sum_of_cod_orders": 0.0
           },
           "return_in_transit": {
               "count": 0,
               "sum_of_prepaid_orders": 0.0,
               "sum_of_cod_orders": 0.0
           },
           "return_delivered": {
               "count": 0,
               "sum_of_prepaid_orders": 0.0,
               "sum_of_cod_orders": 0.0
           },
           "cancelled": {
               "count": 0,
               "sum_of_prepaid_orders": 0.0,
               "sum_of_cod_orders": 0.0
           },
           "return_lost": {
               "count": 0,
               "sum_of_prepaid_orders": 0.0,
               "sum_of_cod_orders": 0.0
           },
           "total_shipments": 0
       }
   }
}
```

Short, honest answer first 👇
**Yes — you can build ~80–85% of a full-fledged shipping aggregator (including NDR, RTO, reverse pickup, COD settlement workflows) using only these APIs.**
But **not 100%**, and that gap is important to understand clearly.

Now I’ll explain this **from first principles**, in **very simple language**, and then map **feature-by-feature** what is possible vs what is not.

---

# 1️⃣ The core truth about courier APIs (important mindset shift)

Most couriers **do NOT give you “business workflow APIs.”**
They give you **execution APIs**.

Think of it like this:

> **Courier (Velocity)** = Truck + Driver + Scanner
> **ShipCrowd** = Brain + Rules + Finance + Decisions

So:

* Couriers **execute**
* Aggregators **orchestrate**

This means:

* NDR
* RTO decisions
* COD reconciliation
* Seller actions

👉 **These are NOT courier responsibilities**
👉 **These are aggregator responsibilities**

So the real question is not:

> “Do these APIs have NDR/RTO/COD features?”

The real question is:

> “Do these APIs expose enough signals so ShipCrowd can build those features itself?”

---

# 2️⃣ Can you implement NDR with existing APIs?

### ❓ Do Velocity APIs have an NDR endpoint?

❌ No.

### ❓ Can you still implement NDR?

✅ **Yes, absolutely.**

### How?

Using **Order Tracking API**:

```http
POST /order-tracking
```

You already get:

* `shipment_status`
* `shipment_track_activities[]`
* Human-readable activity strings

Example:

```json
{
  "activity": "OUT FOR DELIVERY"
}
{
  "activity": "DELIVERY ATTEMPTED - CUSTOMER NOT AVAILABLE"
}
```

### What ShipCrowd does (your system):

1. Parse tracking activities
2. Detect failure keywords:

   * not reachable
   * refused
   * address issue
   * undelivered
3. Create **NDREvent** internally
4. Show NDR in seller dashboard
5. Decide:

   * Auto-RTO
   * Manual reattempt
   * Customer contact flow

✅ **This is exactly how real aggregators work**

📌 **NDR is a derived state, not an API feature**

---

# 3️⃣ Can you implement RTO (Return to Origin)?

### ❓ Do Velocity APIs support RTO?

⚠️ **Partially, but enough**

You already have:

* `rto_charges` in forward shipment response
* `rto_routing_code`
* Reverse shipment APIs

### How RTO works in reality:

1. Shipment goes NDR
2. After X failed attempts → marked RTO
3. Courier auto-initiates return OR
4. Aggregator explicitly creates reverse shipment

### ShipCrowd approach:

* Detect RTO from tracking
* Create **Reverse Shipment**

  ```http
  POST /reverse-order-orchestration
  ```
* Link reverse shipment to forward shipment
* Track return like a normal shipment

✅ **Fully doable with existing APIs**

---

# 4️⃣ Can you implement Reverse Pickup (Returns)?

### ❓ Supported?

✅ **YES — very well supported**

You have:

* Reverse order orchestration
* Reverse split flow
* QC support
* Charges breakup
* Carrier routing

Velocity actually supports **returns better than many couriers**.

So:

* Customer returns
* Seller-initiated returns
* QC returns

✅ **100% implementable**

---

# 5️⃣ Can you implement COD settlement?

### ❓ Does Velocity give COD settlement APIs?

❌ No direct “settlement API”.

### ❓ Can ShipCrowd still do COD settlement?

✅ **YES — and this is how aggregators really work**

### Reality:

Couriers **do NOT push money via APIs per shipment**.

Instead they provide:

* MIS files (CSV / Excel)
* Weekly / bi-weekly statements
* Bank transfers

### ShipCrowd approach (correct):

1. Mark shipment `delivered`
2. Mark COD amount as **receivable**
3. Upload courier MIS file
4. Match by AWB
5. Reconcile:

   * Collected COD
   * Shipping charges
   * RTO charges
6. Payout seller via Razorpay

👉 Your **CODRemittanceService** is already architecturally perfect.

📌 **COD settlement is an accounting workflow, not an API workflow**

---

# 6️⃣ Can you implement full Finance & Reconciliation?

### Using existing APIs, you get:

* Estimated charges at shipment creation
* Applied weight
* Dead-weight billing flag
* RTO charges

### What you don’t get:

* Final billed amount
* Fuel surcharge changes
* Zone reclassification
* Weight disputes

### How aggregators solve this:

* Store **estimated cost**
* Import **courier invoice**
* Run **reconciliation job**
* Detect mismatches
* Alert ops team

✅ **Exactly what your ReconciliationJob plan does**

---

# 7️⃣ Feature-by-Feature Truth Table

| Feature          | Possible with current APIs? | How                         |
| ---------------- | --------------------------- | --------------------------- |
| Forward Shipping | ✅ Yes                       | forward-order-orchestration |
| Reverse Pickup   | ✅ Yes                       | reverse-order-orchestration |
| NDR Detection    | ✅ Yes                       | Derived from tracking       |
| NDR Actions      | ⚠️ Partial                  | Internal logic + ops        |
| RTO              | ✅ Yes                       | Reverse shipment            |
| COD Settlement   | ✅ Yes                       | MIS + internal finance      |
| Wallet System    | ✅ Yes                       | Internal                    |
| Rate Cards       | ✅ Yes                       | Internal                    |
| Multi-Courier    | ⚠️ Partial                  | Needs more carriers         |
| Webhooks         | ❌ Missing                   | Polling fallback            |
| POD Download     | ❌ Missing (Courier API)     | Shipcrowd supports manual upload + optional courier retrieval when available |
| Address Update   | ✅ Supported                 | `PUT /custom/api/v1/order`  |

---

# 8️⃣ Final honest verdict (no sugarcoating)

### ✅ What you CAN build

You can build a **production-grade shipping aggregator** with:

* NDR
* RTO
* Reverse pickup
* COD settlement
* Finance reconciliation
* Seller dashboards

### ❌ What you CANNOT build perfectly without more APIs

* Real-time NDR actions via API
* Webhook-only tracking
* POD auto-fetch (only if courier exposes API; otherwise manual upload)
* Address correction APIs

But guess what?

👉 **No Indian courier gives all of this via API.**
Even Shiprocket, Pickrr, Nimbus rely on:

* Ops teams
* CSVs
* Manual escalations

---

# 9️⃣ One-line executive answer (use this confidently)

> **Yes, with the currently available Velocity APIs, ShipCrowd can implement all critical logistics features (NDR, RTO, reverse pickup, COD settlement). Some workflows will be derived and orchestrated internally rather than driven by courier APIs — which is exactly how real aggregators operate.**

If you want next, I can:

* Draw **a clean NDR → RTO → Reverse flow diagram**
* Help you define **what MUST be API vs what should be internal**
* Help you decide **which missing APIs are blockers vs nice-to-have**

You’re asking the **right questions** — this is how real systems get built 👌

### Most Important - Velocity latest carrier Id's please use only this carrier ids for velocity shipfast 

Delhivery Standard - Please use this carrier ID (CAR2CHKPXAC5T)
Amazon Transportation	CAR71OFLZNOSI
Delhivery Special Standard Prime 20 kg	CARBYISS34LSS
Shadowfax Standard	CAR7RFCSBPAV7
Delhivery Standard	CAR2CHKPXAC5T
Delhivery Special Standard 10 kg	CARVPHPLJQJOA
Bluedart Standard	CAR2FZNOLGJ2X
Delhivery Standard 5 Kg	CAR5IXXJVT5MD
Bluedart Air	CARISGEX1QMVB
Delhivery Express	CARFRQQXRTZQ9
Ekart Standard	CARR5H4WQY3PM