# Delhivery B2B API Documentation (Continued)

## Pickup Request

This API helps to generate a Pickup request, which notifies the delhivery operations team to pick up the order from the client warehouse on a specific date and time.

This API lets you create pickup requests for the manifested B2B LRs.

### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |
| X-Request-Id<br>string | false | Unique Request ID |

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| client_warehouse<br>string | true | Pickup warehouse name |
| pickup_date<br>string | true | Pickup date in YYYY-MM-DD format |
| start_time<br>string | true | Expected start time in format HH:MM:SS |
| expected_package_count<br>integer | true | Expected number of boxes |

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 1.24 s |
| P99 Latency (PRODUCTION) | 1.31 s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 300 |

### Request

```shell
curl --request POST \
	--url https://ltl-clients-api-dev.delhivery.com/pickup_requests \
	--header 'Authorization: Bearer Token' \
	--header 'Content-Type: application/json' \
	--data '
{
  "client_warehouse": "test",
  "pickup_date": "2024-07-30",
  "start_time": "05:00:00",
  "expected_package_count": 1
}
'
```

### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/pickup_requests/
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/pickup_requests/
```

---

## Pickup Cancelation

This API helps to cancel a Pickup request if the order is not ready for pickup and you want to cancel the Pickup request.

This API lets you cancel a pickup request created with the create pickup request API.

### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |
| X-Request-Id<br>string | false | Unique Request ID |

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| pickup_id<br>string | true | Pickup id |

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 608.18 ms |
| P99 Latency (PRODUCTION) | 719.43 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 300 |

### Request

```shell
curl --request DELETE \
	--url https://ltl-clients-api.delhivery.com/pickup_requests/pur_id_1 \
	--header 'Authorization: Bearer Token'
```

### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/pickup_requests/{pickup_id}
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/pickup_requests/{pickup_id}
```

---

## Generate Shipping Label Url

This API generates labels to be pasted on the boxes in an LR. These labels contain essential details needed for the shipment's journey from pickup to delivery.

Clients need to generate and paste shipping labels on the shipment boxes so that they can be scanned by the FEs and picked up from the client warehouses.

Clients can choose to generate their own shipping labels as well. Such labels should have Delhivery LR and AWB number barcodes printed clearly in a 128-bit format. Such labels need to be verified by the respective Delhivery business account POC before integration goes live.

The clients can also download the shipping labels from the Delhivery ONE Panel if they wish to not integrate with these APIs.

This API takes the shipping label size and the LR number as input.

This API helps to generate the shipping label images for all the waybills related to an LRN. The API will return list of links corresponding to individual waybills.

The links have a Base64 stream that needs to be converted to a PNG format and printed by the client.

### Sharing the sizes of the respective parameters used for printing the labels:

| Size of shipping label | Dimension (in inches) |
|------------------------|----------------------|
| sm (Small) | 4'' * 2" |
| md (Medium) | 4" * 2.5" |
| A4 | 11.7" * 8.3" |
| Standard | 3'' * 2" |

### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| size<br>string | true | Size of shipping label One of: [sm\|md\|a4\|std] |
| lrn<br>string | true | Lorry receipt number |

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 359.1 ms |
| P99 Latency (PRODUCTION) | 411.35 s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 500 |

### Request

```shell
curl --request GET \
	--url https://ltl-clients-api-dev.delhivery.com/label/get_urls/std/220041149 \
	--header 'Authorization: Bearer Token'
```

### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/label/get_urls/<size>/<lrn>
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/label/get_urls/<size>/<lrn>
```

---

## LR Copy

This API provides the option to fetch the LR copy for one LR at a time.

This API helps to generate LR copy PDF for a single LR.

### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |
| X-Request-Id<br>string | false | Unique request Id |

### Path Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| lrn<br>string | true | LRN |

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| lr_copy_type<br>Comma separated string | false | Which copy to get in the LR Copy from the list of following: [SHIPPER COPY, ORIGIN ACCOUNTS COPY, REGULATORY COPY, LM POD, RECIPIENT COPY] Default: all |

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 1.46 s |
| P99 Latency (PRODUCTION) | 1.58 s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 300 |

### Request

```shell
curl --request GET \
	--url https://ltl-clients-api-dev.delhivery.com//lr_copy/print/123456789 \
	--header 'Authorization: Bearer Token' \
	--header 'Content-Type: Application/json'
```

### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/lr_copy/print/<lrn>
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/lr_copy/print/<lrn>
```

---

## Generate Document

This is an async API which is used to generate shipping labels and LR copies available in the Delhivery system.

This API takes as input the LR number and the label size, along with the client's callback URL data.

