# Delhivery B2C API Documentation

## Overview

This section provides an overview of the Delhivery B2C API, enabling seamless integration for business-to-consumer logistics solutions.

Welcome to the Delhivery B2C Transportation API Documentation!

Our API suite is designed to provide businesses with reliable, efficient logistics solutions for consumer deliveries. With our APIs, you can integrate directly with Delhivery's platform to manage your entire shipping process—from order placement to delivery.

### Delhivery Transportation Process Overview

Our logistics process for B2C shipments includes First-mile pickup, Mid-Mile connectivity, and Last-mile delivery:

- **First-Mile Pickup:** We collect shipments from your warehouse or designated location, ensuring timely pickups to initiate the delivery process.
- **Mid-Mile Connectivity:** Shipments are transported through Delhivery's network to our distribution centers for sorting and consolidation, optimizing routes for cost-effective delivery.
- **Last-Mile Delivery:** The shipment is delivered to the consumer's doorstep via our extensive delivery network, ensuring fast and secure delivery.

### Who Can Use The APIs?

These APIs are tailored for e-commerce platforms, retailers, and businesses that need efficient and automated management of consumer deliveries. They are ideal for businesses handling high volumes of shipments across various regions.

### Why Use Delhivery B2C APIs?

- **Interoperability:** Seamless data exchange between systems, regardless of the technology used.
- **Efficiency:** Automated processes that reduce manual work and improve overall efficiency.
- **Scalability:** Capable of handling increased shipment volumes without major infrastructure changes.
- **Flexibility:** Easily adaptable to changing business needs and processes.
- **Cost-Effectiveness:** Reduced development costs through reusable services.
- **Security:** Strong authentication and data protection protocols for secure operations.
- **End-to-End Solutions:** Coverage of the entire logistics journey, from pickup to delivery.

### What to Expect in This Document?

This documentation provides a complete guide to integrating with Delhivery B2C APIs, including:

- **Terminology:** Definitions of key terms related to B2C logistics.
- **Integration Steps:** A step-by-step guide to integrating the APIs with your system.
- **Key APIs:** Detailed descriptions of available APIs, including shipment creation, tracking, and delivery endpoints.

---

## Common Used Terminologies

This section explains commonly used terminologies to help you navigate Delhivery's B2C API documentation with ease.

It provides a glossary of key terms and abbreviations frequently encountered in Delhivery's B2C Transportation API documentation. To ensure clear communication and understanding when integrating with Delhivery's system, below is a list of commonly used terms in API references, along with their descriptions.

| Terminology | Description |
|-------------|-------------|
| **Waybill** | Waybill number refers to the tracking number which is unique for each physical box. |
| **Master waybill** | In the B2C MPS order, one waybill is considered a master waybill, and the remaining are considered child waybills. |
| **E-Waybiill** | An E-waybill is an electronic document required in India for the movement of goods under GST, containing shipment details for tax compliance. this is required for the shipments having invoice value >50k. |
| **Pickup location** | The pickup location is the client's warehouse location from where the shipments will be picked up by the Delhivery FE |
| **API token** | The API token is an authentication token to authenticate the API requests. For B2C, this is a static token |
| **POD** | A document or electronic confirmation that the consignee received the shipment. It can be a signature, image, or other form of proof. |
| **MPS** | Multi-Piece Shipment |
| **HQ Name** | Delhivery Registered Account Name |

---

## Package Lifecycle

This section outlines the package lifecycle for B2C shipments, detailing each stage of a shipment's journey within Delhivery's logistics network.

In the context of B2C logistics, the package lifecycle captures the series of stages a shipment goes through from order creation to successful delivery or potential return. Each stage in this lifecycle is crucial to ensuring efficient, secure, and timely delivery for individual consumers.

Once a package is created in the Delhivery system (either via the Manifest API or the Delhivery ONE Panel), it enters a standardized package cycle to reach its end destination. The B2C package lifecycle offers visibility into each phase, allowing businesses and consumers alike to monitor shipments in real time for transparency and accuracy.

### B2C Package Lifecycle Journey Types

#### Forward Journey

Picking up products from client warehouses and delivering them to end customer or back to the origin.

