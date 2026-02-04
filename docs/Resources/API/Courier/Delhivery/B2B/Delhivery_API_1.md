# Delhivery B2B API Documentation

## Overview

This section provides an overview of Delhivery B2B API, enabling seamless integration for business-to-business logistics solutions.

Welcome to Delhivery B2B Transportation API Documentation!

Our API suite is designed to offer businesses a robust, reliable, and efficient logistics solution. Our APIs facilitate seamless integration with your enterprise systems, allowing you to manage your end-to-end transportation needs directly through our platform. Delhivery is committed to delivering high-quality services, and our B2B APIs play a vital role in fulfilling that commitment.

### Delhivery Transportation Process Overview

Our logistics process is divided into three stages: First-mile pickup, Mid-Mile connectivity, and last-mile delivery, all managed by Delhivery.

- **First-Mile Pickup:** This initial stage involves the collection of shipments directly from the client's warehouse or designated pickup location. Delhivery ensures timely and efficient pickups to initiate the shipping process smoothly.
- **Mid-Mile Connectivity:** During this phase, shipments are transported through our extensive network to reach distribution centers or hubs. This allows for efficient sorting and further consolidation of packages, optimizing transportation routes and reducing costs.
- **Last-Mile Delivery:** The final stage focuses on delivering the shipments from the distribution center to the consignee. Delhivery's robust last-mile delivery network guarantees that goods reach their final destination promptly and securely

### Who Can Use The APIs?

Our APIs are tailored for businesses engaged in large-scale B2B logistics that require efficient and automated management of high-volume shipments. They are particularly beneficial for manufacturers, distributors, and e-commerce platforms that rely on dependable transportation services to move goods across various regions.

### Why Use Delhivery B2B APIs?

- **Interoperability:** Delhivery APIs enable different software systems to communicate and share data seamlessly, regardless of their underlying technology, ensuring smooth data exchange and system integration
- **Efficiency:** Our APIs streamline data exchange and automate processes, reducing manual work and improving operational efficiency.
- **Scalability:** Our APIs are designed to handle increasing loads and demands, allowing systems to grow without requiring major changes to the infrastructure.
- **Flexiblity:** Delhivery APIs allow easy modifications and enhancements to existing systems, making it simple to adapt to the changing business requirements.
- **Cost-Effectiveness:** By leveraging Delhivery's APIs, businesses can reduce development costs through the reuse of existing services, minimizing the need for extensive custom solutions.
- **Security:** Delhivery's APIs are built with robust authentication and authorization protocols, ensuring secure access to sensitive data and safeguarding your logistics operations
- **End-to-End Solutions:** From first-mile pickup to mid-mile connectivity, and last-mile delivery, Delhivery's comprehensive API suite covers the entire transportation journey, providing a complete logistics solution for your business.

### What to Expect in This Document?

This documentation serves as a comprehensive guide for integrating with Delhivery B2B APIs. It provides an overview of the key APIs available, outlines the integration steps necessary to connect your systems with Delhivery through API, and explains essential terminology related to our logistics services.

- **Terminology:** Clarification of important terms related to our B2B transportation services to enhance understanding and facilitate effective communication between your team and Delhivery.
- **Integration Steps:** An overview of the key steps involved in the seamless integration of Delhivery B2B APIs into your existing systems, ensuring a smooth setup process.
- **Key APIs:** A detailed overview of the available APIs, including their functionalities, endpoints, and practical usage examples. These APIs facilitate various logistics operations, from shipment creation to tracking to delivery.

---

## Common Used Terminologies

This section explains commonly used terminologies to help you navigate Delhivery B2B API documentation with ease.

This section provides a glossary of key terms and abbreviations frequently encountered in Delhivery's B2B Transportation API documentation. To ensure clear communication and understanding when integrating with Delhivery's system, below is a list of commonly used terms in API references, along with their descriptions.

| Terminology | Description |
|-------------|-------------|
| **LR** | LR (Lorry Receipt) is a unique identifier used to track and manage B2B shipments throughout the logistics process. |
| **Waybill** | Waybill number refers to the tracking number which is unique for each physical box. |
| **Master waybill** | In the B2B order, one waybill is considered a master waybill, and the remaining are considered as child waybills. |
| **E-Waybiill** | An E-waybill is an electronic document required in India for the movement of goods under GST, containing shipment details for tax compliance. this is required for the shipments having invoice value >50k. |
| **Invoice** | An invoice is a document issued by a seller to the buyer that indicates the quantities and costs of the products or services provided by the seller. An invoice specifies what a buyer must pay the seller according to the sellers payment terms. |
| **Pickup location** | Pickup location is the client's warehouse location from where the shipments will be picked up by the Delhivery FE |
| **API token** | API token is the authentication token to authenticate the API requests. For B2B this is a Bearer token which has an expiry of 24 hours |
| **LR copy** | LR copy is a document issued by a transporter to acknowledge receipt of goods for transportation. This contains details like the goods description, quantity, and weight.<br>The LR serves as proof of receipt and allows the consignor to track the goods movement. |