This API will help to generate documents (shipping labels, LR_copy) in bulk for a list of LRNs in async.

The client's callback URL should be in the format as given below: ^https?:\\/\\/[a-zA-Z0-9\\-]+[.][a-zA-Z0-9\\-\\.]+[.]+[a-zA-Z0-9\\/\\\\-]*$.

This API will push a link to the callback URL defined in the request payload.

The clients can download a PDF format label/lr_copy from the link pushed to their callback URL.

### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |
| X-Request-Id<br>string | false | Unique Request ID |
| Content-Type<br>string | true | application/json |

### Path Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| doc_type<br>string | true | Document Type (shipping_label \| lr_copy) |

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| lrns<br>list[string] | true | List of LRNs (max size: 25) |
| lr_copy_type<br>list[string] | false | List from [ SHIPPER COPY, ORIGIN ACCOUNTS COPY, REGULATORY COPY, LM POD, RECIPIENT COPY, ] Default: all |
| size<br>string | Conditional (Needed only for shipping label) | Size of shipping label (sm \| md \| a4 \| std) |
| callback<br>object | true | |

### Request

```shell
curl --request POST \
	--url https://ltl-clients-api-dev.delhivery.com/generate/shipping_label \
	--header 'Authorization: Bearer Token' \
	--header 'Content-Type: application/json' \
	--data '
{
  "lrns": [
    "220040156",
    "220040143"
  ],
  "size": "a4",
  "callback": {
    "uri": "https://btob-api-dev.delhivery.com/v3/document/generate_label_pdf",
    "method": "POST",
    "authorization": "Bearer Token"
  }
}
'
```

### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/generate/<doc_type>
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/generate/<doc_type>
```

---

## Generate Documents Status

This API provides the s3 link to download the shipping labels and LR copies using the JOB ID received from the Generate Document API.

This API takes the input as job id received in the response of Generate document API and in the response you will get a shipping label pdf link.

### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |
| X-Request-Id<br>string | false | Unique Request ID |

### Path Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| doc_type<br>string | true | Document Type (shipping_label \| lr_copy) |
| job_id<br>string | true | Job id received from Generate Documents Status API |

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 210 ms |
| P99 Latency (PRODUCTION) | 315 s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 500 |

### Request

```shell
curl --request GET \
	--url https://ltl-clients-api.delhivery.com/generate/shipping_label/status/390927a3-1eaf-4df5-8aa7-87027ac46e48 \
	--header 'Authorization: Bearer <Token>'
```

### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/generate/<doc_type>/status/<job_id>
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/generate/<doc_type>/status/<job_id>
```

---

## Download Document

This API is used to download the LM PODs once LR is delivered.

This API helps to download the documents(LM_POD, ALTERNATE_LM_POD, etc) related to an LRN or MWN.

This API takes as input either the LR or mwbn number of the shipment and provides a link to download the POD.

To download the return pod pass the doc_type as RETURN_DSP_POD

### Headers

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| Authorization<br>string | true | UMS Bearer Token |
| X-Request-Id<br>string | false | Unique Request ID |

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| lrn<br>string | Conditional (Either lrn or mwn is required) | LRN |
| mwn<br>string | Conditioanl (Either lrn or mwn is required) | MWN |
| doc_type<br>string | false | Document Type to download |
| auto_download<br>string | false | If passed true, downloads the first matched document. |
| version<br>string | false | Version (all \| latest). Default: latest |
| fields<br>string | false | Fields to display in metadata. Default: None |

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 129.58 ms |
| P99 Latency (PRODUCTION) | 157.54 ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 500 |

### Request

```shell
curl --request GET \
	--url 'https://ltl-clients-api-dev.delhivery.com/document/download?lrn=220079606&doc_type=LM_POD&audo_download=false&version=latest' \
	--header 'Authorization: Bearer Token'
```

### Environment URLs

**Test Environment URL**
```
https://ltl-clients-api-dev.delhivery.com/document/download
```

**Production Environment URL**
```
https://ltl-clients-api.delhivery.com/document/download
```

---

## Webhook Functionality

This API provides Webhook for Shipment Status Push and POD Push

### Webhook for Shipment Status Push and POD Push

Webhooks can trigger real-time shipment updates and Electronic Proof of Delivery (EPOD), enabling automatic notifications for specific shipping events.

Delhivery's webhooks provide real-time data push notifications, allowing seamless event-driven communication. Whenever a specific event occurs (ex: shipment status updates), Delhiverys system sends a POST request with relevant data (in JSON format) to a pre-configured URL on the clients server. This ensures timely updates without the need for constant polling, making the integration more efficient and responsive.