| Status Type | Status | Description |
|-------------|--------|-------------|
| UD | Manifested | When forward shipment's soft data is API pushed/manually uploaded to HQ from client's system |
| UD | Not Picked | When Shipment is not physically Picked up from Client's Warehouse |
| UD | In Transit | When a forward consignment is in transit to its DC after physical pick up |
| UD | Pending | When a forward shipment has reached DC but not yet dispatched for delivery |
| UD | Dispatched | When a forward shipment is dispatched for delivery to end customer |
| DL | Delivered | When a forward shipment is accepted by the end customer |

In the forward shipment, when the shipment is either cancelled by the client/seller in the journey

| Status Type | Status | Description |
|-------------|--------|-------------|
| RT | In Transit | When forward shipment is converted in to Return shipment after unsucessfull delivery/client's Instruction/adhoc requests or conditions's system |
| RT | Pending | When a shipment has reached DC nearest to Origin center. |
| RT | Dispatched | When a shipment has reached DC nearest to Origin center and dispatched for delivery |
| DL | RTO | When a forward shipment is returned to Origin |

This journey begins when the shipment is picked up from the seller's location or warehouse and progresses toward the consumer's doorstep. Multiple phases mark this journey, including first-mile pickup, transit, and last-mile delivery. Delhivery's tracking system ensures that each stage is accurately logged, with real-time updates on the package's status to keep the consumer informed.

#### Return Journey

If a shipment cannot be delivered—due to factors like an incorrect address, recipient unavailability, or order cancellation—the package enters the return journey. This involves rerouting the package back to the seller's warehouse or a designated return center, ensuring careful handling and visibility through each phase.

#### Reverse

This journey is initiated when a shipment needs to be collected from the consignee, usually when a customer initiates a return request. It follows a similar process to the forward journey, including first-mile pickup, mid-mile transit, and final delivery back to the seller's warehouse or returns facility. Delhivery's tracking system ensures visibility at every stage, providing updates on the package's status throughout the return process.

The different status and status types which is applied to a package when picking up shipments from customer location and delivering it to client warehouse.

| Status Type | Status | Description |
|-------------|--------|-------------|
| UD | Manifested | When forward shipment's soft data is API pushed/manually uploaded to HQ from client's system |
| UD | Not Picked | When Shipment is not physically Picked up from Client's Warehouse |
| UD | In Transit | When a forward consignment is in transit to its DC after physical pick up |
| UD | Pending | When a forward shipment has reached DC but not yet dispatched for delivery |
| UD | Dispatched | When a forward shipment is dispatched for delivery to end customer |
| DL | Delivered | When a forward shipment is accepted by the end customer |

#### Replacement / Buyback

This journey begins when a customer initiates a replacement request with the client, prompting the client to create a replacement order via the order creation API. The process involves picking up the original shipment from the client location for delivery to the end customer, while simultaneously retrieving the replacement shipment from the customer and returning it to the client. This shipment's life cycle includes both forward and reverse flows, ensuring end-to-end tracking and visibility throughout.

### Key Stages in a B2C Package Lifecycle

- **Order Creation:** The journey starts when a shipment order is created in Delhivery's system via API or the Delhivery ONE Panel.
- **First-Mile Pickup:** Delhivery's team picks up the package from the seller's warehouse or designated pickup location.
- **Mid-Mile Transit:** The package moves through various hubs within Delhivery's network as it heads toward the delivery city.
- **Last-Mile Delivery:** The final step in the forward journey, where the package is delivered directly to the consumer..
- **Return Process (if applicable):** If delivery fails, the package enters the return journey, passing through similar transit phases back to the origin.
- **Lost:** In cases when the shipment is lost during transit.

### Payment Modes for B2C Orders

For Delhivery's B2C shipments, the following four payment methods are available:

- **Prepaid:**  The consignee pays for the order upfront at the time of purchase
- **Cash on Delivery (COD):**  The consignee pays for the shipment upon delivery.
- **Pickup:**  This payment mode is specifically for the Reverse shipments (RVP), where the shipment is picked up from the consignee and shipped back to the seller's warehouse or pickup location
- **Replacement (REPL):**  When a customer requests a replacement from the client, leading to the creation of a new order through the order creation API, the REPL Payment method is used.

