# Delhivery B2C API Documentation (Continued)

## Pickup Request Creation

The Pickup Request Creation API is used to initiate a pickup request once an order has been manifested and is ready for collection.

- The pickup request is raised against the warehouse location, not the waybill number. Therefore, you do not need to create multiple pickup requests for multiple waybills if they are all being picked up from a single location. If shipments are at two different locations, you need to raise separate pickup requests for each location.
- For any given day, a second pickup request can be raised for any warehouse only when the existing pickup request is closed.
- The shipping label on the shipment should include essential information such as the recipient's address, a scannable tracking number barcode, and any other relevant shipping details.
- The right time to create a pickup request is when the shipment is packed and ready to be handed over to the FE.
- Integrating this API is optional since pickup requests can also be created from the One Panel. Additionally, you can enable auto-pickup for your account with assistance from your account POC.

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| pickup_time<br>String | true | Time for the pickup(hh:mm:ss) |
| pickup_date<br>String | true | Date for the pickup(YYYY-MM-DD) |
| pickup_location<br>String | true | Registered client warehouse from where the shipment is to be picked. Also referred to as pickup location. |
| expected_package_count<br>Integer | true | Count of packages that need to be picked up. |

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 242.37ms |
| P99 Latency (PRODUCTION) | 885.95ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 4000 |

### Request

```shell
curl --request POST \
	--url https://staging-express.delhivery.com/fm/request/new/ \
	--header 'Authorization: Token XXXXXXXXXXXXXXXXX' \
	--header 'Content-Type: application/json' \
	--data '
{
  "pickup_time": "11:00:00",
  "pickup_date": "2023-12-29",
  "pickup_location": "warehouse_name",
  "expected_package_count": 1
}
'
```

### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/fm/request/new/
```

**Production Environment URL**
```
https://track.delhivery.com/fm/request/new/
```

---

## Client Warehouse Creation

This API is used to register the pickup location in the Delhivery system, which is further used to create the order.

- The client's pickup locations or warehouses, where shipments will be physically picked up, must be registered in the Delhivery system beforehand.
- Warehouse name is case-sensivite so whatever name you register with this API, make sure exact same warehouse name is used while creating order
- A return address also need to be configured for each warehouse, which can either be the warehouse itself or some other address.

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| name<br>String | true | Name the warehouse, It will be considered as your pickup location. |
| registered_name<br>String | false | Pass your registered account name |
| phone<br>string | true | Contact number of the POC of the warehouse. |
| email<br>string | false | Email address of the POC of the warehouse. |
| address<br>string | false | Complete address of the warehouse. |
| city<br>string | false | City in which warehouse is located. |
| pin<br>String | true | Pincode of the area where the warehouse is located. |
| country<br>String | false | Country where the warehouse is located. |
| return_address<br>String | true | Complete return address of the warehouse. It can be the same as the pickup address as wel |
| return_city<br>String | false | City where the shipment will be returned |
| return_pin<br>String | false | Pincode of the city where the shipment will be returned. |
| return_state<br>String | false | State where the shipment will be returned. |
| return_country<br>String | false | Country where the shipment will returned. |

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 172.45ms |
| P99 Latency (PRODUCTION) | 396.51ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | NA |

### FAQ

### Request

```shell
curl --request POST \
	--url https://staging-express.delhivery.com/api/backend/clientwarehouse/create/ \
	--header 'Accept: application/json' \
	--header 'Authorization: Token XXXXXXXXXXXXXXXXX' \
	--header 'Content-Type: application/json' \
	--data '
{
  "phone": "9999999999",
  "city": "Kota",
  "name": "test_name",
  "pin": "110042",
  "address": "address",
  "country": "India",
  "email": "abc@gmail.com",
  "registered_name": "registered_account_name",
  "return_address": "return_address",
  "return_pin": "110042",
  "return_city": "Kota",
  "return_state": "Delhi",
  "return_country": "India"
}
'
```

### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/backend/clientwarehouse/create/
```

**Production Environment URL**
```
https://track.delhivery.com/api/backend/clientwarehouse/create/
```

---

## Client Warehouse Updation

This API is used to edit/update an existing Warehouse

- Warehouse name cannot be updated.
- You must provide the warehouse name along with the fields you wish to update.
- Only the parameters listed below can be updated for the given warehouse name.

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| name<br>String | true | Warehouse name in our system for which the details need to be updated. |
| address<br>String | false | address that needs to be updated |
| pin<br>String | true | pincode for the warehouse that needs to be updated |
| phone<br>String | false | Phone number that needs to be updated |

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 345.65ms |
| P99 Latency (PRODUCTION) | 61.16s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | NA |

### Request

```shell
curl --request POST \
	--url https://staging-express.delhivery.com/api/backend/clientwarehouse/edit/ \
	--header 'Accept: application/json' \
	--header 'Authorization: Token XXXXXXXXXXXXXXXXX' \
	--header 'Content-Type: application/json' \
	--data '
{
  "name": "registered_wh_name",
  "phone": "9988******",
  "address": "HUDA Market, Gurugram, Haryana - 122001"
}
'
```

### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/backend/clientwarehouse/edit/
```

**Production Environment URL**
```
https://track.delhivery.com/api/backend/clientwarehouse/edit/
```

---

## Webhook Functionality

Webhook provides Shipment Status Push and Document(POD, Sorter Image, QC Image) Push

### Webhook for Shipment Status Push and POD Push

Delhivery B2C integration offers webhooks for real-time order updates and document sharing. These updates follow a standard JSON payload format. Once the webhook is configured, clients will begin receiving updates in real time. In case you don't want to use Polling API for order updates and tracking, this is an alternative.

#### Prerequisites to enable a webhook

Complete the Delhivery Webhook Requirement Document by providing your Delhivery account name, endpoint URL, and authorization details. Share the filled document via email to "lastmile-integration@delhivery.com" keeping your business account POC in loop.

Please note that Scan Push and Document Push are two separate webhooks and cannot be combined into a single webhook endpoint.

Refer to the sample Webhook Requirement Documents attached below. Fill out the relevant document(s) based on your webhook requirement and share them as instructed.

- Scan Push Webhook Requirement Document
- POD Webhook Requirement Document
- Sorter Image Webhook Requirement Document
- QC Image Webhook Requirement Document

#### Key Points for Shipment Status Webhook

- Apart from the AWB Track API, if the client wants to receive real-time shipment status updates, statuses can be pushed at the AWB level.
- All statuses applied to an AWB will be pushed in real-time through the webhook.
- Delhivery's tech team will test the status push and release it to production after successful testing.
- Delhivery can send additional data related to tracking in the scan push or map a custom payload based on the client's system requirements.
- Delhivery has a capability to send additional data in scan push or map a custom payload also as per client system requirements.

#### Statuses pushed for shipment through the webhook

**For a forward shipment** (picking up the shipment from the warehouse and delivering it to the end consignee), the following statuses and status types are pushed through the webhook:

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

**For a Reverse shipment** (when picking up shipments from customer location and delivering it to client warehouse.),

the following statuses and status types are pushed through the webhook:

| Status Type | Status | Description |
|-------------|--------|-------------|
| PP | Open | When pick up request is created in our system |
| PP | Scheduled | When a pickup request is scheduled, it automatically moves from "open" to "scheduled" status in our system. We keep these statuses separate to improve visibility as we integrate with Parcelled. |
| PP | Dispatched | When FE is out in the field to collect this package from the end customer. |
| PU | In Transit | When pick up shipment is in transit to RPC from DC after physical pick up. |
| PU | Pending | When pickup shipment has reached RPC but not yet dispatched for delivery to the client. |
| PU | Dispatched | When pickup shipment is dispatched for delivery to the client from RPC. |
| DL | DTO | When pickup shipment is accepted by the client and POD is received. |
| CN | Canceled | When a reverse pickup shipment is canceled before getting picked up from customer |
| CN | Closed | When a reverse pickup shipment is canceled and request is closed |

---

## RVP QC 3.0

This is used to perform Quality Check (QC) at the consignee's doorstep for an RVP (Reverse Pickup) shipment.

This is an updated version of the RVP QC that gives the flexibility of a question-based model. It will allow a set of questions against each item to be picked on the ground by FE from the end customer. Pickup will only be made once all the mandatory questions have been answered correctly.

### Steps of Integration

1. QC question mapping
2. Order Creation

#### 1. QC Question Mapping

A one-time QC mapping is required on Delhivery's end to enable this feature. Based on the client's QC requirements, the Delhivery BD team will share the relevant Delhivery QC questions along with their corresponding question IDs. The client must then map these Delhivery question IDs to their own question IDs and share the mapping in the specified format, so it can be configured in the Delhivery system.

| Client Question id | DLV Question id |
|-------------------|-----------------|
| Client Question id-1 | DLV Question id-1 |
| Client Question id-2 | DLV Question id-2 |
| Client Question id-3 | DLV Question id-3 |
| Client Question id-4 | DLV Question id-4 |
| Client Question id-5 | DLV Question id-5 |

#### 2. Order Creation

When creating an RVP order via API, 2 keys must be included in the manifest payload:

- **"qc_type":** Set this key to the hardcoded value "param" to indicate Parametric QC.
- **"custom_qc":** Include the QC data in the manifest payload within this array. Refer the sample payload in the request section

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| item<br>string | false | |
| description<br>string | true | |
| images<br>list | true | Comma-separated multiple strings can be passed |
| return_reason<br>string | false | |
| quantity<br>integer | true | Default value is 1, if quantity is not presents |
| brand<br>string | false | |
| product_category<br>string | false | |
| questions<br>list | true | |
| questions_id<br>string | true | This will be the client question id and against this ID Delhivery will map one question at their end |
| options<br>list | true | |
| value<br>list | true | Currently only the first element is chosen as the correct option |
| required<br>boolean | true | False: Question will still be asked but the answer will not affect the QC result, i.e. If FE chooses any available answer to the given QC question, QC will always be Passed.True: Question will be asked and the answer will affect QC result, i.e. If FE chooses the incorrect answer to the given QC question, QC will be Failed |
| type<br>String | true | Type == 'varchar'; FE will type the answer Type == 'multi'; FE will select one of the given options |
| ques_images<br>list | false | this is a non-mandatory field and completely optional for a client to pass. The client has to pass the image URL, which will be visible to the FE for a specific question for which QC is performed |

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 366.03 ms |
| P99 Latency (PRODUCTION) | 916.17ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 20000 |

### Request

```shell
curl --request POST \
	--url https://staging-express.delhivery.com/api/cmu/create.json \
	--header 'Authorization: Token xxxxxxxxxxxxxxxxxxxxx' \
	--header 'Content-Type: application/json' \
	--data 'format=json&data={
  "shipments": [
    {
      "client": "pass the registered client name",
      "return_name": "test_designs",
      "order": "1234567890",
      "return_country": "India",
      "weight": "150.0 gm",
      "city": "Meerjapuram",
      "pin": "521111",
      "return_state": "Gujarat",
      "products_desc": "NEW EI PIKOK (PURPAL-ORANGE)",
      "shipping_mode": "Express",
      "state": "Andhra Pradesh",
      "quantity": 1,
      "waybill": "123455678910",
      "phone": "1234567890",
      "add": "7 106 abc road, 2020 bulding ",
      "payment_mode": "Pickup",
      "order_date": "29-06-2023",
      "seller_gst_tin": "ABCD1234F",
      "name": "Jitendra Singh",
      "return_add": " SHOP NO 218,ABC Road, Mumbai",
      "total_amount": 749,
      "seller_name": "ABC Design",
      "return_city": "SURAT",
      "country": "India",
      "return_pin": "394101",
      "return_phone": "1234567890",
      "qc_type": "param",
      "custom_qc": [
        {
          "item": "mobile",
          "description": "Mi note 1 pro",
          "images": [
            "https://fdn2.gsmarena.com/vv/pics/xiaomi/xiaomi-note-pro-2.jpg"
          ],
          "return_reason": "Damaged",
          "quantity": 1,
          "brand": "Mi",
          "product_category": "mobile",
          "questions": [
            {
              "questions_id": "client Question id",
              "options": [
                ""
              ],
              "value": [
                "123456543"
              ],
              "required": true,
              "type": "varchar",
              "ques_images": [
                "http://ecx.images-amazon.com/images/I/414yumheSAS._AC_.jpg"
              ]
            }
          ]
        },
        {
          "item": "mobile",
          "description": "Mi note 2 pro",
          "images": [
            "https://static.toiimg.com/photo/55073523/Xiaomi-Mi-Note-2.jpg"
          ],
          "return_reason": "Damaged",
          "quantity": 2,
          "brand": "Mi",
          "product_category": "apparel",
          "questions": [
            {
              "questions_id": "client question id",
              "options": [
                "Black",
                "other"
              ],
              "value": [
                "Black"
              ],
              "required": true,
              "type": "multi",
              "ques_images": [
                "http://ecx.images-amazon.com/images/I/414yumheSAS._AC_.jpg"
              ]
            }
          ]
        }
      ]
    }
  ],
  "pickup_location": {
    "name": "pass the registered pickup WH name"
  }
}'
```

### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/cmu/create.json
```