#### Prerequisites to enable a webhook

Client needs to fill the given webhook requirement document and fill in the required information (like account name, endpoint, authorization, and payload) in the document and share the updated document with us to the given email ID: "lastmile-integration@delhivery.com" keeping your business account POC in loop.

Clients need to whitelist a set of Delhivery IP to receive the scan updates in their system. The IP list has been shared in the webhook requirement document.

> **Note:**
> - Development at delhivery end takes a 4-5 business days including development, testing and deployment post the requirements are finalized.
> - Delhivery does not need to whitelist any IP to push the scans to the client system

#### Key Points for Shipment Status Webhook:

- Apart from the LR track API, if the client wants to receive the shipment status on a real-time basis, The shipment status can be pushed either on an LR level, Master AWB level or child box level depending on how the client wants to track the Shipment statuses.
- The statuses will be pushed on a real-time basis, so all the statuses applied on an LR will be pushed through the webhook.
- Delhivery can also map multiple Delhivery NSL codes with one of the client tracking codes as per the client requirements and there is no limit on the number of statuses that will be pushed from Delhivery systems.
- Delhivery Tech team will test the status push and then release the same to Production post successful testing.
- Delhivery has a capability to send additional data in scan push or map a custom payload also as per client system requirements.

**B2B Updated Scan Push Webhook Requirement Document**

#### Key Points for POD Webhook:

- LM POD's can be pushed through webhook on a real-time basis once the shipment is successfully delivered.
- We push the POD's to clients in either of the given formats (as per the client's requirement), through the webhook, which client need to convert to the PDF format.
  - Downloadable S3 URL (having expiry of 7 days)
  - base 64 encoded POD
  - Form data
- In case our POD audit team upload the revised/correct POD again , the POD will be re-triggered. Hence, For a single LR, it might be a possibility, that multiple POD's are being pushed.

**EPOD Updated Scan Push Webhook Requirement Document**

#### Statuses pushed for shipment through the webhook:

**For a forward shipment:** (Picking up the shipment from the warehouse and delivering to the end business consignee)

Here is the list of status and status types being pushed through the webhook:

| Status Type | Status | Description |
|-------------|--------|-------------|
| UD | Manifested | Order created in the Delhivery system |
| UD | Not Picked | When Shipment is not physically Picked up from the Clients Warehouse |
| UD | In Transit | Shipment is In Transit and moving to the Destination city |
| UD | Pending | When a forward shipment has reached the destination City but has not yet been dispatched for delivery |
| UD | Dispatched | When a forward shipment is dispatched for delivery to the end customer |
| DL | Delivered | When the shipment is delivered to the end customer |

**For a Return shipment** (when the Shipment isnt delivered and is returned),

Here is the list of status and status types being pushed through the webhook:

| Status Type | Status | Description |
|-------------|--------|-------------|
| RT | In Transit | When forward shipment is converted in to Return shipment after unsucessfull delivery/clients Instruction/adhoc requests or conditions system |
| RT | Pending | When a shipment has reached DC nearest to Origin center. |
| RT | Dispatched | When a shipment has reached DC nearest to Origin center and dispatched for delivery |
| DL | RTO | When a forward shipment is returned to Origin |

**Other status that can be applied:**

| Status Type | Status | Description |
|-------------|--------|-------------|
| LT | Lost | When a shipment is lost in transit |

---

## Frequently Asked Questions (FAQ)

### Authentication API's (Password Reset API , Login API and Logout API):

#### 1. How can I get a test account for API testing?

To request test or staging account credentials, send an email to your Delhivery business account POC from your registered email ID. They will get a staging account for you and will share the username with you for both staging and production accounts.

You can further reset your password using the password reset API.

#### 2. How to get the test token to execute the APIs?

B2B APIs support dynamic authentication only. Please generate the token using the login API by providing your test account's username and password. Pasword reset process is explained in the 1st point. Use this token in the Authorization header for subsequent API requests. Tokens expire periodically, so reauthentication is necessary.

#### 3. What is the expiry of the Bearer token?

The authentication token remains valid for 24 hours. Once it expires, you need to reauthenticate through the login API to generate a new token.

#### 4. What will happen if more than one token is generated, will the latest one remain active and all previous tokens expire?

If multiple tokens are generated, each token will still have the same 24-hour validity. However, there are specific validations applied in the login API. For details on these validations, you can refer to the Login API section of this API document.

#### 5. Why am I getting the Unauthorized error?

An "Unauthorized" error occurs when the token passed in the API has expired. In this case, try the following steps:

- **For Expired Token:** Generate a new token and retry the API request.
- **For Expired Password:** If the issue persists, check if the password has expired. Reset the password and try again.

If the problem still exists, consider the following possibility:

- **API Rate Limit Exceeded:** The login API permits a maximum of 100 requests every 5 minutes. Exceeding this limit will block the IP for 10 minutes.

#### 6. Does username and password remain static for a client?

The username remains static for a client, though it differs slightly between the staging and production environments. Similarly, the password does not change unless it expires. Password expiry duration is 180 days from the date it was generated. To avoid disruption, it's recommended to update the password before 180 days.

### Common Errors

#### Login API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| User not authenticated | Either the Password is incorrect or blank | Use the correct password, and try again |
| {'username': ['value does not match regex \\'^[a-zA-Z0-9-\\\\_\\\\@\\\\.\\s]{1,30}$\|^\\\\+91[1-9]{1}\\\\d{9}$\|^(([^<>()[\\\\]\\\\.,;:\\\\s@\"]+(\\\\.[^<>()[\\\\]\\\\.,;:\\\\s@\"]+)*)\|(\".+\"))@((\\\\[[0-9]{1,3}\\\\.[0-9]{1,3}\\\\.[0-9]{1,3}\\\\.[0-9]{1,3}])\|(([a-zA-Z\\\\-0-9]+\\\\.)+[a-zA-Z]{2,}))$\\'']}" | username is blank | Use the correct username |
| User profile is not active / User not found | username is not incorrect | Use the correct username |
| Validation Error: ['username: field required'] | username key is not present in the payload | pass the key along with the correct username |
| The browser (or proxy) sent a request that this server could not understand. | Two common issues that may occur during login API requests:<br>1) The payload is incorrect.<br>2) The password key and value are missing from the payload | Ensure both the payload structure and password are correctly included when making the request |
| Validation Error: ['password: field required' | password key is not present in the payload | use the key along with the correct password value |

#### Logout API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| The user is not authorized to perform this action. | Two potential issues that may cause errors:<br>1) An incorrect authentication token is passed in the headers.<br>2) The authentication token is from a production username while the endpoint is for staging, or vice versa. | Double-check the token and ensure it corresponds to the correct environment. |
| Invalid authorization header provided | Authentication bearer token is not present in the headers | use the correct authentication token |

---

### PINCODE SERVICEABILITY & TAT API (Pincode Serviceability API and Expected TAT API)

#### 1. What all pin codes can be used for testing purposes?

#### 2. Does the pincode serviceability API also provide the TAT?

### Common Errors

#### Pincode Serviceability API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| The user is not authorized to perform this action. | Either of the 2 things can happen:<br>1) An Incorrect Authentication token is passed in the headers<br>2) Authentication Token passed belongs to the production username and the endpoint belongs to staging or vice-versa | pass the correct authentication token and ensure to pass the correct endpoint as well |
| Token Decode Error: Not enough segments | Incorrect authentication token passed in the headers | pass the correct authentication token |
| Invalid authorization header provided | Token is not passed in the headers | pass the correct authentication token |
| No Such Resource | Either the pincode is not passed or there is some issue in the API endpoint | pass the pincode and validate the endpoint |
| Invalid pincode passed | Pincode passed in incorrect | pass the correct pincode |
| pin: 100001 is not serviceable. | Pincode is not serviceable | pass the serviceable pincode |

#### TAT API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Destination pin not serviceable. | If the destination pincode is NSZ | Only the serviceable pincode will provide the TAT |
| Origin pin not serviceable. | If the origin pincode is NSZ | Only the serviceable pincode will provide the TAT |
| [u'1001000 is not valid pin'] | If the pincode in either origin or destination is passed incorrect | pass the correct pincode |
| No Such Resource | API endpoint is not correct | pass the correct endpoint |
| Unable to process request. Origin pin missing. | If the origin pincode is not passed | pass the origin pincode |
| Unable to process request. Destination pin missing. | If the destination pincode is not passed | pass the destination pincode |
| The user is not authorized to perform this action. | Either of the 2 things can happen:<br>1) Incorrect Authentication token is passed in the headers<br>2) Authentication Token passed belongs to production username and endpoint belongs to staging or vice-versa | pass the correct authentication token and ensure to pass the correct endpoint as well |
| Validation Error: ['origin_pin: field required'] | If the origin_pin field is not passed or field name is passed incorrectly in the API endpoint | pass the correct field |
| Validation Error: ['destination_pin: field required'] | If the destination_pin field is not passed or field name is passed incorrectly in the API endpoint | pass the correct field |

---

### FREIGHT CALCULATION API (Freight Estimator and Freight Charges API)

#### 1. What is the difference between a Freight estimator and a Freight charges API

#### 2. Why B2B Rate Estimator API is giving a "Pricing File Not exist" error in the staging environment?

#### 3. Can we consider the charges coming in the Freight estimator API as the final one?

### Common Errors

#### Freight Estimator API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| No authorization header provided | authorization header is not shared | pass the authorization header |
| Token Decode Error: Not enough segments | Incorrect authentication token shared in the headers | pass the correct authentication token |
| Did not attempt to load JSON data because the request Content-Type was nt 'application/json'. | when Content-Type is not shared as application/json | pass the content type in the headers and pass application/json |
| Validation Error: ['dimensions: value is not a valid list'] | if the dimensions is not shared as a list | pass the dimesions array |
| The browser (or proxy) sent a request that this server could not understand. | when the data type is passed incorrect for any key in the payload | pass the correct data type |
| Validation Error: ["payment_mode: Permitted values: ['prepaid', 'cod']"] | if an incorrect payment mode is used or any value other than prepaid or cod | use either prepaid or cod in the payment_mode key |
| Validation Error: ["freight_mode: Permitted values: ['fop', 'fod']"] | if an incorrect freight mode is used or any value othe than fop or fod | use either fop or fod in the freight mode key |
| 'c_pin' is a required property | if c_pin is not passed | pass the pin in the c_pin key |
| pin : 4000690 not found in DataBase | if pincode shared is incorrect | pass the correct pincode |
| 's_pin' is a required property | if s_pin is not passed | pass the pincode in the STRING format |
| Validation Error: ['source_pin: str type expected'] | if the data type for source_pin passed is incorrect | pass only the STRING data type in the source_pin |
| Validation Error: ['inv_amount: value is not a valid FLOAT'] | if the data type of the invoice amount is incorrect | pass FLOAT data type in the inv_amount |
| Validation Error: ['weight_g: field required'] | if weight key is not passed in the payload | it is mandatory and needs to be passed |
| Pricing File Not exist | this comes when the pricing file does not exist for the account | If the error comes For staging API, we do not store the pricing file, hence we ask to test the API directly on production.<br><br>If the error comes for the production account, contact your delhivery business account POC and they'll get the pricing file updated for your account |

#### Freight Charges API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Validation Error: ['lrns: field required'] | if lrns field is missing from the query params | pass the lrn key and the LR's |
| No Such Resource | some issue in the API endpoint | check the URL and pass the correct endpoint |
| The user is not authorized to perform this action. | Either of the 2 things can happen:<br>1) Incorrect Authentication token is passed in the headers<br>2)Authentication Token passed belongs to production username and endpoint belongs to staging or vice-versa | pass the correct token and check the endpoint details as well |
| No authorization header provided | Token passed is incorrect | pass the correct token details |
| Token Decode Error: Invalid header padding | eiher of the 2 things can happen:<br>1) when authentication token passed is incorrect<br>2) api enpoint is incorrect | check the token, make sure it is active and check the endpoint details as well |
| Token Decode Error: Not enough segments | token passed is incorrect | pass the correct authentication token |