Throughout the package lifecycle, Delhivery provides end-to-end visibility into each stage, ensuring that both businesses and consumers can track and manage their orders effectively. From order creation to final delivery, or return if necessary, Delhivery's comprehensive package lifecycle management guarantees a reliable and transparent process, tailored for B2C needs.

---

## Steps of Integration for B2C Shipments

This guide outlines the steps to integrate with Delhivery's B2C API for efficient logistics management.

### 1. API Keys

Obtain your API key either from your Delhivery account point of contact (POC) or by logging into the One Panel. Navigate to: Settings > API Setup > Existing API Token > View/Copy

### 2. Fetch Waybill

Use the Bulk Waybill API to fetch waybill numbers in advance, required only where orders creation is required with pre-assigned waybills

### 3. Serviceability and TAT

Before creating shipments, check the serviceability of the pincode using the Pincode Serviceability API. Use the TAT API to get the estimated TAT between the origin and destination pincode pair.

### 4. Warehouse Setup

Register your warehouse or pickup location using the Warehouse Creation API. For any updates, use the Warehouse Updation API.

### 5. Shipping Cost Calculation

Get the estimated shipping charges using the Shipping Cost API.

### 6. Shipment Creation

Create the shipments using the Shipment Creation API.

### 7. Shipment Update and Cancellation

If needed, update shipment details using the Shipment Update API. To cancel the shipment, use the Shipment Cancellation API before the shipment is dispatched.

### 8. Pickup Request Creation

Create a pickup request for the Delhivery operations team using the PUR Creation API.

### 9. Shipping Label Generation

Generate a shipping label using the Shipping Label API.

### 10. Shipment Tracking

Track the shipment statuses using the Track API.

### 11. Download Document

Download the relevant documents using Document Download API , like POD's, QC images, etc

---

## API Reference

### B2C Pincode Serviceability

This API provides the serviceability of the consignee's pin code.

This API will provide visibility on whether a Pincode is serviceable or not.

- If any pin code is serviceable only then order creation or any further API needs to be used.
- If the API response is an empty list, the pincode is non-serviceable (NSZ).
- If filter_code is not passed, the API returns both serviceable and embargoed pincodes.
- In the response, remark as "Embargo" indicates temporary NSZ, while a blank remark means the pincode is serviceable.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| filter_codes<br>Integer | false | Pincodes for which the serviceability needs to be checked, pass one pincode at a time. |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 86.02ms |
| P99 Latency (PRODUCTION) | 98.22ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 4500 |

#### Request

```shell
curl --request GET \
	--url 'https://staging-express.delhivery.com/c/api/pin-codes/json/?filter_codes=194103' \
	--header 'Authorization: Token xxxxxxxxxxxxxxxx'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/c/api/pin-codes/json/?filter_codes=pin_code
```

**Production Environment URL**
```
https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=pin_code
```

---

### Heavy Product Type Pincode Serviceability API

This API provides the serviceability of the pincode for heavy shipments.

The Heavy pincode serviceability API is used to validate whether the pincodes are serviceable for the clients having product type Heavy, in Delhivery's network.

- "NSZ" response for a PIN code would mean that the PIN code is not serviceable.
- The payment_type in the response indicates whether the Pincode is serviceable or not for that Payment mode.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| pincode<br>Integer | true | Pincode for which the serviceability needs to be checked, pass one pincode at a time |
| product_type<br>Varchar | true | Product_type stands for the Product Type of the account,pass Heavy |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 75.89ms |
| P99 Latency (PRODUCTION) | 77.77ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 3000 |

---

### Expected TAT API

This API provides the estimated TAT between the origin and destination pin code.

This API lets you query for TAT by providing the origin and destination PIN before an order is placed. This will provide the number of days in response.