**Production Environment URL**
```
https://track.delhivery.com/api/cmu/create.json
```

---

## Download Document API

This API allows fetching documents associated with B2C orders.

Document download API enables retrieving multiple types of documents that are not archived in the Delhivery system.

**Allowed Document Types:**
- SIGNATURE_URL
- RVP_QC_IMAGE
- EPOD
- SELLER_RETURN_IMAGE

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| doc_type<br>Varchar | true | The type of document to fetch (e.g., SIGNATURE_URL, EPOD) |
| waybill<br>integer | true | Delhivery waybill number |

### Request

```shell
curl --request GET \
	--url 'https://track.com/api/rest/fetch/pkg/document/?doc_type=doc_type&waybill=1234567890' \
	--header 'Authorization: Token ********************' \
	--header 'Cookie: sessionid=14901340921'
```

### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/rest/fetch/pkg/document/?doc_type={doc_type}&waybill={AWB}
```

**Production Environment URL**
```
https://track.delhivery.com/api/rest/fetch/pkg/document/?doc_type={doc_type}&waybill={AWB}
```

---

## NDR API

This API allows to take the action on the NDR shipments.

NDR API is an asynchronous API, which provides the UPL ID in the Response

The UPL ID is further used in the GET NDR Status API to get the status of the UPL ID for which the NDR action was taken

Currently 2 actions are allowed in the NDR API:
- RE-ATTEMPT
- PICKUP_RESCHEDULE

### Key considerations for using the NDR API

#### 1. For RE-ATTEMPT

- "RE-ATTEMPT" action can be applied to an AWB if its current NSL code is in the following list: ["EOD-74", "EOD-15", "EOD-104", "EOD-43", "EOD-86", "EOD-11", "EOD-69", "EOD-6"]
- It is recommended to apply "RE-ATTEMPT" late in the evening (after 9 PM) to ensure all NDR AWBs are back in the facility and all dispatches are closed.
- Always verify the current NSL of the AWB while applying NDR.
- The attempt count for the shipment should be either 1 or 2.

#### 2. FOR PICKUP_RESCHEDULE

This action can be applied to an AWB if it fulfills below conditions:

- If the AWB current NSL code is in the below list ["EOD-777", "EOD-21"] , The shipment status is marked as Cancelled.

> **Note:** Shipment should be Non OTP Cancelled.

- Apply 'PICKUP_RESCHEDULE' after 9 PM to ensure that all open dispatches in the facility are closed by that time.
- The attempt count for the shipment should be either 1 or 2.

### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| waybill<br>string | true | Waybill for which NDR needs to be applied |
| act<br>string | true | Action needs to be passed here, RE-ATTEMPT PICKUP_RESCHEDULE |

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 93.77ms |
| P99 Latency (PRODUCTION) | 126.38s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | NA |

### Request

```shell
curl --request POST \
	--url https://express-dev-test.delhivery.com/api/p/update \
	--header 'Accept: application/json' \
	--header 'Authorization: Token ******************************' \
	--header 'Content-Type: application/json' \
	--data '
{
  "data": [
    {
      "waybill": "13163116xxxxxx",
      "act": "RE-ATTEMPT"
    }
  ]
}
'
```

### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/p/update
```

**Production Environment URL**
```
https://track.delhivery.com/api/p/update
```

---

## GET NDR STATUS API

This API is used to get the status of the request_id(i.e UPL ID) received from the NDR API

### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 75.03ms |
| P99 Latency (PRODUCTION) | 88.03s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | NA |

### Request

```shell
curl --request GET \
	--url 'https://track.delhivery.com/api/cmu/get_bulk_upl/UPL70200521839149515?verbose=true' \
	--header 'Accept: application/json' \
	--header 'Authorization: Token **************************' \
	--header 'Content-Type: application/json'
```

---

## Frequently Asked Questions (FAQ)

### CREATE & UPDATE SHIPMENT API

#### Q1. How to Execute Delhivery API?