---

### WAREHOUSE MANAGEMENT (Warehouse creation and Warehouse Edit)

#### 1. Is it mandatory to create a warehouse before manifesting a shipment?

#### 2. What all information can be updated in any registered warehouse

### Common Errors

#### Warehouse Creation API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| The user is not authorized to perform this action. | Either of the 2 things can happen:<br>1) Incorrect Authentication token is passed in the headers<br>2) Authentication Token passed belongs to production username and endpoint belongs to staging or vice-versa | pass the correct token and check the endpoint details as well |
| Token Decode Error: Invalid header STRING: 'utf-8' codec can't decode bye 0xc6 in position 2: invalid continuation byte | token passed is incorrect | pass the correct authentication token details |
| Token Decode Error: Not enough segments | token passed is incorrect | pass the correct authentication token |
| Invalid authorization header provided | token passed is incorrect | pass the correct authentication token details |
| Missing or Invalid data provided for: ('pin_code', ['Not a valid INTEGER.]) | if pincode is not passed | pass the correct pincode |
| ['Error in serviceability: 22 is not valid pin'] | if pincode passed is incorrect | pass the correct pincode |
| ['Transaction Failed: client-warehouse of clien: cms::client::4735d6d1-4f5c-4809-9dc1-57e74b626e3d with name: testwh already exists CLIENT_STORES_CREATE'] | if the warehouse you are trying to create already exists | make sure to pass a unique WH name while creating a new WH |
| Missing or Invalid data provided for: ('name', ['Missing data for requird field.']) | when the mandatory key is not passed | make sure to pass the mandatory keys |
| The browser (or proxy) sent a request that this server could not understad. | payload is not correct | check the payload and pass the correct one |
| ['address_details: address must be a STRING'] | address is passed blank | pass the address details |
| Missing or Invalid data provided for: ('address_details', {'address': ['Nt a valid STRING.']}) | data type for the key, passed is incorrect | make sure to pass the correct data type |
| Missing or Invalid data provided for: ('address_details', {'phone_number: ['String does not match expected pattern.']}) | phone_number is passed blank in the payload | pass the correct phone number |
| Missing or Invalid data provided for: ('pick_up_hours', {'TUE: {'start_time': ['String does not match expected pattern.']}}) | start_time is passed blank | pass the correct time in the payload |
| Missing or Invalid data provided for: ('pin_code', ['Missing data fr required field.']) | if pincode key is not passed in the payload | pass the pincode details |
| Missing or Invalid data provided for: ('business_hours', {'': ['Unknon field.']}) | if day is not passed inside the business hours dictionary | pass the day details |
| ['ret_address: ret_address is required'] | if the ret_address is not passed | this is return address key which is mandatory to pass, make sure to pass the complete payload |

#### Warehouse Updation API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| UNAUTHORISED | Either of the 2 things can happen:<br>1) Incorrect Authentication token is passed in the headers<br>2) Authentication Token passed belongs to production username and endpoint belongs to staging or vice-versa | pass the correct token and check the endpoint details as well |

---

### SHIPMENT MANAGEMENT (Shipment Creation, Shipment creation status, Shipment Updation, Shipment Cancellation, Shipment Tracking)

#### 1. What are the possible values of the payment mode?

#### 2. What is the limit on box count?

#### 3. What is doc_waybill?

#### 4. What is paperless movement?

#### 5. How do we enable paperless movement?

#### 6. What is the expiry of the job ID received in the response of the manifest API?

#### 7. I am unable to get the LR when calling the Get Manifest status API

#### 8. What is the maximum number of LRs that can be canceled in a single request of the cancellation API?

#### 9. How many LR's can be tracked in a single request?

#### 10. How do we track the status of all the master and child waybills?

#### 11. What are the mandatory and non-mandatory keys in the API for shipment creation?

### Common Errors

#### Shipment Creation API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| The user is not authorized to perform this action. | Either of the 2 things can happen:<br>1) Incorrect Authentication token is passed in the headers<br>2) Authentication Token passed belongs to production username and endpoint belongs to staging or vice-versa | pass the correct token and check the endpoint details as well |
| SchemaValidationError | if the LR passed is incorrect | either pass the correct LR or keep this field blank |
| Validation Error: ['payment_mode: field required'] | if payment_mode is not passed in the payload | pass the correct payment mode |
| Validation Error: ["payment_mode: cod_amount required for: 'cod'"] | for cod payment mode, the cod value is either not passed or is passed as 0 | pass correct cod amount>1 for cod payment type |
| Validation Error: ['weight: field required'] | if the weight key is not passed OR data type passed is incorrect | pass the weight details |
| Validation Error: ['weight_g: ensure this value is greater than or equal to 1'] | if weight passed is negative or 0 | pass the correct weight details. it should be >1 |
| Validation Error: ['weight: value is not a valid FLOAT'] | if weight is passed as null | pass the correct weight details. it should be >1 |
| Validation Error: [': One of dropoff_location or dropoff_store_code is required'] | if dropoff_location is not passed | pass the consignee details in the dropoff location |
| Validation Error: ['dropoff_location.consignee_name: field required', ': One of dropoff_location or dropoff_store_code is required'] | if the consignee name key is not passed in the drop off location | pass the mandatory fields |
| Validation Error: ['dropoff_location.consignee_name: ensure this value has at least 1 characters', ': One of dropoff_location or dropoff_store_code is required'] | if the consignee name is passed blank in the drop_off location | pass all the mandatory fields |
| Validation Error: ['shipment_details: field required'] | if shipment_details is not passed | pass the shipment_details as it is mandatory to pass |
| Access Forbidden | If the user does not have the required permissions | Please contact lastmile-integration@delhivery.com |
| CoD is not allowed for the client: Test-B2B | CoD is not allowed for the client: Test-B2B | If the error is coming for a staging account, reach out to lastmile-integration@delhivery.com<br><br>If the error is coming for the production account, please ask your delhivery business account POC to get the service enabled |

#### Shipment Creation Status API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Invalid job id | If the job ID Passed in the URL is incorrect or has expired | make sure to pass the correct job ID which has not expired<br><br>Note: job ID has an expiry of 24 hours |
| Token Decode Error: Invalid crypto padding | Either of the 2 things can happen:1) when authentication token passed is incorrect2) api enpoint is incorrect | pass the correct token and check the endpoint details as well |
| Invalid authorization header provided | Authentication token passed is incorrect or is expired | pass the correct authentication token |
| UNAUTHORISED | Either of the 2 things can happen:<br>1) Incorrect Authentication token is passed in the headers<br>2) Authentication Token passed belongs to production username and endpoint belongs to staging or vice-versa | pass the correct token and check the endpoint details as well |

#### Shipment Updation API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| LR belongs to some other client | If the LR passed to be updated does not belong to the existing account | make sure to pass the correct account LR<br><br>Also check if the LR and the token belongs to the same account |
| Invoice Files are not passed with meta data, please provide 'invoice_file' | if the invoice_file is not uploaded when invoices is passed | upload the invoice_file when invoices are passed |
| Validation Error: [': Dimensions and weight are interdependent'] | if either dimensions is not passed when weight is passed<br><br>OR<br><br>if weight is not passed when dimensions is passed | pass both of these keys together as these are interdependent |
| Invoice Files are passed without meta data, please provide 'invoice_files_meta' | if the invoice file is uploaded without passing invoice_files_meta | make sure to pass the invoice_files when the invoice file is uploaded |
| Token Decode Error: Invalid header STRING: 'utf-8' codec can't decode byte 0x98 in position 1: invalid start byte | token passed is incorrect | pass the correct token |
| Invalid authorization header provided | Authentication token passed is incorrect | pass the correct authentication token |
| Token Decode Error: Not enough segments | Authentication token passed is incorrect | pass the correct authentication token |
| Job not found with job_id: 0a0a63cc-d5e4-4ee3-bec5-eab762 | Job ID Passed is incorrect or is expired | pass the correct job ID and make sure it is active |
| UNAUTHORISED | Either of the 2 things can happen:<br>1) Incorrect Authentication token is passed in the headers<br>2) Authentication Token passed belongs to production username and endpoint belongs to staging or vice-versa | pass the correct token and check the endpoint details as well |