- The TAT begins from the moment the shipment is handed over to Delhivery.
- The TAT provided is determined by the current network performance and may vary based on persistent delays in certain lanes. Similarly, our current network TAT may be faster than our promised TAT to you at the time of onboarding.
- Different lanes may have unique cutoffs, which can affect expected delivery times.
- If the expected delivery date falls on a holiday or Sunday, it will be adjusted to the next non-holiday.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| origin_pin<br>String | true | The pin code of the shipment's origin location. |
| destination_pin<br>String | true | The pin code of the shipment's destination location. |
| mot<br>String | true | Mode of Transport: 'S' for Surface, 'E' for Express, 'N' for NDD (Next Day Delivery). |
| pdt<br>String | false | Product Type: 'B2B', 'B2C', or empty (defaults to B2C if not provided). |
| expected_pickup_date<br>String | false | Datetime when pickup will be done. Based on this date, the response will show an expected delivery date considering the TAT and holidays in between.<br><br>Format for this payload is "YYYY-MM-DD HH:mm" |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 158.41ms |
| P99 Latency (PRODUCTION) | 366.49ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 750 |

#### Request

```shell
curl --request GET \
	--url 'https://express-dev-test.delhivery.com/api/dc/expected_tat?origin_pin=122003&destination_pin=136118&mot=S&pdt=B2C&expected_pickup_date=2024-05-31' \
	--header 'Accept: application/json' \
	--header 'Authorization: Token ********' \
	--header 'Content-Type: application/json'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/dc/expected_tat?origin_pin=122003&destination_pin=136118&mot=S
```

**Production Environment URL**
```
https://track.delhivery.com/api/dc/expected_tat?origin_pin=122003&destination_pin=136118&mot=S
```

---

### Fetch WayBill

This API is used to generate the bulk waybill list in advance, which can be stored and used in the order creation API.

The Bulk Waybill API generates waybills in bulk, which can be used during shipment manifestation or creation.

- Up to 10,000 waybills in a single request can be fetched using this API and can be stored in the database for later use in the shipment manifestation.
- A maximum of 50,000 waybills can be fetched within a 5-minute window. Exceeding this limit will result in your IP being throttled for 1 minute.

> **Note:** Waybills are generated in batches of 25 at the backend. Using them immediately after fetching may occasionally result in errors, so we recommend storing them on your end and using them later during manifest creation.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| count<br>Integer | true | Number of waybills you want to fetch; Should not be more than 10,000 |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 129.84ms |
| P99 Latency (PRODUCTION) | 154.02ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 5 |

#### Request

```shell
curl --request GET \
	--url 'https://staging-express.delhivery.com/waybill/api/bulk/json/?token=xxxxxxxxxxxxxxxx&count=5' \
	--header 'Accept: application/json'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/waybill/api/bulk/json/?count=count
```

**Production Environment URL**
```
https://track.delhivery.com/waybill/api/bulk/json/?count=count
```

---

### Fetch Single WayBill API

Fetch waybill API helps to fetch a single waybill at a time, every time the API is hit.

The Fetch Waybill API generates a single waybill at a time

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| token<br>String | true | Pass the account token |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 69.84ms |
| P99 Latency (PRODUCTION) | 94.02ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 750 |

#### Request

```shell
curl --request GET \
	--url 'https://staging-express.delhivery.com/waybill/api/fetch/json/?token=xxxxxxxxxxxxxxxx' \
	--header 'Accept: application/json'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/waybill/api/fetch/json/
```

**Production Environment URL**
```
https://track.delhivery.com/waybill/api/fetch/json/
```

---

### Shipment Creation

This API is used to generate a B2C shipment in the Delhivery system.

The order creation process is the same for both forward flow (from client warehouse to end customer) and reverse flow (from customer to client warehouse), differing only in the payment_mode key:

- **Pickup** for reverse packages
- **COD or Prepaid** for forward packages
- **REPL** for replacement Shipments

**Single Piece Shipment:** One waybill represents a package that can contain multiple items (e.g., an order with t-shirts, shoes, and shampoo packed together).

**Multi Piece Shipment:** Contains multiple boxes within one order. Each box should have its own waybill number.

> **Important:**
> - The Order ID must be unique for each new order
> - The raw JSON body does not accept special characters: "&", "#", "%", ";", "\". Use URL-encoded payloads instead.
> - Try to include all fields mentioned in the sample payload, even if they are not mandatory. These fields are considered good to have for optimal processing

#### Key Changes in Order Creation for RVP

- Set the payment mode as "Pickup" in the manifest payload.
- When "Pickup" is used as the payment mode, the customer information will be treated as the pickup location. The return_add and other return-related fields will be used to define the drop/delivery address.
- If both a return address and a pickup location are provided for a pickup shipment, the system will prioritize the return address, and the shipment will be delivered there.