---

## Package Lifecycle

This section outlines the package lifecycle, detailing each stage of a shipment's journey within Delhivery's logistics network.

In transportation, the package lifecycle refers to the series of stages, a shipment goes through from the moment it is created to successful delivery or return. Each stage in this lifecycle is crucial to ensure timely, accurate, and secure handling of the shipments.

Once a package is created in the Delhivery system (either via the Manifest API, or Delhivery ONE Panel), it follows a package cycle to reach its end destination. The package lifecycle helps businesses monitor shipments in real-time and provides transparency into each phase of the logistics process.

### A B2B Package lifecycle consists of two distinct journey types:

#### Forward Journey

The forward journey begins when a shipment is picked up from the registered client's warehouse and concludes when it is successfully delivered to the end customer. This journey covers multiple phases, including pickup, transit, and final delivery. Throughout this journey, Delhivery's tracking mechanisms ensure that each stage is accurately recorded and communicated, providing real-time updates on the package's status.

#### Return Journey

In cases where a shipment cannot be delivered to the end customer, due to reasons such as incorrect address, customer unavailability, product refusal, etc, the package enters the return journey. During this process, the shipment is rerouted back to its point of origin, typically the client's warehouse or a designated return center. The return journey is just as critical as the forward journey, with visibility at each stage to ensure the safe and timely return of goods.

### Key Stages in a B2B Package Lifecycle:

- **Package Creation:** The journey begins when the shipment is created in Delhivery's system via API or the Delhivery ONE Panel.
- **First-Mile Pickup:** Delhivery's field executive collects the package from the client's warehouse.
- **Mid-Mile Transit:** The package moves through the Delhivery network, from hub to hub, as it travels towards the destination city.
- **Last-Mile Delivery:** The final stage, where the shipment is delivered to the consignee.
- **Return Process (if applicable):** In case of a failed delivery, the package enters the return journey, following similar transit phases back to the origin
- **Lost:** In case the shipment is lost in transit

### Payment Modes for B2B Orders:

For Delhivery's B2B shipments, two primary payment modes are supported:

- **Prepaid:**  where the consignee has already paid the amount at the time of placing the order.
- **COD:**  refers to (Cash on Delivery), where the consignee pays for the shipment upon delivery.

Throughout the package lifecycle, businesses benefit from full visibility into each stage, allowing them to track and manage their shipments effectively. Whether it's ensuring a successful forward journey or efficiently managing returns, Delhivery's comprehensive package lifecycle management ensures that each shipment is handled with the utmost care and precision.

---

## Steps Of Integration

This section guides you through the key steps for integrating with Delhivery B2B API for seamless logistics operations.

### 1. Authentication

Use the Login API to generate a Bearer token that will be used to authenticate all subsequent API requests. Make sure to regenerate the token before it expires. The expiry of the token is 24 hours.

### 2. Warehouse Setup

Register your warehouse or pickup location using the Warehouse Creation API. For any updates, use the Warehouse Updation API.

### 3. Serviceability and TAT

Before creating shipments, check the serviceability of the pincode, using the Pincode Serviceability API. Use TAT API to get the estimated TAT between the OD pincode pair

### 4. Shipment Creation and Status of Creation

Create the shipments using the Shipment Creation API. You will receive a JOB ID in the response, which will be used to track the shipment's status. Retrieve the LR and AWB details using the Shipment Creation Status API

### 5. Shipment Tracking

Track the current status of the shipment using the LR Track API.

### 6. Modifying or Cancelling Shipments

If needed, update shipment details using the Edit LR API. and use the Edit LR status API to check the status of the edited LR. To cancel the LR, use the LR Cancellation API before the LR is dispatched.

### 7. Pickup Request

Create a pickup request for the Delhivery operations team using the PUR Creation API. In you need to cancel the pickup, use the PUR Cancellation API.

### 8. Freight Calculation

Get the Estimate of the freight charges via the Freight Estimator API and check the breakdown of all the charges applicable to an LR using the Freight Charges API.

### 9. Generate Shipping Documents

Generate shipping labels and other required documents using the Generate Shipping Label API and Generate Document API respectively. Check the status of the document generation using the Generate Document Status API, and download them as per your requirements.