#### Shipment Cancellation API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| The user is not authorized to perform this action. | Authenication token passed is incorrect | pass the correct authentication token |
| For LR 27009686, No WayBill found | LR passed is incorrect | Pass the correct LR belonging to the same account |
| No Such Resource | URL passed is incorrect | verify the URL and pass the correct one |
| Token Decode Error: Invalid header padding | Incorrect authorization header passed | pass the correct authentication token |
| Token Decode Error: Not enough segments | Incorrect authorization header passed | pass the correct authentication token |
| Invalid authorization header provided | Incorrect authorization header passed | pass the correct authentication token |

#### LR Track API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Data not found. | if the LR passed is incorrect | pass the correct LR |
| Token Decode Error: Invalid payload padding | Invalid authorization header passed | pass the correct authentication token |
| Invalid Parameters, Please pass LR number or TrackId | if param LR Is not passed | pass the param LR and pass the correct LR |
| Invalid authorization header provided | Invalid authorization header passed | pass the correct authentication token |
| No Such Resource | URL passed is incorrect | pass the correct endpoint |

---

### PICKUP REQUEST (PUR creation and PUR Cancellation)

#### 1. What is the process of pickup Request creation?

#### 2. After how long the pickup request creation is allowed once the AWB has been generated?

#### 3. At what point of time, the Cancel Pickup Request API can be used?