#### Key Changes in Order Creation for REPL

- Set the payment mode as "REPL" in the manifest payload.
- A single waybill will be generated, and the entire exchange journey will be executed using this one waybill.
- The pickup location will serve as the pickup address, customer address as exchange location and return address will be treated as the final delivery address for the REPL shipment after successful exchange.
- If the return address is not provided, the pickup location will be used as the final delivery address for the exchange shipment.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| name<br>string | true | Name of the consignee |
| order<br>string | True | Order ID |
| phone<br>list | True | Consignee phone number |
| add<br>string | True | Address of the consignee |
| pin<br>integer | True | Pincode of the consignee |
| address_type<br>string | False | Address type (home/office) |
| ewbn<br>string | False | Ewaybill number (for packages ≥ 50k) |
| hsn_code<br>string | False | HSN Code for e-waybill; more than one HSN can be passed if the quantity is > 1. |
| shipping_mode<br>string | False | Shipping mode (Surface/Express) |
| seller_inv<br>string | False | Seller invoice |
| city<br>string | False | City of the consignee |
| weight<br>float | False | Weight of the shipment (gms) |
| return_name<br>string | False | Return name |
| return_address<br>string | False | Return address |
| return_city<br>string | False | Return city |
| return_phone<br>list | False | Return phone number |
| return_state<br>string | False | Return state |
| return_country<br>string | False | Return country |
| return_pin<br>integer | False | Return pincode |
| seller_name<br>string | False | Seller name |
| fragile_shipment<br>boolean | False | Indicates if the shipment contains fragile items (true/false) |
| shipment_height<br>float | False | Height of the shipment (cm) |
| shipment_width<br>float | False | Width of the shipment (cm) |
| shipment_length<br>float | False | Length of the shipment (cm) |
| cod_amount<br>float | False | Cash on Delivery (COD) amount |
| products_desc<br>string | False | Product Description |
| state<br>string | False | State of the consignee (e.g., Rajasthan) |
| dangerous_good<br>boolean | False | Dangerous goods flag (true/false) |
| waybill<br>string | False | SPS: Waybill can be passed in the payload or can be skipped as well. MPS: Waybill needs to be passed for each box explicitly in the API. |
| total_amount<br>float | False | Total amount |
| seller_add<br>string | False | Seller address |
| country<br>string | False | Country (mandatory for Bangladesh, 'BD' value) |
| plastic_packaging<br>boolean | False | Plastic packaging flag (true/false) |
| quantity<br>string | False | Quantity |
| pickup_location<br>string | True | Name should be exactly the same as the name of the WH registered. It is case/space sensitive. |
| transport_speed<br>string | False | By passing the transport_speed field in the manifest request, you can choose:<br>F – Next Day Delivery (NDD)<br>OR<br>D – Standard delivery (regular TAT) |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 283.57ms |
| P99 Latency (PRODUCTION) | 1.59s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | |

#### Request

```shell
curl --request POST \
	--url https://staging-express.delhivery.com/api/cmu/create.json \
	--header 'Accept: application/json' \
	--header 'Authorization: Token XXXXXXXXXXXXXXXXX' \
	--header 'Content-Type: application/json' \
	--data 'format=json&data={
  "shipments": [
    {
      "name": "Consignee name",
      "add": "Huda Market, Haryana",
      "pin": "110042",
      "city": "Gurugram",
      "state": "Haryana",
      "country": "India",
      "phone": "9999999999",
      "order": "Test Order 01",
      "payment_mode": "Prepaid",
      "return_pin": "",
      "return_city": "",
      "return_phone": "",
      "return_add": "",
      "return_state": "",
      "return_country": "",
      "products_desc": "",
      "hsn_code": "",
      "cod_amount": "",
      "order_date": null,
      "total_amount": "",
      "seller_add": "",
      "seller_name": "",
      "seller_inv": "",
      "quantity": "",
      "waybill": "",
      "shipment_width": "100",
      "shipment_height": "100",
      "weight": "",
      "shipping_mode": "Surface",
      "address_type": ""
    }
  ],
  "pickup_location": {
    "name": "warehouse_name"
  }
}'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/cmu/create.json
```