### 10. Download Documents & Print LR Copies

Download the relevant documents using the Document Download API. If needed, use the Print LR Copy API to fetch a single LR copy for printing.

### 11. Logout

Use Logout API to securely end the existing session.

---

## API Reference

### Password Reset

Use this API to reset the password of your account username.

This API will reset the password of the account username

The username and the password will then be further used in the Login API to generate the authentication token for the subsequent API.

> **Note:** The username will be the registered account name with Delhivery, without spaces. You can also get the account username from your respective delhivery business account POC.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| username<br>string | true | Registered account username |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | NA |
| P99 Latency (PRODUCTION) | NA |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | NA |

#### Request

```shell
curl --request POST \
	--url https://ltl-clients-api.delhivery.com/forgot-password \
	--header 'Connection: keep-alive' \
	--header 'Content-Type: Application/json' \
	--data '
{
  "username": "Pass your registered username with Delhivery"
}
'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/forgot-password
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/forgot-password
```

---

### Login

This API generates the bearer token to further authenticate all the API requests.

Delhivery B2B APIs authenticate the client systems using a JWT token generated using the Login API.

The validity of every token generated is 24 hours and has to be used in the authorization header of each API called subsequently.

The login API takes the username and password as input parameters. Reset the password of the account username using the password reset API mentioned in the password reset section.

- If a user tries to log in with incorrect credentials, the user ID is locked for the next 10 minutes
- It is recommended that you do not make a call to this API for every booking request, as it will lead to unforeseen errors

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| username<br>string | true | Client username |
| password<br>string | true | Password set by the user |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 694.17 ms |
| P99 Latency (PRODUCTION) | 886.46 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 100 |

#### Request

```shell
curl --request POST \
	--url https://ltl-clients-api-dev.delhivery.com/ums/login \
	--header 'Content-Type: Application/json' \
	--data '
{
  "username": "username",
  "password": "userpassword"
}
'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/ums/login
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/ums/login
```

---

### Logout

The API logs out the current user when used with the bearer token as authorization.

This API will log out of the session having the given jwt token.

Usage of this API is not mandatory

#### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | Bearer auth token |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 143.55 ms |
| P99 Latency (PRODUCTION) | 309 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 100 |

#### Request

```shell
curl --request GET \
	--url https://ltl-clients-api-dev.delhivery.com/ums/logout \
	--header 'Authorization: Bearer Token' \
	--header 'Content-Type: Application/json'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/ums/logout
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/ums/logout
```

---

### Serviceability

This API provides the serviceability of the consignee pin code.

This API will provide visibility on whether a Pincode is serviceable or not.

If any pin code is serviceable only then order creation or any further API needs to be used.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| weight<br>float | false | Expected weight of the shipment in grams |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 764.02 ms |
| P99 Latency (PRODUCTION) | 961.26 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 500 |

#### Request

```shell
curl --request GET \
	--url 'https://ltl-clients-api-dev.delhivery.com/pincode-service/122001?weight=1' \
	--header 'Authorization: Bearer Token' \
	--header 'Content-Type: Application/json'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/pincode-service/{pincode}
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/pincode-service/{pincode}
```

---

### Expected TAT

This API provides the estimated TAT between the origin and destination pin code.

This API lets you query for TAT by providing the origin and destination pin. This will provide the number of days in response.

The TAT provided here is based on current network performance and if there are persistent delays in some lanes, the TAT for those lanes will be larger. Similarly, our current network TAT may be faster than our promised TAT to you at the time of onboarding.

#### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |
| X-Request-Id<br>string | false | Unique Request ID |

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| origin_pin<br>string | true | Origin Pin |
| destination_pin<br>string | true | Destination Pin |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 391.82 ms |
| P99 Latency (PRODUCTION) | 426.12 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 300 |

#### Request

```shell
curl --request GET \
	--url 'https://ltl-clients-api-dev.delhivery.com/tat/estimate?origin_pin=400093&destination_pin=122001' \
	--header 'Authorization: Bearer Token'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/tat/estimate
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/tat/estimate
```

---

### Freight Estimator

This API provides the estimated freight charges based on inputs like origin-destination pin, weight, dimensions, etc.

This API calculates the estimated Freight charges for the given data.

These charges are estimated charges only based on the given data and it may vary from the actual amount charged for any LR and parameters may vary once LR is picked.

#### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | Bearer auth token |

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| dimensions<br>object | true | List of dimensions of package (in cm) |
| weight_g<br>Number | true | Weight for shipment in grams |
| cheque_payment<br>boolean | false | Payment from cheque or not |
| source_pin<br>string | true | Source pincode |
| consignee_pin<br>string | true | Target pincode |
| payment_mode<br>string | true | Mode of payment One of ["cod", "prepaid"] |
| cod_amount<br>Number | Conditional | Cod amount (Mandatory if payment mode is cod) |
| inv_amount<br>Number | true | Invoice amount |
| freight_mode<br>string | Conditional | Freight_mode (fop/fod) (Mandatory for B2BR Clients) |
| rov_insurance<br>boolean | false | rov risk_type (CARRIER is True, OWNER is False) |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 852.8 ms |
| P99 Latency (PRODUCTION) | 1.17 s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 100 |

#### Request

```shell
curl --request POST \
	--url https://ltl-clients-api-dev.delhivery.com/freight/estimate \
	--header 'Authorization: Bearer Token' \
	--header 'Content-Type: application/json' \
	--data '
{
  "dimensions": [
    {
      "length_cm": 11,
      "width_cm": 1.1,
      "height_cm": 11,
      "box_count": 1
    }
  ],
  "weight_g": 100000,
  "cheque_payment": false,
  "source_pin": "400069",
  "consignee_pin": "400069",
  "payment_mode": "prepaid",
  "inv_amount": 123,
  "freight_mode": "fod",
  "rov_insurance": true
}
'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/freight/estimate
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/freight/estimate
```

---

### Freight Charges

This API shows the breakdown of all the charges applicable to an LR.

This API is used to check the freight charges breakup of any LRN.

#### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | Bearer auth token |

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| lrns<br>string | true | Comma separated string of lrnums. Limits: Max 25 lrns Allowed. eg: lrn1,lrn2 |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 133.45 ms |
| P99 Latency (PRODUCTION) | 162.01 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 100 |

#### Request

```shell
curl --request GET \
	--url https://ltl-clients-api-dev.delhivery.com/lrn/freight-breakup/lrns=220029522%2C220029147%2C220029160%2C220029922%2C123123%2C220030275%2C220030054%2C220028714%2C220028626%2C220028853%2C220030336%2C220030431%2C220030363%2C220031362%2C220030469 \
	--header 'Authorization: Bearer Token'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/lrn/freight-breakup
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/lrn/freight-breakup
```

---

### Client Warehouse Creation

This API is used to register the pickup location in the Delhivery system which will be further used to create the order.

The client pickup locations or warehouses from where the shipments would be physically picked up, have to be defined beforehand in Delhivery systems.

There are three possible ways of doing this - Create Warehouse API, Pickup location creation via CL Panel, and Share data over emails with the Firstmile Support Team.

The warehouse name is passed in the Manifest API and is case and space-sensitive; any mismatch in the pickup location name will result in manifest failure.

The return address can also be configured for each warehouse - it can be the address of the warehouse itself or some other address.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| name<br>string | Yes | Warehouse name |
| pin_code<br>string | Yes | Pincode |
| city<br>string | No | City of origin |
| state<br>string | No | State of origin (Default : fetched from pincode) |
| country<br>string | No | Country |
| address_details<br>object | Yes | |
| same_as_fwd_add<br>boolean | No | If return address for the warehouse is same as forward address(takes precedence over ret_address) |
| ret_address<br>object | No | |
| billing_details<br>object | No | |
| buisness_hours<br>object | No | Accepted values for WEEK - MON, TUE, WED, THU, FRI, SAT, SUN |
| pick_up_hours<br>object | No | Accepted values for WEEK - MON, TUE, WED, THU, FRI, SAT, SUN |
| pick_up_days<br>list | No | Accepted values in list : [MON, TUE, WED, THU, FRI, SAT, SUN] |
| buisness_days<br>list | No | Accepted values in list : [MON, TUE, WED, THU, FRI, SAT, SUN] |
| tin_number<br>string | No | |
| cst_number<br>string | No | |
| warehouse_type<br>string | No | |
| accessibility_id<br>string | No | |
| incoming_center<br>string | No | |
| rto_center<br>string | No | |
| store_type<br>string | No | |
| tag<br>string | No | |
| consignee_gst<br>string | No | Should be 15 digit alphanumeric character |
| is_warehouse<br>boolean | No | |
| use_client_state<br>boolean | No | |
| active<br>boolean | No | |
| qr_enabled<br>boolean | No | |
| qr_data<br>string | No | |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 601.51 ms |
| P99 Latency (PRODUCTION) | 659.53 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 300 |

#### Request