### Common Errors

#### Pickup Request Creation API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| The user is not authorized to perform this action. | If the token passed is incorrect | pass the correct authentication token and ensure to pass the correct endpoint as well |
| Invalid client warehouse passed | warehouse name passed is incorrect | pass the correct registered WH name for the account where pickup needs to be created |
| Pickup date should not be more than 7 days from pickup creation date | if the pickup date passed is more than 7 days | Pickup date should be within 7 days of the creatioln of PUR |
| End time cannot be in past | if the pickup date passed is in the past | pickup date should be a future date within the next 7 days of creating PUR |
| A Pickup Request 184237885 for this Pickup Location Already Exist for 24 Sep in slot 14:00 - 18:00 | If the pickup request already exists for the warehouse location passed | a new PUR can be raised only when the existing PUR Is closed for a warehouse |

#### Pickup Request Cancellation API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| No LR found with id 18423793 | if the PUR ID passed is incorrect | pass the correct PUR ID |
| No Such Resource | URL Passed is incorrect | pass the correct URL endpoint |
| Invalid authorization header provided | Incorrect authorization header is passed | pass the correct authentication token |
| Token Decode Error: Invalid payload padding | Invalid authorization header passed | pass the correct authentication token |
| Token Decode Error: Not enough segments | Token passed is incorrect | pass the correct authentication token |