**Production Environment URL**
```
https://track.delhivery.com/api/cmu/create.json
```

---

### MPS Manifestation

MPS (Multi-Package Shipment) refers to a single order shipped in multiple boxes. Each box is assigned a unique waybill number, with one designated as the master waybill and the others as child waybills.

The manifest payload for MPS shipments is similar to non-MPS, with the addition of specific MPS-related keys mentioned below

- Prefetched waybills are mandatory for MPS shipments and must be included in the manifest payload.
- For an MPS order with N boxes, include details of all N boxes within the shipments array; the sample payload illustrates a 2-box MPS example.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| mps_amount<br>Integer | true | Sum of all package amounts for cod. It will be zero in case of prepaid |
| mps_children<br>Integer | true | It is sum of master and child package |
| master_id<br>Integer | true | This will master waybill and need to be passed with every box |
| shipment_type<br>string | true | Pass MPS for manifestation of an MPS shipment |

#### FAQ

#### Request

```shell
curl --request POST \
	--url https://staging-express.delhivery.com/api/cmu/create.json \
	--header 'Accept: application/json' \
	--header 'Authorization: Token XXXXXXXXXXXXXXXXX' \
	--header 'Content-Type: application/json' \
	--data '
{
  "pickup_location": {
    "name": "warehouse_name"
  },
  "shipments": [
    {
      "order": "123456",
      "weight": "100",
      "mps_amount": "0",
      "mps_children": "2",
      "pin": "122002",
      "products_desc": "Toys, ToyCar",
      "add": "Test Address",
      "shipment_type": "MPS",
      "state": "TAMIL NADU",
      "master_id": "xxxxxxxxxxxxx",
      "city": "CHENNAI",
      "waybill": "xxxxxxxxxxxxx",
      "phone": "9999888800",
      "payment_mode": "Prepaid",
      "name": "Test Name",
      "total_amount": "4250",
      "country": "India"
    },
    {
      "order": "orderiod",
      "weight": "100",
      "mps_amount": "0",
      "mps_children": "2",
      "pin": "600063",
      "products_desc": "product description",
      "add": "Consignee Address",
      "shipment_type": "MPS",
      "state": "TAMIL NADU",
      "master_id": "xxxxxxxxxxxxx",
      "city": "CHENNAI",
      "waybill": "xxxxxxxxxxxxx",
      "phone": "9999888800",
      "payment_mode": "Prepaid",
      "name": "Consignee Naame",
      "total_amount": "4250",
      "country": "India"
    }
  ]
}
'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/cmu/create.json
```

**Production Environment URL**
```
https://track.delhivery.com/api/cmu/create.json
```

---

### Shipment Updation/Edit API

This API helps to edit the shipment details.

Shipment Edit is allowed only on limited package status only

**For Forward Shipment (Payment mode: COD/Prepaid)**, the edit is allowed if the shipment is in the below mentioned statuses:
- Manifested
- In Transit
- Pending

**For RVP shipment (Payment mode: Pickup)**, the edit is allowed if the shipment is in the below mentioned status:
- Scheduled

**For REPL shipment (Payment mode: REPL)**, the edit is allowed if the shipment is in the below mentioned statuses:
- Manifested
- In Transit
- Pending

Edit is not allowed on any Dispatched and Terminal status like Delivered, DTO, RTO, LOST and Closed

Only the parameters specified below can be edited through the Shipment Updation API against waybill

> **Note:** To update the payment mode through the B2C Edit API, below are a few points to keep in mind:
> - COD to Prepaid conversion is allowed.
> - Prepaid to COD conversion is allowed, but the COD amount must be provided.
> - Prepaid to Prepaid and COD to COD conversions are not allowed.
> - Prepaid to Pickup and Pickup to Prepaid conversions are not allowed.
> - COD to Pickup and Pickup to COD conversions are not allowed.
> - Prepaid to REPL and REPL to Prepaid conversions are not allowed.
> - COD to REPL and REPL to COD conversions are not allowed.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| waybill<br>string | true | Waybill for which update is required |
| name<br>string | false | Name of the consignee |
| phone<br>list | false | Consignee phone number |
| pt<br>String | false | Payment mode that needs to be updated |
| add<br>string | false | Address of the consignee |
| products_desc<br>string | false | Product Description |
| weight<br>float | false | Weight of the shipment (gms) |
| shipment_height<br>float | false | Height of the shipment (cm) |
| shipment_width<br>float | false | Width of the shipment (cm) |
| shipment_length<br>float | false | Length of the shipment (cm) |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 153.43ms |
| P99 Latency (PRODUCTION) | 318ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | NA |

