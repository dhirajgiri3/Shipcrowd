# Ekart API Documentation (v3.8.8)

## Overview

Welcome to the Ekart API Documentation. This comprehensive guide provides detailed information about Ekart Logistics' API suite for seamless integration with your logistics and shipping operations.

**API Version:** 3.8.8  
**Base URL:** https://app.elite.ekartlogistics.in

---

## Table of Contents

1. [Authentication](#authentication)
2. [Shipments](#shipments)
3. [Tracking](#tracking)
4. [Label Management](#label-management)
5. [Shipping Rates](#shipping-rates)
6. [Manifest](#manifest)
7. [Address Management](#address-management)
8. [NDR (Non-Delivery Report)](#ndr-non-delivery-report)
9. [Serviceability](#serviceability)
10. [Webhooks](#webhooks)
11. [Advanced Serviceability](#advanced-serviceability)

---

## Authentication

### Security Scheme

| Parameter | Value |
|-----------|-------|
| **Security Scheme Type** | HTTP |
| **HTTP Authorization Scheme** | bearer |

### Get Access Token

Get an authentication + authorization access_token

Use this api call to fetch a access_token and token_type which is valid for expires_in seconds (generally 24 hours). For all our protected api calls, you need to pass this access_token as an Authorization header.

For eg: if access_token value is abc123, and token_type is Bearer, the header will be: `Authorization: Bearer abc123`

> **Notes:**
> - This API works with both v1 and v2 APIs.
> - This is a caching API and will return the same token for a period of 24h. The expires_in will keep decreasing appropriately with subsequent fetches.

#### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| client_id | Yes | string | Client ID provided by Ekart during onboarding |

#### Request Body

**Content Type:** application/json

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| username | Yes | string | Username provided by Ekart |
| password | Yes | string | Password for authentication |

#### Request

**Method:** POST  
**Endpoint:** `/integrations/v2/auth/token/{client_id}`  
**Full URL:** `https://app.elite.ekartlogistics.in/integrations/v2/auth/token/{client_id}`

```json
{
  "username": "string",
  "password": "string"
}
```

#### Response

**Status:** 200 OK

An access_token valid for the number of seconds specified in expires_in. To be passed as a header `Authorization: ${token_type} ${access_token}`

```json
{
  "access_token": "string",
  "scope": "core:all",
  "expires_in": 0,
  "token_type": "Bearer"
}
```

---

## Shipments

### Create/Cancel/Manage Shipments

### Create New Shipment

#### Key Points When Using the API

##### Forward Shipments
**From seller to customer**

- `payment_mode` should be COD or Prepaid
- `return_reason` need not be sent
- `drop_location` is the customer address
- `drop_location.name` is generally the same value as consignee_name
  - Exception can be when a different person is receiving the shipment at the drop_location than the consignee
- `pickup_location` is the seller warehouse/pickup address
- `return_location` is the RTO (Return to Origin) address if the shipment is cancelled/not delivered. Generally its the same as the pickup_location
- `preferred_dispatch_date` can be sent to schedule pickup of the shipment for a future date.

**delayed_dispatch (Only for non large shipments)**

- If set to true, preferred_dispatch_date can be set using the Update Dispatch Date API post shipment creation. preferred_dispatch_date must not be passed along with this flag.
- If delayed_dispatch is false or not sent, the shipment will be dispatched on preferred_dispatch_date.
- Contact your account manager to enable delayed dispatch on your account.

##### Reverse Shipments
**From customer to seller**

- `payment_mode` should be Pickup
- `return_reason` needs a String reason for the reverse pickup, eg: Wrong product sent
- Following is just like the Forward shipment values.
  - Note this is semantically opposite to what is happening on the ground; the drop_location is the customer address and the pickup_location is the seller address.
- `drop_location` is the customer address
- `drop_location.name` is generally the same value as consignee_name
  - Exception can be when a different person is receiving the shipment at the drop_location than the consignee
- `pickup_location` is the seller warehouse/pickup address
- `return_location` can be ignored

#### Autofill Pickup/Return Location

The pickup_location and return_location are seller warehouses/addresses registered with us beforehand or using the Address apis. We can autofill these values in the api call accordingly.

- If you have just one pickup_location/return_location registered with us, you can ignore these fields completely in the above api calls.
- If you have multiple pickup_location/return_location registered with us, you can just send us the alias of the address in the api call.

```json
{
  "pickup_location": {
    "name": "Pickup_location_alias" // as sent in Address
  },
  "return_location": {
    "name": "Return_location_alias" // as sent in Address
  }
}
```

- You can register a new pickup/return location with us by contacting your account manager. We do plan to expose an api for this soon.
- If the return_location field is not sent completely, we automatically assume its the same as the pickup_location.

> **Note:** The above DOES NOT apply to drop_location since it is different every time.

#### Packaging Template

The packaging template is the way to define the packaging dimensions. By providing templateName you can instruct system to pick pre-defined package dimensions for the shipment manifestation.

**Sending package information with API request**

```json
{
  "templateName": "Template #1"
}
```

You can find template name in Ekart dashboard within Packaging feature

- If you send templateName with request, system will pick the dimensions from pre-defined package template. If template is not found, request gets rejected.
- Only one of templateName or length, width, height will be accepted.

> **Note:** Do not send templateName and length, width, height both, there is a higher chance of request rejection.

#### Multi-package Forward Shipments (MPS)

- `mps` should be true
- `items` array is required
- `packages` array is required
- Send items and packages in the standard format as defined in the shipment schema. length, height, width and weight at the top level of shipment schema will be ignored in this case.

#### Open Box Delivery Shipments (OBD)

- `obd_shipment` should be true
- Contact your account manager to enable Open Box Delivery for your account.

#### Reverse Shipments with QC (Quality Check)

- `qc_shipment` should be true
- `product_name` is required
- `product_sku` is optional
- `product_color` is optional
- `product_size` is optional
- `product_desc` is optional
- `brand_name` is optional
- `product_category` is optional
- `ean_barcode` is optional
- `serial_number` is optional
- `imei_number` is optional
- `product_images` is optional

#### Response and Tracking

We return the following response on successful shipment creation:

```json
{
  "status": true,
  "remark": "Successfully created shipment",
  "tracking_id": "500999A3408005", // Ekart tracking id
  "vendor": "XYZ", // vendor partner chosen
  "barcodes": { // plain text data for the scannable barcodes which are printed on the label
    "wbn": "vendor_waybill_plain_text", // vendor waybill
    "order": "order_number", // order number passed by seller (may be prefixed to keep unique for barcode)
    "cod": "vendor_cod_waybill_plain_text" // some vendors have an additional waybill/barcode for COD shipments
  }
}
```

The Ekart tracking id can be used in the tracking api to track the shipment. A public tracking link can also be created in the following format:

**Tracking URL Format:** `https://app.elite.ekartlogistics.in/track/${Ekart tracking id}`

**Example:** https://app.elite.ekartlogistics.in/track/500999A3408005

#### Request Parameters

**Authorization:** BearerAuth  
**Content Type:** application/json

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| seller_name | Yes | string | Seller name |
| seller_address | Yes | string | Billing address for seller |
| seller_gst_tin | Yes | string | GST tin number for seller |
| seller_gst_amount | No | number | Seller GST amount |
| consignee_gst_amount | Yes | number | Consignee GST amount |
| integrated_gst_amount | No | number | Integrated GST amount |
| ewbn | No | string | E-Way Bill Number (12 digits) |
| order_number | Yes | string | Order number |
| invoice_number | Yes | string | Invoice number |
| invoice_date | Yes | string | Invoice date |
| document_number | No | string | Document number |
| document_date | No | string | Document date |
| consignee_gst_tin | No | string | Consignee GST TIN |
| consignee_name | Yes | string | Consignee name |
| consignee_alternate_phone | Yes | string | Alternate phone number of consignee (>= 10 characters) |
| products_desc | Yes | string | Products description |
| payment_mode | Yes | string | Payment mode: "COD", "Prepaid", or "Pickup" (Use Pickup for reverse shipments) |
| category_of_goods | Yes | string | Category of goods |
| hsn_code | No | string | HSN code |
| total_amount | Yes | number | Sum of taxable_amount and tax_value (>= 1) |
| tax_value | Yes | number | Total tax levied on the product (GST) (>= 0) |
| taxable_amount | Yes | number | Value of goods after removing tax (>= 1) |
| commodity_value | Yes | string | Same as taxable_amount in String format |
| cod_amount | Yes | number | Amount to be collected from customer [0..49999] |
| quantity | Yes | integer | Number of products in package (>= 1) |
| templateName | No | string | Template name, chosen at the time of creation of template |
| weight | Yes | integer | weight of package in grams (>= 1) |
| length | Yes | integer | length of package in centimeters (>= 1) |
| height | Yes | integer | height of package in centimeters (>= 1) |
| width | Yes | integer | width of package in centimeters (>= 1) |
| return_reason | Yes | string | Proper reason if payment_mode is Pickup. Not required for Forward Shipments. |
| drop_location | Yes | object | Drop location details (locationV1) |
| pickup_location | Yes | object | Pickup location details (locationV1) |
| return_location | Yes | object | Return location details (locationV1) |
| qc_details | No | object | Required for quality check of reverse shipment (qcDetails) |
| preferred_dispatch_date | No | string | Preferred Dispatch Date for shipment (date format) |
| delayed_dispatch | No | boolean | Opt in for adding dispatch date post shipment creation (default: false) |
| obd_shipment | No | boolean | Open Box Delivery Shipment Flag (default: false) |
| mps | No | boolean | Multi-package Forward Shipment Flag (default: false) |
| items | No | array | Array of package items (Mandatory for MPS) |
| what3words_address | No | string | A combination of 3 words to uniquely identify user location |

#### Request

**Method:** PUT  
**Endpoint:** `/api/v1/package/create`

```json
{
  "seller_name": "string",
  "seller_address": "string",
  "seller_gst_tin": "string",
  "seller_gst_amount": 0,
  "consignee_gst_amount": 0,
  "integrated_gst_amount": 0,
  "ewbn": "string",
  "order_number": "string",
  "invoice_number": "string",
  "invoice_date": "string",
  "document_number": "string",
  "document_date": "string",
  "consignee_gst_tin": "string",
  "consignee_name": "string",
  "consignee_alternate_phone": "9876543210",
  "products_desc": "string",
  "payment_mode": "COD",
  "category_of_goods": "string",
  "hsn_code": "string",
  "total_amount": 1,
  "tax_value": 0,
  "taxable_amount": 1,
  "commodity_value": "string",
  "cod_amount": 49999,
  "quantity": 1,
  "templateName": "string",
  "weight": 1,
  "length": 1,
  "height": 1,
  "width": 1,
  "return_reason": "string",
  "drop_location": {
    "location_type": "Office",
    "address": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "name": "string",
    "phone": 1000000000,
    "pin": 0
  },
  "pickup_location": {
    "location_type": "Office",
    "address": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "name": "string",
    "phone": 1000000000,
    "pin": 0
  },
  "return_location": {
    "location_type": "Office",
    "address": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "name": "string",
    "phone": 1000000000,
    "pin": 0
  },
  "qc_details": {
    "qc_shipment": true,
    "product_name": "string",
    "product_desc": "string",
    "product_sku": "string",
    "product_color": "string",
    "product_size": "string",
    "brand_name": "string",
    "product_category": "string",
    "ean_barcode": "string",
    "serial_number": "string",
    "imei_number": "string",
    "product_images": []
  },
  "preferred_dispatch_date": "2019-08-24",
  "delayed_dispatch": false,
  "obd_shipment": false,
  "mps": false,
  "items": [{}],
  "what3words_address": "string"
}
```

#### Response

**Status:** 200 OK

```json
{
  "status": true,
  "remark": "string",
  "tracking_id": "string",
  "vendor": "string",
  "barcodes": {
    "wbn": "string",
    "order": "string",
    "cod": "string"
  }
}
```

---

### Cancel a Shipment

**Authorization:** BearerAuth

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| tracking_id | Yes | string | The id of the shipment to cancel |

#### Request

**Method:** DELETE  
**Endpoint:** `/api/v1/package/cancel`

#### Response

**Status:** 200 OK

```json
{
  "data": [{}]
}
```

---

### Set Preferred Dispatch Date for Delayed Dispatch Shipments

Use this API when you created a shipment with delayed_dispatch set to true and want to set or update the preferred dispatch date later.

- Provide the shipment ids (tracking ids / waybills)
- Provide dispatchDate in YYYY-MM-DD format

**Authorization:** BearerAuth  
**Content Type:** application/json

#### Request Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| ids | Yes | array | Array of strings [1..100] items unique |
| dispatchDate | Yes | string | Preferred dispatch date (YYYY-MM-DD) |

#### Request

**Method:** POST  
**Endpoint:** `/data/shipment/dispatch-date`

```json
{
  "ids": [
    "LUA000000001"
  ],
  "dispatchDate": "2026-01-30"
}
```

#### Response

**Status:** 200 OK

```json
{
  "data": [{}]
}
```

---

## Tracking

### Track Shipment

This is an open api for tracking your shipment via the tracking id.

#### Non Delivery Statuses

Certain statuses can have an associated ndrStatus with possible ndrActions. These can be used with the aforementioned NDR api. Other statuses will not have these fields in the response.

#### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| id | Yes | string | The id (shipment id) to track |

#### Request

**Method:** GET  
**Endpoint:** `/api/v1/track/{id}`

#### Response

**Status:** 200 OK

```json
{
  "_id": "string",
  "track": {
    "status": "Order Placed",
    "ctime": 0,
    "pickupTime": 0,
    "desc": "string",
    "location": "string",
    "ndrStatus": "Unknown Exception",
    "attempts": 0,
    "ndrActions": [],
    "details": []
  },
  "edd": 0,
  "order_number": "string"
}
```

---

### Ekart Tracking API

An API to get raw Ekart track response for Non-Large or Large shipment.

**Authorization:** BearerAuth

#### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| wbn | Yes | string | The WBN of the shipment to track |

#### Request

**Method:** GET  
**Endpoint:** `/data/v1/elite/track/{wbn}`

#### Response

**Status:** 200 OK

**Example: Non-Large shipment response**

```json
{
  "CLTC0000000001": {
    "shipment_type": "COD",
    "cod_amount": "1999.0",
    "shipment_id": "CLTC0000000001",
    "shipment_value": "1999.0",
    "order_id": "5180823923081454",
    "external_tracking_id": "CLTC0000000001",
    "delivery_type": "small",
    "weight": "0.0",
    "delivered": true,
    "merchant_name": "ABC",
    "history": [],
    "receiver": {},
    "current_hub": {},
    "assigned_hub": {},
    "sender": {},
    "customer": {},
    "items": [],
    "vendor": "E-Kart Logistics",
    "mh_inscanned": true,
    "rto_detail": null,
    "slotted_delivery": true,
    "expected_delivery_slot": {},
    "expected_delivery_date": "2018-08-30 23:59:59",
    "rto": false,
    "shipment_notes": [],
    "shipment_tickets": null
  }
}
```

---

## Label Management

### Download Packing Label

**Authorization:** BearerAuth

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| json_only | No | boolean | To fetch only the json data. If the value is passed false pdf will be downloaded. Enum: true, false |

#### Request Body

**Content Type:** application/json

A string list of waybill numbers [Maximum 100 at a time]

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| ids | Yes | array | Array of strings [1..100] items unique |

#### Request

**Method:** POST  
**Endpoint:** `/api/v1/package/label`

```json
{
  "ids": [
    "500999AT876841",
    "500999AT876842",
    "500999AT876841"
  ]
}
```

#### Response

**Status:** 200 OK - A pdf of the requested labels

**Default Error Response:**

```json
{
  "statusCode": 0,
  "code": "string",
  "message": "string",
  "description": "string",
  "severity": "string"
}
```

---

## Shipping Rates

### Get Estimated Shipping Rates for a Sample Shipment Request

**Authorization:** BearerAuth  
**Content Type:** application/json

#### Request Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| pickupPincode | Yes | integer | Pickup pincode |
| dropPincode | Yes | integer | Drop pincode |
| invoiceAmount | No | number | Invoice amount (double) |
| weight | Yes | integer | Weight in grams |
| length | Yes | integer | Length in centimeters |
| height | Yes | integer | Height in centimeters |
| width | Yes | integer | Width in centimeters |
| serviceType | Yes | string | Service type: "SURFACE" or "EXPRESS" |
| codAmount | No | number | COD amount (double) |
| packages | No | array | Array of package objects |

#### Request

**Method:** POST  
**Endpoint:** `/data/pricing/estimate`

```json
{
  "pickupPincode": 0,
  "dropPincode": 0,
  "invoiceAmount": 0,
  "weight": 0,
  "length": 0,
  "height": 0,
  "width": 0,
  "serviceType": "SURFACE",
  "codAmount": 0,
  "packages": [{}]
}
```

#### Response

**Status:** 200 OK - Fetched Estimate

```json
{
  "type": "WEIGHT_BASED",
  "zone": "string",
  "volumetricWeight": "string",
  "billingWeight": "string",
  "shippingCharge": "string",
  "rtoCharge": "string",
  "fuelSurcharge": "string",
  "codCharge": "string",
  "qcCharge": "string",
  "taxes": "string",
  "total": "string",
  "rid": "string",
  "rSnapshotId": "string"
}
```

---

## Manifest

### Download Manifest

**Authorization:** BearerAuth  
**Content Type:** application/json

#### Request Body

A string list of waybill numbers [Maximum 100 at a time]

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| ids | Yes | array | Array of strings [1..100] items unique |

#### Request

**Method:** POST  
**Endpoint:** `/data/v2/generate/manifest`

```json
{
  "ids": [
    "500999AT876841",
    "500999AT876842",
    "500999AT876841"
  ]
}
```

#### Response

**Status:** 200 OK - A pdf of the requested manifests

```json
{
  "ctime": 0,
  "manifestNumber": 0,
  "manifestDownloadUrl": "string"
}
```

---

## Address Management

### Add an Address

This API registers the address for both Pickup and RTO Warehouses

**Authorization:** BearerAuth  
**Content Type:** application/json

#### Request Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| alias | Yes | string | Address alias |
| phone | Yes | integer | Contact of seller or consignee (int64) [1000000000..9999999999] |
| address_line1 | Yes | string | Address line 1 |
| address_line2 | No | string | Address line 2 |
| pincode | Yes | integer | Pincode (int32) |
| city | No | string | City |
| state | No | string | State |
| country | No | string | Country (Allowed values: "India", "IN") |
| geo | No | object | Geo coordinates of location if available |

#### Request

**Method:** POST  
**Endpoint:** `/api/v2/address`

```json
{
  "alias": "string",
  "phone": 1000000000,
  "address_line1": "string",
  "address_line2": "string",
  "pincode": 0,
  "city": "string",
  "state": "string",
  "country": "string",
  "geo": {
    "lat": 0,
    "lon": 0
  }
}
```

#### Response

**Status:** 200 OK - Response object

```json
{
  "status": true,
  "alias": "string",
  "remark": "string"
}
```

---

### Get All Addresses

Returns a list of addresses saved against a user

**Authorization:** BearerAuth

#### Request

**Method:** GET  
**Endpoint:** `/api/v2/addresses`

#### Response

**Status:** 200 OK - Response Object

```json
[
  {
    "alias": "string",
    "phone": 1000000000,
    "address_line1": "string",
    "address_line2": "string",
    "pincode": 0,
    "city": "string",
    "state": "string",
    "country": "string",
    "geo": {}
  }
]
```

---

## NDR (Non-Delivery Report)

### Take NDR Actions for a Particular Shipment

**Authorization:** BearerAuth  
**Content Type:** application/json

#### Request Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| action | Yes | string | NDR action type: "Re-Attempt" or "RTO" |
| wbn | Yes | string | Waybill number (Ekart tracking id) |
| date | No | integer | Re-Attempt date in milliseconds since Unix Epoch (Required if action is Re-Attempt, should be within seven days of the current day, excluding today) |
| phone | No | string | Updated 10-digit phone number |
| address | No | string | Updated address |
| instructions | No | string | Further instructions for handling ndr |
| links | No | array | Array containing links of files uploaded |

#### Request

**Method:** POST  
**Endpoint:** `/api/v2/package/ndr`

```json
{
  "action": "Re-Attempt",
  "wbn": "string",
  "date": 0,
  "phone": "string",
  "address": "string",
  "instructions": "string",
  "links": [
    "string"
  ]
}
```

#### Response

**Status:** 200 OK - Response Object

```json
{
  "status": true,
  "remark": "string",
  "tracking_id": "string"
}
```

---

## Serviceability

### Check Serviceability for a Given Pincode

Returns data about the pincode whose serviceability needs to be checked.

Gives information about Cash on Delivery service available at that pincode and about pickup/drop for both forward (seller to customer) and reverse flows (customer to seller).

**Authorization:** BearerAuth

#### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| pincode | Yes | integer | The pincode whose serviceability needs to be checked (int32) |

#### Request

**Method:** GET  
**Endpoint:** `/api/v2/serviceability/{pincode}`

#### Response

**Status:** 200 OK - Response object with status field indicating if pincode is serviceable

```json
{
  "status": true,
  "pincode": 560008,
  "remark": "string",
  "details": {
    "cod": true,
    "max_cod_amount": 25000,
    "forward_pickup": true,
    "forward_drop": true,
    "reverse_pickup": true,
    "reverse_drop": true,
    "city": "string",
    "state": "KA"
  }
}
```

---

## Webhooks

### Get All Webhooks

**Authorization:** BearerAuth

#### Request

**Method:** GET  
**Endpoint:** `/api/v2/webhook`

#### Response

**Status:** 200 OK - List of webhooks

```json
[
  {
    "url": "http://example.com",
    "secret": "string",
    "topics": [],
    "active": true,
    "id": "string"
  }
]
```

---

### Add a Webhook

You can add the webhook with us to get the tracking, and order shipping/re-shipping updates.

#### List of Webhooks:

1. **track_updated** - webhook to get the track updates of the shipment.
2. **shipment_created** - webhook to get the details of the shipment.
3. **shipment_recreated** - webhook to get the details of the re-shipped shipment.

#### Webhook Response Examples

**When requested track_updated webhook - Response:**

```json
{
  "ctime": 1657523187604,
  "status": "Delivered",
  "location": "",
  "desc": "Delivered Successfully",
  "attempts": "0",
  "pickupTime": 1655980197000,
  "wbn": "318019134877",
  "id": "501346BN6838925",
  "orderNumber": "41839", 
  "edd": 1657523187609
}
```

**When requested shipment_created webhook - Response:**

```json
{
  "id": "509271DS0153341", //Ekart tracking id
  "wbn": "3496549343", // vendor waybill
  "vendor": "EKART", //courier partner name
  "orderNumber": "RAZNE009", // order number passed by seller (may be prefixed to keep unique for barcode)
  "channelId": "66111e20da60dcb528a11cad" // Ekart order id 
}
```

**When requested shipment_recreated webhook - Response:**

```json
{
  "id": "832504GV3486674", //Ekart tracking id
  "wbn": "3496549343", // vendor waybill
  "vendor": "EKART", //courier partner name
  "orderNumber": "RAZNE009", // order number passed by seller (may be prefixed to keep unique for barcode)
  "channelId": "66111e20da60dcb528a11cad" // Ekart order id 
}
```

**Authorization:** BearerAuth  
**Content Type:** application/json

#### Request Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| url | Yes | string | Url to post webhook to (uri format) |
| secret | Yes | string | Webhook secret to hash the webhook post body with for calculating h-mac [6..30] characters |
| topics | Yes | array | Webhook topics to subscribe to (non-empty). Items: "track_updated", "shipment_created", "shipment_recreated" |
| active | No | boolean | Whether webhook is active or not (default: true) |

#### Request

**Method:** POST  
**Endpoint:** `/api/v2/webhook`  
**Full URL:** `https://app.elite.ekartlogistics.in/api/v2/webhook`

```json
{
  "url": "http://example.com",
  "secret": "string",
  "topics": [
    "track_updated"
  ],
  "active": true
}
```

#### Response

**Status:** 200 OK - registered webhook

```json
{
  "url": "http://example.com",
  "secret": "string",
  "topics": [
    "track_updated"
  ],
  "active": true,
  "id": "string"
}
```

---

### Update a Webhook

**Authorization:** BearerAuth

#### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| webhook_id | Yes | string | registered webhook id received in response when adding webhook |

#### Request Body

**Content Type:** application/json

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| url | No | string | Url to post webhook to (uri format) |
| secret | No | string | Webhook secret to hash the webhook post body with for calculating h-mac [6..30] characters |
| topics | No | array | Webhook topics to subscribe to (non-empty). Items: "track_updated", "shipment_created", "shipment_recreated" |
| active | No | boolean | Whether webhook is active or not (default: true) |

#### Request

**Method:** PUT  
**Endpoint:** `/api/v2/webhook/{webhook_id}`  
**Full URL:** `https://app.elite.ekartlogistics.in/api/v2/webhook/{webhook_id}`

```json
{
  "url": "http://example.com",
  "secret": "string",
  "topics": [
    "track_updated"
  ],
  "active": true
}
```

#### Response

**Status:** 200 OK - Edited webhook

```json
{
  "url": "http://example.com",
  "secret": "string",
  "topics": [
    "track_updated"
  ],
  "active": true,
  "id": "string"
}
```

---

## Advanced Serviceability

### Serviceability V3

#### Check Serviceability for Given Pickup and Drop Pincode

Returns data about the available courier partners for the given pickup and drop pincodes.

**Authorization:** BearerAuth  
**Content Type:** application/json

#### Request Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| pickupPincode | Yes | string | Valid Pickup Pincode |
| dropPincode | Yes | string | Valid Drop Pincode |
| length | Yes | string | Length of package in centimeters (>= 1) |
| height | Yes | string | Height of package in centimeters (>= 1) |
| width | Yes | string | Width of package in centimeters (>= 1) |
| weight | Yes | string | weight of package in grams (>= 1) |
| paymentType | Yes | string | Payment type for the shipment: "COD" or "Prepaid" |
| serviceType | No | string | Service type for the shipment: "SURFACE" or "EXPRESS" |
| codAmount | No | string | Amount to be collected from customer [0..49999] (Mandatory for paymentType COD) |
| invoiceAmount | Yes | string | Total invoice amount of the shipment |

#### Request

**Method:** POST  
**Endpoint:** `/data/v3/serviceability`  
**Full URL:** `https://app.elite.ekartlogistics.in/data/v3/serviceability`

```json
{
  "pickupPincode": "string",
  "dropPincode": "string",
  "length": "string",
  "height": "string",
  "width": "string",
  "weight": "string",
  "paymentType": "COD",
  "serviceType": "SURFACE",
  "codAmount": "string",
  "invoiceAmount": "string"
}
```

#### Response

**Status:** 200 OK - Response list with the available courier partners

```json
[
  {
    "tat": {},
    "courierGroup": "string",
    "forwardDeliveredCharges": {},
    "rtoDeliveredCharges": {},
    "reverseDeliveredCharges": {}
  }
]
```

---

### Get Bulk Serviceability for Given Serviceability Type

Returns bulk serviceability data for Ekart pincodes for the given serviceability type.

**Authorization:** BearerAuth

#### Path Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| type | Yes | string | Serviceability type to fetch: "NON_LARGE" or "LARGE" |

#### Query Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| format | No | string | Data format to fetch serviceability: "JSON" or "EXCEL" (if not passed then JSON data will be returned by default) |

#### Request

**Method:** GET  
**Endpoint:** `/data/serviceability/bulk/{type}`  
**Full URL:** `https://app.elite.ekartlogistics.in/data/serviceability/bulk/{type}`

#### Response

**Status:** 200 OK - Bulk serviceability response

```json
{
  "serviceability": [
    {
      "pincode": 560008,
      "fm": true,
      "lmCod": true,
      "lmPrepaid": true,
      "rvp": true
    }
  ]
}
```

---

## Additional Information

### OpenAPI Specification

You can download the complete OpenAPI specification for this API.

### API Version

**Current Version:** 3.8.8

### Base URLs

**Production:** `https://app.elite.ekartlogistics.in`

### Support

For API support and queries, please contact your Ekart account manager or reach out to Ekart's technical support team.

---

## Summary

This documentation covers all the major endpoints and functionality of the Ekart API, including:

- **Authentication** - Secure token-based authentication
- **Shipment Management** - Create, cancel, and manage forward and reverse shipments
- **Tracking** - Real-time shipment tracking capabilities
- **Label Management** - Download shipping labels
- **Rate Calculation** - Get shipping rate estimates
- **Manifest Generation** - Generate shipping manifests
- **Address Management** - Manage pickup and delivery addresses
- **NDR Handling** - Manage non-delivery reports
- **Serviceability Checks** - Verify pincode serviceability
- **Webhooks** - Real-time event notifications
- **Advanced Features** - Multi-package shipments, OBD, QC, and more

For the most up-to-date information and additional details, please refer to the official Ekart API documentation or contact your account manager.