---

### GENERATE SHIPPING LABEL & DOCUMENT (Generate Shipping Label, LR Copy, Generate Document, Download Document)

#### 1. In a single API request, how many LR's can be passed to print the shipping label

#### 2. What is the difference between shipping label API, generate document API and document download API?

### Common Errors

#### Generate Shipping Label API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Invalid LRn: 27009686, Please try again with valid/Active LRN | if the LR Passed is incorrect | Pass the correct LR |
| No Such Resource | URL Passed is incorrect | pass the correct URL endpoint |
| This LRN 220119832 belongs to another client | if the LR passed is incorrect or belongs to some other account | Pass the correct LR belonging to the same account for which the authorization token is passed |
| The user is not authorized to perform this action. | If the token passed is incorrect | pass the correct authentication token and ensure to pass the correct endpoint as well |
| Token Decode Error: Invalid header STRING: 'utf-8' codec can't decode byte 0x98 in position 1: invalid start byte | token passed is incorrect | pass the correct token |
| Invalid authorization header provided | Incorrect authorization header is passed | pass the correct authentication token |
| Token Decode Error: Not enough segments | Incorrect authentication token passed in the headers | pass the correct authentication token |
| The user is not authorized to perform this action. | Either of 2 things can happen:<br>1) If Authentication Token passed belongs to production username and endpoint belongs to staging or vice-versa<br>2) Either the authentication token is expired or passed incorrect | Pass the correct token and ensure passing the correct endpoint details |

#### Generate LR Copy API

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| The user is not authorized to perform this action. | If the token passed is incorrect | pass the correct authentication token |
| Invalid LRNs: ['27009686'] | if the LRN Passed is incorrect | pass the correct LR in the request |
| No Such Resource | URL passed is incorrect | pass the correct URL endpoint |
| Token Decode Error: Invalid payload padding | token passed is incorrect | pass the correct authentication token |
| Token Decode Error: Not enough segments | token passed is incorrect | pass the correct authentication token |
| Invalid authorization header provided | Invalid authorization header passed | pass the correct authentication token in the headers |

#### Generate Document

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| The user is not authorized to perform this action. | Either of the 2 things can happen:<br>1) Incorrect Authentication token is passed in the headers<br>2) Authentication Token passed belongs to production username and endpoint belongs to staging or vice-versa | pass the correct authentication token and ensure to pass the correct endpoint as well |
| 27009686: Invalid LR passed | when the LR passed is incorrect | pass the correct LR |
| Validation Error: ["size: unexpected value; permitted: 'sm', 'md', 'a4', 'std'"] | when size key is passed either blank, null or some other value apart fromsm, md, a4, std | pass either of these sizes: 'sm, md, a4, std' |
| Size of shipping label is required | when size key is not in the payload | pass the size key |
| Validation Error: ['mwn: or lrn is required'] | if lrns is passed as blank | lrns should be passed as list of strings<br>['lr1', 'lr2'] |
| Validation Error: ['lrns: ensure this value has at least 1 items'] | if trns is passed as empty list | lrns should be passed as list of strings<br>['lr1', 'lr2'] |
| Validation Error: ['lrns: value is not a valid list'] | if the data type passed is incorrect | lrns should be passed as list of strings<br>['lr1', 'lr2'] |

#### Download Document

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| The user is not authorized to perform this action. | Either of the 2 things can happen:<br>1) Incorrect Authentication token is passed in the headers<br>2) Authentication Token passed belongs to production username and endpoint belongs to staging or vice-versa | pass the correct authentication token and ensure to pass the correct endpoint as well |
| 27009686: Invalid LR passed | when the LR passed is incorrect | pass the correct LR |
| Validation Error: ["size: unexpected value; permitted: 'sm', 'md', 'a4', 'std'"] | when size key is passed either blank, null or some other value apart from:sm, md, a4, std | pass either of these sizes: 'sm, md, a4, std' |
| Size of shipping label is required | when size key is not in the payload | pass the size key |
| Validation Error: ['mwn: or lrn is required'] | if lrns is passed as blank | lrns should be passed as list of strings<br>['lr1', 'lr2'] |

---

## IMPORTANT NOTE

Kindly reach out to < lastmile-integration@delhivery.com > for API-related queries and keep your Delhivery business account POC in the loop.

Connect with your respective Delhivery business account POC for Account , Billing, OR Operation related queries.