To Execute the API, you need to login to the Delhivery UCP panel with your Delhivery registered email id.

URL:  https://one.delhivery.com/

After login, go to the CDP (Client Developer portal) by following steps to execute the API:

Settings > API Setup > Test our APIs

1. On the UCP home page sidebar, click on the "Settings"
2. Then, click on the "API Setup"
   - To view the API documentation only then click on the "See our documentation" link.
   - To test the API click on the "Test our APIs" button.

#### Q2. What is an API Token and How to get that?

An API Token is a static authentication key used to verify the identity of a client. This token is unique for each client registered with us. Additionally, if a client has multiple accounts, each account will have a distinct token key.

For testing purposes, the API Token will be provided by Delhivery Business account POC who manages client accounts within the Business Team. For production accounts, the token can be obtained from the Delhivery One panel.

#### Q3. I am getting the error "format key missing in the post" in the Package Order Creation API response.

The format=json&data= (without quotes) parameter is mandatory in the request payload for order creation in our system. Please refer to the screenshot for further details.

#### Q4. How do I get the PHP cURL code for the API?

Our API uses JSON format for both requests and responses, so you may need to convert it according to your requirements. When you test the API using Postman, you can obtain code snippets in various programming languages by clicking the "Code" button in the upper right section of the Postman interface.

Please refer to the screenshot for further details.

#### Q5. What is the "QC" field in the Order Creation API, and why is it required?

"QC" means Quality check and QC Is being done for the Reverse Pickup (RVP) orders, if the client wants Delhivery to verify the product at the time of pickup from the customer. For prepaid or COD orders, the "QC" field is not required. Additionally, "QC" is an optional field in our Manifestation API and can be used only if you have alignment with the Business team regarding QC requirements.

#### Q6. How do I get a waybill in the Package Order Creation API?

There are two methods for waybill creation:

1. When calling the API, leave the "waybill" field blank. The API will return a dynamically generated waybill in the response.
2. Alternatively, you can fetch waybills in advance and store them in your system. Then, when calling the API, you can provide these waybills one by one. Use the "Single Waybill Fetch API" to obtain a single waybill, and the "Bulk Waybill Fetch API" to retrieve multiple waybills.

#### Q7. Will the API endpoint and token remain the same for package creation API for the live environment?

No, for the live environment, you just need to replace "staging-express" with "track" for all API's endpoints and the live token will be different from the Test environment, which will be again shared by BD-Business Development SPOC assigned to your account.

#### Common Remarks

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Getting an error "Authentication credentials were not provided" while trying to manifest the Shipment. | This error comes when we do not pass the Authorization Token in the API Header. | Need to pass correct Authorization Token under API Header. |
| Getting the error "shipment list contains no data". | This error comes when we do not pass the correct client name under the "client" payload in the API. | You will have to pass the exact client name registered with us (Please note that client name is case sensitive). |
| Getting an Error message " Unterminated string starting at: line … column … (char …). | This error means that the Special character you are using in the mentioned API line ….. is not allowed in our API. | Please do not pass the below-mentioned special characters in the API & % # ; \ |
| Getting error "format key missing in the post" in Package Order Creation API response. | That means you are missing JSON format static value on top of the API body. | "format=json&data=" (without quotes) is mandatory to pass in the request payload in order creation in our system. |
| Getting the error in response "Unable to consume waybill XXXX"? | This issue only occurs if there is a mismatch in the allocated waybill series or the waybill is already consumed. | Please validate the Waybill before passing in the waybill and fetch the waybill in advance before passing that in API, You can fetch the waybill using our fetch waybill API. |
| Getting the error "rmk": "ClientWarehouse matching query does not exist." while trying to execute the Manifestation API. | This error comes when we do not pass the correct warehouse name in the "name" field of the "pickup_location" dictionary. | Please pass the correct warehouse/Pickup_location name under "pickup_location", "name" OR use warehouse creation API to create a new warehouse for your account. |
| Getting the error "rmk": "Client-Warehouse is not active." | This means the warehouse name that you are using under the "pickup_location", "name" field is currently Inactive at our end. | Please connect with your delhivery account POC (Spokesperson) to get this activated or for further discussion on it. |
| Getting the error "Crashing while saving package due to exception suspicious order/consignee". | The shipment manifestation has failed because the consignee is Suspicious. | Please connect with your delhivery business account POC to discuss this further. |
| Getting the error "Crashing while saving package due to exception PUR (shipment pickup from seller) failure rate of the seller is very high." | The error comes because the PUR failure rate of the seller is very high. | Please connect with your delhivery account POC to discuss this further. |

Getting the error "Duplicate Order Id" while trying to manifest the shipment.

This error comes when we pass the same Order id which is already created for the same account.

If the below 6 fields are the same for 2 orders then the 2nd order will fail while doing the manifest with the error of duplicate order id.