```shell
curl --request POST \
	--url https://ltl-clients-api-dev.delhivery.com/client-warehouse/create/ \
	--header 'Authorization: Bearer Token' \
	--header 'Content-Type: application/json' \
	--data '
{
  "pin_code": "400059",
  "city": "Gurgaon",
  "state": "Haryana",
  "country": "India",
  "address_details": {
    "address": "Gurgaon",
    "contact_person": "contact_person",
    "phone_number": "9186676788"
  },
  "name": "Delhivery142",
  "business_hours": {
    "TUE": {
      "start_time": "07:00",
      "close_time": "08:30"
    }
  },
  "pick_up_hours": {
    "TUE": {
      "start_time": "13:00",
      "close_time": "16:00"
    }
  },
  "pick_up_days": [
    "TUE"
  ],
  "business_days": [
    "TUE"
  ],
  "ret_address": {
    "pin": "721657",
    "address": "test"
  }
}
'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/client-warehouse/create/
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/client-warehouse/create/
```

---

### Client Warehouse Updation

This API is used to edit/update an existing Warehouse

This API allows you to edit or update the details of an already created pickup warehouse location.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| cl_warehouse_name<br>string | Yes | Warehouse name |
| update_dict<br>dictionary | no | |
| city<br>string | no | City |
| state<br>string | No | State |
| country<br>string | No | Country |
| address_details<br>object | Yes | |
| ret_address<br>object | No | |
| billing_details<br>object | No | |
| buisness_hours<br>object | No | Accepted values for WEEK - MON, TUE, WED, THU, FRI, SAT, SUN |
| pick_up_days<br>list | No | Accepted values in list : [MON, TUE, WED, THU, FRI, SAT, SUN] |
| drop_days<br>list | No | Accepted values in list : [MON, TUE, WED, THU, FRI, SAT, SUN] |
| drop_hours<br>object | No | Accepted values for WEEK - MON, TUE, WED, THU, FRI, SAT, SUN |
| tin_number<br>string | No | |
| cst_number<br>string | No | |
| qr_enabled<br>bool | No | |
| appointment_required<br>string | No | |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 601.51 ms |
| P99 Latency (PRODUCTION) | 659.53 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 300 |

#### Request

```shell
curl --request PATCH \
	--url http://ltl-clients-api-dev.delhivery.com/client-warehouses/update \
	--header 'Authorization: Bearer Token' \
	--header 'Content-Type: application/json' \
	--data '
{
  "cl_warehouse_name": "testWH",
  "update_dict": {
    "city": "Faridabad",
    "state": "Maharashtra",
    "country": "Bharat",
    "address_details": {
      "address": "testing123",
      "contact_person": "Shashi",
      "phone_number": "9988000000",
      "email": "test@gmail.com",
      "company": "companyname"
    },
    "ret_address": {
      "address": "H.No100, Sector-40",
      "city": "Gurgaon",
      "state": "Haryana",
      "pin": "122001",
      "country": "INDIA"
    }
  }
}
'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/client-warehouse/update/
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/client-warehouse/update/
```

---

### Shipment Creation

The API generates a B2B order in the Delhivery system. This is an async API that gives a JOB ID in the response.

The Shipment Creation API is used to manifest the B2B orders within Delhivery's system. This is an asynchronous API that returns a Job ID upon a successful request.

This Job ID should be used in the GET Manifest API to retrieve the LR (Lorry Receipt) number and AWB (Airway Bill) numbers assigned to the shipment.

Since the Manifest API is an async API, the system requires some time to process the order. Hence it is recommended to maintain some gap between the manifest request and the Get Manifest status request.

The LR number serves as a primary tracking ID for the entire shipment and each box within the shipment is assigned a unique AWB number for tracking.

- Clients can provide a callback URL in the API request. Upon successful manifestation, Delhivery will push the LR number and AWB details to the specified callback URL.
- For clients having predefined LR and/or AWB numbers in their Delhivery account, these can be specified within the API request. If left blank, the system will generate the LR and AWB while manifestation.
- The Manifest API allows clients to specify an alternate return address for shipments that may require return handling, separate from the default warehouse.
- Manifest API allows clients to upload invoices. A client can either upload the Invoice copies directly in "binary (multipart/form-data)" OR they can pass the Invoice QR code.
- If the Invoice QR code is passed at the time of manifest, the Invoice PDF (hard copy of the invoice) will be required for the last-mile delivery to the consignee.
- If the Invoice copy is provided (without the QR code), this will be paperless transportation and the soft copy of the invoice will be used.

#### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| lrn<br>string | false | Lr number |
| pickup_location_name<br>string | Conditional (One of name or id is require) | Delhivery Registered Pickup Location Name |
| pickup_location_id<br>string | Conditional (One of name or id is require) | Delhivery Registered Pickup Location Id from FAAS. Either pickup_location or pickup_location_id is to be passed |
| payment_mode<br>string | true | One of: ['cod', 'prepaid'] |
| cod_amount<br>float | conditional | If payment_mode passed as 'cod', then it's mandatory to pass cod_amount |
| weight<br>float | true | Total weight of LR (in gm) |
| dropoff_store_code<br>string | conditional | Store code registered in FAAS. Either dropoff_store_code is required or dropoff_location is required. |
| dropoff_location<br>object | conditional(either dropoff_store_code or dropoff_location) Priority is on dropoff_store_code | Either dropoff_store_code is required or dropoff_location is required. |
| return_address<br>object | false | |
| shipment_details<br>object | true | it will be list of objects |
| dimensions<br>object | false | Dimensions of the package (in cm) in the given format and list of objects |
| rov_insurance<br>boolean | Mandatory for Retail client | ROV Risk Type: Pass True for Carrier Risk and False for Owner Risk. Note: Only for co-loader clients and retail clients, key is required. If passed for other clients, it will be ignored. |
| enable_paperless_movement<br>boolean | false | If passed FALSE, shipment will be moved with physical documents (e.g. invoice handed-over during pickup). If passed as TRUE, shipment will be moved in the network with a soft copy of the document (shared in this API's request payload). Default (if not passed): False |
| callback<br>object | false | API details for callback |
| invoices<br>object | true | Invoices of the shipment. (Either inv_qr_code, or inv_num and inv_amt are required.) |
| doc_file<br>FILE | Mandatory for Retail client | Maximum No of Files Allowed: 10. Allowed File size: Max 20 MB Aggregated all files. Allowed File Formats: [ .png .jpg .jpeg .pdf .bmp ] |
| doc_data<br>object | Conditional (Required if doc_file are passed). Mandatory for Retail client | Detail for individual doc files passed. It will be list of objects. |
| freight_mode<br>string | Mandatory for Retail client | "fop" or "fod" |
| billing_address<br>object | Mandatory for Retail client | |
| fm_pickup<br>boolean | Mandatory for Retail client | Pass True for fm_pickup and False for Self drop |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 1.6 s |
| P99 Latency (PRODUCTION) | 1.86 s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 500 |

#### Request

```shell
curl --request POST \
	--url https://ltl-clients-api-dev.delhivery.com/manifest \
	--header 'Authorization: Bearer Token' \
	--header 'content-type: multipart/form-data' \
	--form lrn= \
	--form 'pickup_location_name=pass registered wh name' \
	--form payment_mode=cod \
	--form cod_amount=122 \
	--form weight=100 \
	--form 'dropoff_location={"consignee_name": "Utkarsh", "address": "sector 7a", "city": "jajpur", "state": "odisha", "zip": "756043", "phone": "9876543210", "email": ""}' \
	--form rov_insurance=True \
	--form 'invoices=[ {"ewaybill": "", "inv_num": "I22331030453", "inv_amt": 59729.67, "inv_qr_code": ""}, {"ewaybill": "", "inv_num": "DEL/1122/0095407", "inv_amt": "2520480.0", "inv_qr_code": "pass base64 string of qr code"} ]' \
	--form 'shipment_details=[{"order_id": "oid1", "box_count": 1, "description":"Test description", "weight": 1000, "waybills": [], "master": False}]' \
	--form 'doc_data=[ { "doc_type": "INVOICE_COPY", "doc_meta": { "invoice_num": ["1/2/2025"] } } ]' \
	--form 'doc_file=/home/delhivery/Downloads/image (4).png' \
	--form fm_pickup=False \
	--form freight_mode=fop \
	--form 'billing_address={"name": "String <required>","company": "String <required>","consignor": "String <required>","address": "String <required>","city": "String <required>","state": "String <required>","pin": "String <required>","phone": "String <required>","pan_number": "String <optional> (either pan_number or gst_number mandatory)","gst_number": "String <optional> (either pan_number or gst_number mandatory)"}'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/manifest
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/manifest
```

---

### Shipment creation Status

This API provides the LR and AWB details in response using the JOB ID received from the Shipment Creation API.

The response of the create manifest API is a job ID which needs to be passed in this API to obtain the LR and AWB numbers associated with the shipment.

Please note that in the case of B2B shipments, we generate an additional document AWB which is used to track the documents travelling with the shipment. For a shipment with n boxes, the total number of AWBs generated will be n+1.

In a paperless setting, there will be "n" number of AWBs, as the document will be available in the system as soft copies.

#### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| job_id<br>string | true | job_id/request_id received during manifestation |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 570.75 ms |
| P99 Latency (PRODUCTION) | 570.75 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 500 |

#### Request

```shell
curl --request GET \
	--url https://ltl-clients-api-dev.delhivery.com/manifest \
	--header 'Authorization: Bearer Token'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/manifest
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/manifest
```

---

### Shipment Updation

This API helps to edit the details for a manifested LR.

Details provided at the time of manifestation (LR creation) can be edited via this API (until a certain stage of the LR, i.e., pre-last mile dispatch). It will accept the fields mentioned in the payload section. It will also accept the invoice document in binary format.

Update LR API is not supported for prepaid orders.

#### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| payment_mode<br>String | false | One of: ['cod', 'prepaid']<br>NOT ALLOWED IF SHIPMENT IS IN A TERMINAL STATE (EXCEPT LOST) OR SHIPMENT IS DISPATCHED IN LAST MILE |
| cod_amount<br>float | conditional | If payment_mode passed as COD then it's mandatory to pass cod_amount<br>NOT ALLOWED IF SHIPMENT IS IN A TERMINAL STATE (EXCEPT LOST) OR SHIPMENT IS DISPATCHED IN LAST MILE |
| consignee_name<br>string | false | Name of Consignee<br>NOT ALLOWED IF SHIPMENT IS IN A TERMINAL STATE (EXCEPT LOST) OR SHIPMENT IS DISPATCHED IN LAST MILE |
| consignee_address<br>string | false | Address of Consignee<br>NOT ALLOWED IF SHIPMENT IS IN A TERMINAL STATE (EXCEPT LOST) OR SHIPMENT IS DISPATCHED IN LAST MILE |
| consignee_pincode<br>string | false | Pincode of Consignee<br>ALLOWED ONLY IF THE SHIPMENT IS IN THE FIRST MILE (SO THAT ROUTING ISN'T IMPACTED) UD flow (cs_st = UD): - if cs_ss = manifested, allow the action - if cs_ss = in-transit, allow only if slid = oc |
| consignee_phone<br>string | false | Phone of Consignee<br>NOT ALLOWED IF SHIPMENT IS IN A TERMINAL STATE (EXCEPT LOST) OR SHIPMENT IS DISPATCHED IN LAST MILE |
| weight_g<br>float | conditional | Total weight of LR |
| dimensions<br>objects | conditional | Dimensions of the package in the given format |
| callback<br>object | conditional | |
| invoices<br>object | false | Invoices of the shipment |
| invoice_file<br>file | conditional (Only allowed with invoices) | First invoice document. Allowed File Formats: [ .png .jpg .jpeg .pdf .bmp ] Required if Paperless is enable for lr Maximum No of Files Allowed: 10 Allowed File size: Max 20 MB Aggregated all files Multiple invoice_file are supported |
| invoice_files_meta<br>file | conditional (Required with invoice_file) | This must contain details for an invoice file passed in the respective sequence in the list. For eg: |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 316.57 ms |
| P99 Latency (PRODUCTION) | 361.76 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 500 |

#### Request

```shell
curl --request PUT \
	--url https://ltl-clients-api-dev.delhivery.com/lrn/update/220110457 \
	--header 'Accept: application/json' \
	--header 'Authorization: Bearer Token' \
	--header 'content-type: multipart/form-data' \
	--form 'invoices=[{ "inv_number": "inv1", "inv_amount": 1234 }]' \
	--form cod_amount=0 \
	--form consignee_name=rahul \
	--form consignee_address=jammu \
	--form consignee_pincode=844120 \
	--form consignee_phone=9999999999 \
	--form weight_g=30 \
	--form 'invoices=[{ "inv_number":"I22331030453", "inv_amount": 59729.67, "qr_code": "...", "ewaybill": "" }]' \
	--form 'cb={"uri": "https://btob-api-dev.delhivery.com/docket/upload_callback", "method": "POST", "authorization": "Bearer Token"}' \
	--form 'dimensions=[{"width_cm": 5, "height_cm": 4, "length_cm": 3, "box_count": 1}]' \
	--form 'invoice_files_meta=[{"invoices": ["inv00"]}]' \
	--form invoice_file=/home/delhivery/Downloads/24.04.2024_18.01.59_REC.png
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/lrn/update/<lnum>
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/lrn/update/<lnum>
```

---

### Shipment Updation Status

Edit LR is an asynchronous API and gives a job ID that can be tracked from this API to get the edit LR status.

As this is an asynchronous API, the job id will require some time to update the details in the system and share the successful response.

#### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| job_id<br>string | true | Job_id for which status to be fetched |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 1.35 ms |
| P99 Latency (PRODUCTION) | 1.41 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 500 |

#### Request

```shell
curl --request GET \
	--url 'https://ltl-clients-api-dev.delhivery.com/lrn/update/status?job_id=dd036047-560c-4ac8-9f4f-ec554c2431cb' \
	--header 'Authorization: Bearer Token'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/lrn/update/status
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/lrn/update/status
```

---

### Shipment Cancelation

This API allows to cancel a manifested LRN before delivery.

Clients can choose to cancel the shipment altogether so that it does not even get picked up from the client warehouse location.

This API takes as LR number as the input for cancelling the order.

The shipments can be cancelled in the following statuses only - Manifested, In Transit, Pending, Open, Scheduled.

For Prepaid/COD shipments, the status of the package changes to "Returned".

#### Path Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| lrn<br>string | true | LRN to cancel |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 1.03 s |
| P99 Latency (PRODUCTION) | 1.24 s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 100 |

#### Request

```shell
curl --request DELETE \
	--url https://ltl-clients-api-dev.delhivery.com/lrn/cancel/220110457 \
	--header 'Authorization: Bearer Token'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/lrn/cancel/<lrn>
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/lrn/cancel/<lrn>
```

---

### Shipment Tracking

This API provides the LR tracking with the current status.

Clients can track the manifested shipments using the Track API.

The track API takes as input the LR number and the output is the current status of the shipment.

The B2B Track API will return only the latest status of the entire shipment; there will not be any historical data of the shipment journey in the response.

There is a limit on this API of 500 requests every 5 minutes

Following are the statuses that will be received in the response of this API.

| Status | Description |
|--------|-------------|
| MANIFESTED | Shipment created in Delhivery system |
| PICKED_UP | Shipment has been picked from client location |
| LEFT_ORIGIN | Left origin city for the destination |
| REACH_DESTINATION | Reached the destination city for delivery |
| UNDEL_REATTEMPT | Attempted for delivery |
| PART_DEL | Partially Delivered |
| OFD | Out for Dispatch |
| DELIVERED | Delivered to consignee |
| RETURNED_INTRANSIT | Shipment is returned and is In transit to the return center |
| RECEIVED_AT_RETURN_CENTER | Shipment received at return center |
| RETURN_OFD | Return Shipment is out for delivery |
| RETURN_DELIVERED | Return shipment is Delivered |
| NOT_PICKED | Shipment is marked as not picked after multiple failed pickup attempts by FE |
| LOST | Shipment is lost |

#### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| all_wbns<br>boolean | false | Whether to fetch all child waybills status or only master (if false) |
| lrnum<br>dtring | Conditional (if not present, track_id is required) | Specifying LR number |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 225.07 ms |
| P99 Latency (PRODUCTION) | 260.24 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 500 |

#### Request

```shell
curl --request GET \
	--url 'https://ltl-clients-api-dev.delhivery.com/lrn/track?lrnum=220110457' \
	--header 'Authorization: Bearer Token'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/lrn/track
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/lrn/track
```

---

### Booking Appointment

Use this API to schedule an appointment for the last-mile delivery

This API can be used to book an appointment for the last-mile delivery of an LRN.

This API can be called after the LR is manifested and before it is Out for delivery.

Delivery will be attempted based on the provided date and time slots.

#### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| lrnum<br>string | True | LR number |
| date<br>string | true | Allowed format : DD/MM/YYYY Starts from Next day |
| start_time<br>string | True | HH:MM starts from 00:00 to 23:30 (30 mins interval) |
| end_time<br>string | True | HH:MM starts from 00:00 to 23:30 (30 mins interval) |
| po_number<br>string | True | Max 5 PO numbers separated by comma. Atleast one PO number has to be passed. If PO is not applicable, pass ["NotApplicalbe"] |
| appointment_id<br>string | False | |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 100 ms |
| P99 Latency (PRODUCTION) | 120 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | ***to be updated |

#### Request

```shell
curl --request POST \
	--url https://ltl-clients-api-dev.delhivery.com/appointments/lm \
	--header 'Authorization: Bearer Token ' \
	--header 'Content-Type: application/json' \
	--data '
{
  "lrn": "220179514",
  "date": "01/03/2025",
  "start_time": "18:30",
  "end_time": "19:00",
  "po_number": [
    "122334",
    "edwwe21312312"
  ],
  "appointment_id": "32342424"
}
'
```

#### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/appointments/lm
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/appointments/lm
```