#### Request

```shell
curl --request POST \
	--url https://staging-express.delhivery.com/api/p/edit \
	--header 'Accept: application/json' \
	--header 'Authorization: Token XXXXXXXXXXXXXXXXX' \
	--header 'Content-Type: application/json' \
	--data '
{
  "waybill": "843xxxxxxxxx",
  "pt": "COD/Pre-paid",
  "cod": 100,
  "shipment_height": 40,
  "weight": 100
}
'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/p/edit
```

**Production Environment URL**
```
https://track.delhivery.com/api/p/edit
```

---

### Shipment Cancellation

This API allows to cancel the shipment.

Shipment Cancellation is allowed only on a limited package status.

**For Forward Shipment (Payment mode: COD/Prepaid)**, below are the allowed package statuses where cancellation is allowed:
- Manifested
- In Transit
- Pending

**For RVP shipment (Payment mode: Pickup)**, below are the allowed package statuses where cancellation is allowed:
- Scheduled

**For REPL shipment (Payment mode: REPL)**, below are the allowed package statuses where cancellation is allowed:
- Manifested
- In Transit
- Pending

Additional notes:
- If a manifested shipment is canceled before pickup, its status remains Manifested with the status type UD (Undelivered).
- If a shipment in In Transit or Pending state is canceled, the status stays In Transit and the status type changes to RT (Return to Origin).
- If a scheduled shipment is canceled, its status updates to Canceled with the status type CN (Cancellation).

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| waybill<br>String | true | Waybill number of the shipment |
| cancellation<br>String | true | This key needs to be passed as true to cancel a shipment |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 153.43ms |
| P99 Latency (PRODUCTION) | 318ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | NA |

#### Request

```shell
curl --request POST \
	--url https://staging-express.delhivery.com/api/p/edit \
	--header 'Accept: application/json' \
	--header 'Authorization: Token XXXXXXXXXXXXXXXXX' \
	--header 'Content-Type: application/json' \
	--data '
{
  "waybill": "6945XXXXXXXX",
  "cancellation": "true"
}
'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/p/edit
```

**Production Environment URL**
```
https://track.delhivery.com/api/p/edit
```

---

### Ewaybill Update API

This API allows to update the e-waybill of the shipment.

An E-Way Bill is an electronic document (having details such as the goods being transported, their value, the sender, the receiver, and the route.) that is required for the transportation of goods having shipment value>50k as per the Indian government laws.

- Use the EWB update API to update the e-waybill of the shipments having value > 50k
- This API updates the forward E-waybill when the shipment is in the forward flow, and updates the return E-waybill when the shipment is in the return flow.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| dcn<br>Varchar | true | Pass the invoice number |
| ewbn<br>Varchar | true | Pass the ewb (e-waybill) number that needs to be updated |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 327.6ms |
| P99 Latency (PRODUCTION) | 501.68ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | NA |

#### Request

```shell
curl --request PUT \
	--url https://track.delhivery.com/api/rest/ewaybill/XXXXXXXXXXXXX/ \
	--header 'Authorization: Token xxxxxxxxxxxxxxxx' \
	--header 'content-type: application/json' \
	--data '
{
  "data": [
    {
      "dcn": "pass the invoice number",
      "ewbn": "pass the ewb number"
    }
  ]
}
'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/rest/ewaybill/{waybill}/
```

**Production Environment URL**
```
https://track.delhivery.com/api/rest/ewaybill/{waybill}/
```

---

### Shipment Tracking

The API provides the current status and detailed history of scans applied to the shipment.

The track API takes as input as either waybill number or order ID, and returns all the details of the scans applied on the shipment.

Track upto 50 waybills (comma-separated) with a single request

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| waybill<br>String | true | Waybill Number |
| ref_ids<br>String | false | Order_Id |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 130.31ms |
| P99 Latency (PRODUCTION) | 529.15ms |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 750 |