- client name
- order id
- total amount
- product description
- payment mode
- consignee name

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Getting the error "Crashing while saving package due to exception 'client manifest charge API failed due to insufficient balance'. Package might have been partially saved." | This error while Manifesting the Shipment OR generating the Pickup Request. | So to fix the issue you will have to recharge your wallet with a minimum of 500 to Manifest the shipment and raise the Pickup request. |
| Getting the error " Error message is 'unicode' object has no attribute 'get'. | This error comes when you do not pass shipment as a list. | Please pass shipment as a list, In the Manifestation API's Payload. |
| Getting the error "Crashing while saving package due to exception 'Package type Pickup/COD/REPL/Prepaid not serviceable for this account "Package might have been partially saved." | This error comes when the service "payment_mode" you are using in API is not enabled for your account. | Please connect with your delhivery POC to get the required service enabled for your account. |
| Getting the error "Crashing while saving package due to exception '1100** is non serviceable pincode'. Package might have been partially saved." | This error comes when we use Non-serviceable Pincode in Manifestation API. | Please use a serviceable PIN code and try to manifest the shipment. You can use Pincode serviceability API to check the serviceability of Pincodes. |
| Getting the error "Incorrect phone number(s) for order *****" while trying to manifest the shipment. | The Phone number you have passed under the "phone" payload in API has some Ambiguity. | Please pass the correct phone number according to the format mentioned below: Phone numbers passed for order during manifestation undergo the below checks: The number can have the below prefixes: 91, +91, +91-, 91-, 0 |
| Getting the error "Duplicate waybill" while trying to manifest the shipment | This error comes when we use same waybill in the Manifestation API which has been already manifested earlier. | Use a differenet waybill number. |
| Getting the error "oid does not pass the validator <lambda>.check if there any extra character or dots in column" while trying to manifest the shipment | This error comes when we use the Order id value as more than 50 character. The max character allowed in the "order" field is 50. | Use less than 50 character and test again. |
| Getting error "Crashing while saving package due to exception Manifestation failed as the total shipment volume has exceeded the available capacity of this pincode. Package might have been partially saved." | You have exceeded the daily shipment manifestation capacity for this pincode. | You may try again after midnight. Alternatively, for urgent shipment manifestation, please get in touch with your Delhivery account point of contact (POC). |

#### Q8. How to resolve the error "rmk": "client is not active"?

This error typically occurs when the client account is inactive or the end date associated with the account has expired. To resolve this, please contact your business account point of contact (POC) and request them to verify if the account is active and the end date is valid. If needed, they can make the necessary changes to reactivate the account. Once updated, you can retry the API call—it should work as expected.

#### Q9. "rmk": "Package creation API error.Package might be saved.Please contact tech.admin@delhivery.com. Error message is 'NoneType' object has no attribute 'end_date' . Quote this error message while reporting."

This issue usually occurs due to an environment mismatch. If you're using a production token with a staging API (or vice versa), the request will fail. Please ensure that you are using the correct token corresponding to the environment:

- Use the staging token with the staging API
- Use the production token with the production API

Matching the token and API environment correctly should resolve the issue.

#### Q10. When should I use Multi-Package Shipment (MPS) for order creation?

You should use the Multi-Package Shipment (MPS) API when the products in an order are packed in separate containers or boxes. This allows each package to be tracked individually under the same order.

If all products are packed in a single container, you can proceed with the standard (single-package) shipment creation API. In that case, product details can be passed as a comma-separated string in the products_desc field.

Please share your packaging approach so we can guide you accordingly.

#### Q11. Pincode is serviceable but still getting error "Crashing while saving package due to exception '1100** is non serviceable pincode'. Package might have been partially saved."?

This error typically occurs when the pincode is serviceable for B2C shipments, but you're trying to manifest a heavy shipment. To troubleshoot this issue:

- Check if the pincode is serviceable for heavy shipments using the Heavy Pincode Serviceability API.
- Verify if your account is configured for heavy shipments. Some accounts are restricted to B2C services only.
- Review your payload to ensure you're not unintentionally passing product_type as heavy.

If none of these conditions apply and the issue persists, please reach out to the Last-Mile Integration team for further support.

---

### CHECK PINCODE SERVICEABILITY API

#### Q1. What is the Pin-code Serviceability API?

The Pin-code Serviceability API provides a list of all pin codes serviced by Delhivery, along with flags indicating whether each pincode is serviceable for both prepaid and COD packages. Additionally, an "NSZ" response for an AWB means that the pincode is not serviceable.

#### Q2. How can I identify from the pincode response whether a pincode is serviceable or not?

To determine if a pincode is serviceable or not, refer to the initial section of the response provided below.

```json
"delivery_codes": [
  {
    "postal_code": {
      "city": "Mumbai",
      "cod": "N",
      "inc": "Mumbai MIDC (Maharashtra)",
      "district": "Mumbai",
      "pin": 400064,
      "max_amount": 0.0,
      "pre_paid": "Y",
      "cash": "Y",
      "state_code": "MH",
      "max_weight": 0.0,
      "pickup": "N",
      "repl": "Y",
      "covid_zone": null,
      "country_code": "IN",
      "is_oda": "N",
      "remarks": "",
    }
  }
]
```

- **Remarks: ""** -> Remarks Blank means pincode is serviceable
- **Remarks: "Embargo"** -> Remarks Embargo means pincode is NSZ and its currently not serviceable (i.e Pincode is temporary NSZ )
- Below are the fields you need to check for different service types:
  - "pre_paid": "Y"
  - "pickup": "N"
  - "repl": "Y"
  - "Y" means the mentioned service is available for the pincode.
  - "N" means the mentioned service is not available for the pincode.

#### Common Remarks

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Getting the below response while trying to run the Pincode API { "delivery_codes": [] } | The Pin code for which you are trying to check the serviceability does not seems to be the correct. | Pincode Please use a Valid 6 digit PIN code and try to execute the API after that. |
| Getting the below error while trying to execute Pincode API. "Login or API Key Required" | The Token that you are using does not seem to be the correct Token. | Please use a Valid Token shared by the Delhivery team and test after that. |

#### Q3. How to resolve the CORS error?

CORS (Cross-Origin Resource Sharing) errors typically occur when an API is called directly from the frontend (browser), and the server does not allow requests from that origin.

To resolve this, you should avoid calling the API from the frontend. Instead, implement a backend service (wrapper) that will handle the API request securely. Your frontend should communicate with your backend, which in turn will call the external API and return the response to the frontend.

This approach not only avoids CORS issues but also enhances security and better manages authentication tokens.

---

### FETCH WAYBILL API

#### Q1. What is the Fetch Waybill API?

The Fetch Waybill API generates a list of waybills in advance. These waybills can be stored and used later in the Order Creation / Manifestation API.

#### Q2. What are the limitations of the Fetch Waybill API?

- You can fetch a maximum of 10,000 waybills per request.
- You can fetch a maximum of 50,000 waybills every 5 minutes.
- If you exceed these limits, your IP address will be throttled for the next 1 minute.

> **Note:** If you fetch more than 25 waybills, they cannot be used immediately. Store these waybills in advance in your database. Use the stored waybills later with the Manifestation API while manifesting the shipment. Attempting to use the same waybills immediately will result in an error: "Unable to consume waybill for your account."

#### Common Remarks

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Getting below error while trying to Execute the Fetch waybill API:"Bad Request! Invalid count for client Test". | The Value that you are passing under the 'count' parameter does not seem to be the correct one. | Please pass the correct Integer Value for the "count" parameter in API and test after that. |
| Getting the error "Bad Request! Count value should be less than 10000" | This error arises when the count passed in the payload is more than 10000 | Make sure the count is not more than 10,000 as the its the highest number of waybill you can fetch in one go from the bulk waybill api |

---

### CREATE & UPDATE WAREHOUSE

#### Q1. Is using the Warehouse Creation API mandatory?

No, using the Warehouse Creation API is not mandatory. If you prefer not to use the API, you can contact your Delhivery Business SPOC, and they will arrange for a warehouse to be created manually by our internal team on your behalf.

Alternatively, you can create the warehouse yourself by logging into your Delhivery One Panel.

#### Common Remarks

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Getting below Error while trying to execute the Warehouse creation API "Error in serviceability: ****** is not a valid Pincode". | This error comes when we do not pass Valid and Serviceable Pincode. | Please pass a valid 6-digit serviceable PIN code and execute the API after that. |
| Getting the error "warehouse does not exists" | This error comes when the the warehouse name you are passing is incorrect. | Please pass the correct warehouse name. |
| Getting the error "Error in serviceability: Pincode doesn't exist in system" | This pincode is not in our database system. | Please pass a valid 6 digit pincode. |
| Getting the error "Error in serviceability: ***** is not a valid Pincode" | This error comes when the pincode is not valid. | Please pass a valid 6 digit pincode. |
| Getting the error "Error due to serviceability for pincode: 100008" | The error comes when the pincode is not serviceable. | Please pass another pincode. |

---

### Pickup Request Creation API

#### Q1. Is using the Pickup Request API mandatory?

Yes, submitting a pickup request is mandatory, as we need to be informed when a pickup is required. You can create a pickup request using the Pickup Request Creation API or by emailing your Business SPOC, who will arrange for the pickup request to be created manually.

If you have daily scheduled pickups, you can request your SPOC to set up an automatic pickup request on a daily basis.

#### Q2. Is the Pickup Request API required for reverse pickup shipments?

No, pickup requests for reverse shipments are scheduled automatically. There is no need to create pickup requests manually for reverse pickups.

#### Q3. What is "pickup_location" in the API payload?

In the API payload, "pickup_location" refers to the exact name of the warehouse that you have created using our Warehouse Creation API or that has been created manually through your Business SPOC.

#### Q4. How can we identify whether the pickup request has been completed or processed?

A pickup request is considered complete when a Field Executive (FE) arrives at the pickup location and collects the shipments. The FE will mark the pickup request as complete on their device.

#### Q5. Are there any available time slots provided by Delhivery for the Pickup Request Creation API?

Pickup requests should be scheduled within working hours. Each pickup request has a designated time slot (start and end time) during which the Field Executive (FE) will complete the pickup.

#### Common Remarks

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Getting the error: A Pickup Request **** for this Pickup Location Already Exist. | This means a Pickup request is already raised in the mentioned Pickup_location. | You cannot raise another Pincup Request for a Pickup_location until the Previous PUR has been completed. |
| Getting the error "There has been an error but we were asked to not let you see that. Please contact the dev team." | It seems the Token which you are trying to use is associated with your Production account Or Vice Versa. | Please use the correct token associated with the same Environment and test after that. |
| Getting the error "pickup_date": "Pickup date cannot be in past" | The pickup date is older than the current date. | Pickup date should be the future date. |
| Getting the error "Wrong/Inactive center for this warehouse" | Pickup location passed in the payload is incorrect or the pickup center associate with the warehouse name is inactive. | Pass the correct and the active warehouse name. |
| Getting the error "Invalid Pickup Location ClientWarehouse matching query does not exist." | Pickup location passed in the payload is incorrect or the pickup center associate with the warehouse name is inactive. | Pass the correct and the active warehouse name. |
| Getting the error "Pickup date should not be more than 7 days from pickup creation date" | The pickup date you passed in the payload is more than a week from the pickup creation date(date on which you are triggering the api). | Please pass the date within the next 7 days to successfully create the PUR. |
| Getting the error "Client is on auto pickup and please raise a ticket to firstmile_servicing@delhivery.com" | This error means that the auto pickup is enabled for your acount, you don't need to raise a pickup request. | Don't need to use the pickup request api. |

#### Q6. Do we need to create a pickup request after creating every shipment?

No, you don't need to create a pickup request after every shipment. Pickup requests are generated against the warehouse, not individual waybill numbers. If a pickup request has already been generated for a warehouse, the field executive (FE) will pick up all ready-to-ship orders from that location, regardless of the expected count passed in the request. However, it is recommended to provide a number close to the actual count so the FE can be prepared accordingly.

---

### Package Slip Creation API

#### Q1. Is it mandatory to use the Delhivery Package Slip API?

No, it is not mandatory to use the Delhivery Package Slip API. You can create your own package slip, but you should validate it with Delhivery to ensure that all required information is included. The API response is provided in JSON format, which you can customize and embed into HTML on your side. Additionally, Delhivery provides a Package Slip API that allows you to directly generate a shipping label in PDF format.