#### Request

```shell
curl --request GET \
	--url 'https://staging-express.delhivery.com/api/v1/packages/json/?waybill=1122345678722&ref_ids=' \
	--header 'Authorization: Token XXXXXXXXXXXXXXXXXX' \
	--header 'Content-Type: application/json'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/v1/packages/json/?waybill=waybill_num&ref_ids=order_id
```

**Production Environment URL**
```
https://track.delhivery.com/api/v1/packages/json/?waybill=waybill_num&ref_ids=order_id
```

---

### Calculate Shipping Cost

This API is used to calculate the Estimated Shipping Charges for the Shipments.

This API provides approximate values for shipping charges, which are subject to change.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| md<br>string | true | Billing Mode of shipment ( E for Express/ S for Surface ). |
| cgm<br>Integer | true | Chargeable weight of the shipment (Only in Grams Unit); Default value is 0 |
| o_pin<br>Integer | true | Pincode of origin city; 6 Digit Valid Pin code |
| d_pin<br>Integer | true | Pincode of destination city; 6 Digit Valid Pin code |
| ss<br>string | true | Status of shipment (Delivered, RTO, DTO) |
| pt<br>String | true | Payment Type ( Pre-paid, COD ) |
| l<br>Integer | false | Length of shipment |
| b<br>Integer | false | Breadth of shipment |
| h<br>Integer | false | Height of shipment |
| ipkg_type<br>String | false | Type of Package (box/flyer) |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 450.94ms |
| P99 Latency (PRODUCTION) | 61.14s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 50 |

#### Request

```shell
curl --request GET \
	--url 'https://staging-express.delhivery.com/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&d_pin=110053&o_pin=110042&cgm=10&pt=Pre-paid' \
	--header 'Authorization: Token XXXXXXXXXXXXXXXXXX' \
	--header 'Content-Type: application/json'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&d_pin=110053&o_pin=110042&cgm=10&pt=Pre-paid
```

**Production Environment URL**
```
https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?md=E&ss=Delivered&d_pin=110053&o_pin=110042&cgm=10&pt=Pre-paid
```

---

### Generate Shipping Label

This API is used to Generate Shipping labels against a waybill number. Shipping labels can also be downloaded from the One Panel.

A custom label can be created by setting the pdf parameter to false. The API will return a JSON response, which should be rendered into HTML using encoding 128. This allows for flexibility in designing the layout of the shipping label and adding any necessary information.

Additionally, you can use the parameter pdf_size to generate labels in different sizes.

- For size 8x11 (A4), pass: pdf_size=A4
- For size 4x6 (4R), pass: pdf_size=4R
- If the pdf_size parameter is not provided, the label will default to A4 size.

#### Parameters

| PARAMETERS | MANDATORY | DESCRIPTION |
|------------|-----------|-------------|
| waybill<br>String | true | Waybill number of the shipment |
| pdf<br>Boolean | false | If passed True: An S3 link of the pdf will be generated which cannot be customized.If passed False: Response would be Json, that can manipulated as per the requirement. |
| pdf_size<br>String | false | For size 8x11 (A4), pass: pdf_size=A4 For size 4x6 (4R), pass: pdf_size=4R |

#### Rate Limit and Latency

| METRICS | VALUE |
|---------|-------|
| Average Latency (PRODUCTION) | 210.64ms |
| P99 Latency (PRODUCTION) | 61.78s |
| Rate Limit (Requests/5 Minute/IP) (PRODUCTION) | 3000 |

#### Request

```shell
curl --request GET \
	--url 'https://staging-express.delhivery.com/api/p/packing_slip?wbns=7035xxxxxxxxxxx&pdf=true&pdf_size=4R' \
	--header 'Authorization: Token XXXXXXXXXXXXXXXXX' \
	--header 'Content-Type: application/json'
```

#### Environment URLs

**Test Environment URL**
```
https://staging-express.delhivery.com/api/p/packing_slip?wbns=waybill&pdf=true&pdf_size=
```

**Production Environment URL**
```
https://track.delhivery.com/api/p/packing_slip?wbns=waybill&pdf=true&pdf_size=
```