#### Q2. Do we need to create a packing slip for return items?

No, it is not required.

#### Q3. Does Package Slip API provide a PDF of the packing slip?

No, the API provides the response in JSON format, which you can convert into a PDF on your end. If you need a PDF label directly, you can include an additional parameter, pdf=True, in the Label API request.

Alternatively, we have an API that directly generates a PDF link for the packing slip.

Please refer to the API documentation below for details:

```shell
curl --location --request GET 'https://express-dev-test.delhivery.com/api/p/packing_slip?wbns=xxxxxxxxxxx&pdf=True'
--header 'Authorization: Token xxxxxxxxxxxxxxxxxx'
--header 'Content-Type: application/json'
```

#### Common Remarks

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Getting below error while trying to Execute the Package SLIP API. { "packages": [], "packages_found": 0 } | This means the Waybill that you are using is Incorrect OR has not been Manifested Yet. | Please pass a valid Manifested Waybill under "wbns" field and execute the API after that. |

#### Q4. Can we fetch multiple labels in a single request?

No, each label must be fetched through a separate API request. The system does not support retrieving multiple labels in a single request.

---

### TRACK SHIPMENT API

#### Q1. How can we track our order?

You can track your order using the Order Tracking API. This will be a pull request.

#### Q2. Can multiple AWBs be tracked in a single API request?

Yes, you can track multiple AWBs in a single API request. You can pass up to 50 waybills (comma-separated) in one request. Additionally, you can make up to 750 requests per 5 minutes. Therefore, in 5 minutes, you can track up to 50 * 750 = 37,500 shipments.

#### Q3. Is there any other way to get the tracking information?

Yes, you can avail our Scan Push (Webhook) feature. You will need to provide your API endpoint, header if any and we will push each scan detail to the endpoint you specify.

#### Common Remarks

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Getting the error "Data does not exists for provided Waybill(s)" while trying to execute the Tracking API. | This means the waybill you are trying to track has not been manifested yet or is not associated with the account whose token you are using in this API. | Please use a valid waybill manifested from the same account. |
| Getting the error "No such waybill or order ID found". | This error comes when you do not use Waybill and Token generated from the same account. | Please use Token and Waybill generated from the same account and test after that. |
| Getting the Error "403 Forbidden" | This error comes when the ip you are using to track the shipment has been blocked due to the violation of the rate limit. | Pause sending requests and wait for at least 30 seconds until the AWS WAF check runs again. Ensure your request rate stays below 750 requests in any 5-minute window by implementing throttling or batching to avoid future 403 errors. |

---

### TAKE NDR ACTION API

#### Q1. Can we use the NDR Edit API to update the details?

Please avoid using the NDR API to edit or update shipment details. Instead, use the Edit API of Manifestation to update the shipment details.

#### Common Remarks

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Getting the error "Package in incorrect status" while trying to check the Status using NDR Status API | This means you are trying to apply the NDR on the shipment that is not in correct Status. | To Apply NDR Reattempt the package should be in below status: "RE-ATTEMPT" action can be taken on the AWB if AWB is in Pending State and also the current NSL code for the shipment is in the given list ["EOD-74", "EOD-15", "EOD-104", "EOD-43", "EOD-86", "EOD-11", "EOD-69","EOD-6"]. |
| Invalid data provided | The "data" field in the payload is not in list format. | Ensure the payload format is correct. Refer to the API Postman collection for the correct payload structure. |
| Can not update more than 1000 records | The "data" list contains more than 1000 items. | A maximum of 1000 shipments can be updated in a single API call. Split the request into multiple calls if needed. |
| Unauthorized client/user | The user is not authorized. | Verify that you are using the correct authorization token. |
| Package action is being performed | The request is currently being processed. | The request is in progress. Please check again after some time. |
| Action is not valid | The "act" field does not contain "PICKUP_RESCHEDULE". | Ensure that the action is set to "PICKUP_RESCHEDULE" in the request payload. |
| "waybill" is missing | The "waybill" field is missing in the "data" payload. | The "waybill" key is mandatory. Include it in the payload before making the request. |
| Package should be in Canceled status | "PICKUP_RESCHEDULE" is allowed only for canceled shipments. | The package status should be CN and the shipment status should be "Canceled" while applying "PICKUP_RESCHEDULE". |
| Shipment has reached max attempt count | "PICKUP_RESCHEDULE" is allowed only if the shipment attempt count is 1 or 2. | Contact your Delhivery account POC if "PICKUP_RESCHEDULE" is required for this shipment. |
| Incorrect waybill | The provided waybill does not match the client's account. | Verify that the waybill is correct before applying "PICKUP_RESCHEDULE". |
| Package is part of dispatch. Cannot update the information now | "PICKUP_RESCHEDULE" is not allowed as the shipment is part of an open dispatch. | Try again later or contact your Delhivery account POC to process "PICKUP_RESCHEDULE" for this shipment. |
| Rescheduling is not allowed as <Reason> | The package does not meet the conditions for a "PICKUP_RESCHEDULE" request. | "PICKUP_RESCHEDULE" is allowed only when the package has the current NSL as "EOD-777 (RVP QC Fail)" or "EOD-21 (Pickup request canceled)", where "EOD-21" must be non-OTP verified. |

---

### CALCULATE SHIPPING COST API

#### Q1. Why am I getting 0 amount in the staging environment while using the Invoice shipping charge API?

Since we do not store the charges in our staging environment, hence no charges would come in the response. It is recommended to use the Invoice shipping charge API directly in the production environment to view the charges.

#### Q2. Why am I getting 0 amount in the production environment while using the Invoice Shipping charge API even though all the parameters are passed correctly?

Please pass an additional parameter in the API, "pt" where the payment mode will be passed. It can be either "Pre-paid" or "COD". Refer to the sample curl:

```shell
curl --location --request GET 'https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=S&ss=Delivered&d_pin=122002&o_pin=110017&cgm=1500&pt=Pre-paid' \
--header 'Authorization: Token xxxxxxxxxxxxxxxxxxxxxxx'
```

#### Common Remarks

| Error Remarks | Reason | Solution |
|---------------|--------|----------|
| Getting the "error": "Unable to process request for provided o_pin" | The error comes when you have passed the incorrect o_pin | Please pass a valid o_pin |
| Getting the "error": "ss is mandatory field and possible values can be Delivered,RTO,DTO" | The error comes when you have passed the incorrect value for ss | Please pass a valid value for ss and the possible values are Delivered,RTO,DTO |
| Getting the "error": "md is mandatory field and possible values can be S,E" | The error comes when you have passed the incorrect value for md | Please pass a valid value for md and the possible values are S,E |
| Getting the "error": "Unable to process request, Please contact: lastmile-integration@delhivery.com" | The error comes when you have passed the incorrect d_pin | Please pass a valid d_pin |

---

### Webhook Integration

#### Q1. How to identify whether a shipment is moving forward or in reverse?

You can determine the shipment direction using the "ScanType" field in the tracking data.

- **UD (Undelivered)** indicates that the shipment is moving in the forward direction.
- **RT (Return)** indicates that the shipment is moving in the reverse direction.

#### Q2. What is NSL?

NSL stands for Net Service Level. It is a unique alphanumeric code assigned to each status applied to a shipment, helping you track the shipment at a more granular level.

Since there can be multiple NSLs representing similar states (e.g., 10 different NSLs for "in transit"), exposing all of them to end customers may create confusion. It's recommended to create your own simplified status mapping—grouping similar NSLs under broader categories like "In Transit", "Out for Delivery" , etc.—to ensure a cleaner and more understandable tracking experience for your users.

#### Q3. What is the significance of each key in the default payload?

```json
"Shipment": {
  "Status": {
    "Status": "Manifested",
    // Current status of the shipment
    "StatusDateTime": "2019-01-09T17:10:42.767",
    // Timestamp when the status was marked
    "StatusType": "UD",
    // Type of status (e.g., UD = forward, RT = reverse)
    "StatusLocation": "Chandigarh_Raiprkln_C (Chandigarh)",
    // Location where the status was updated
    "Instructions": "Manifest uploaded"
    // Description or remark associated with the NSL
  },
  "PickUpDate": "2019-01-09 17:10:42.543",
  // Scheduled pickup date of the shipment
  "NSLCode": "X-UCI",
  // NSL (Net Service Level) code applied to the shipment
  "Sortcode": "IXC/MDP",
  // Internal sorting code (can be ignored)
  "ReferenceNo": "28",
  // Order ID provided at the time of order creation
  "AWB": "XXXXXXXXXXXX"
  // Air Waybill (AWB) number assigned to the shipment
}
```

#### Q4. Can a missed scan be re-pushed?

In case a scan push fails, the system automatically retries immediately. If the retry also fails, that particular scan cannot be pushed again manually. However, when the shipment progresses and a new status update occurs, the latest scan will be pushed.

For any missed scans, you will need to use the Track API to retrieve the current status, as manual re-push is not supported. This applies for all the webhooks ( EPOD, Sorter Image, QC Images & LM_POD ).

---

## API Integration Related General FAQ's

### Q1. Does the authorization token for any API provided ever expire? How/when do we get one for the production environment?

The authorization token is static and does not expire. This token is for a lifetime. For the production environment, you will get a separate authorization token, once your testing phase gets completed. The process will remain the same for getting the live Token key. You need to reach out to your business SPOC once testing is done successfully

### Q2. Are the tokens the same across all APIs (Package order creation, order tracking API, packing Slip API)?

Yes, the token remains constant for all API's, till there is a switch in environments (Testing/Production) as the token will be different for testing and production environment

### Q3. Do we need to perform a check for the serviceability API before we call the Package Order creation API?

Yes, this is a mandatory and recommended task for every shipment for Delhivery. So if the pin-code is not serviceable then there is no point in creating order in our system as that will be marked as NSZ-Non serviceable and will be returned back.

### Q4. We have very few orders say 500-1000 per day so instead of integrating through API's can we ship any other way and use all API service through any frontend?

Yes, we have a Client panel (name as Delhivery one Panel) where the clients can log-in and create packages in single/bulk fashion in one go. They can track the shipments, generate packing slip, see COD remittance details so all API tasks can be done directly through the front-end.

Please refer below URL to Login Into the Delhivery One Panel:
https://one.delhivery.com/login

### Q5. What is the use of pickup location? If I have multiple sellers across, how can I get pickup locations created against all the sellers?

The pickup location, in other words, is a warehouse name. This holds the details of the warehouse (pickup location) from where the order has to be picked up. In order to do that, you have to register the seller details and our team will store those details against your client ID and will share a pickup location against that. Once registered you can use that pick-up location while creating an order.

### Q6. Created a shipment through the API Playground, but I am unable to track it using my staging token. Why is that?

The API Playground operates within a separate staging environment, and you can create as many test shipments as needed there. However, please note that any shipment created through the Playground is intended to be tracked within the Playground itself.

Tracking these shipments using your own staging token may not work, as the staging account configured in the API Playground could be different from the one provided to you by the Business Development (BD) team.

---

## IMPORTANT NOTE

Kindly reach out to < lastmile-integration@delhivery.com > for API-related queries and keep your Delhivery business account POC in the loop.

Connect with your respective Delhivery business account POC for Account , Billing, OR Operation related queries.