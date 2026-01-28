Shipfast API - Detailed Collection
Complete Shipfast API collection with field tables, response examples, error codes, and curl snippets for all endpoints.

Base URL: https://shazam.velocity.in/

Error Codes:

400: Validation error
422: Waybill operation failed
422: Cancellation failed
401: Authorisation failed
Best practises:

POST
Authentication - Get Token

https://shazam.velocity.in/custom/api/v1/auth-token

Purpose
Obtain API token for Authorization header in subsequent requests.

Request Fields
Field	Type	Required	Description	Example
username	string	Yes	Mobile number with country code	+91xxxxxxxxx
password	string	Yes	Account password	yourpassword
Notes
Use Authorization: {{token}} in all secured endpoints.

Token will be valid for 24 Hrs

HEADERS
Content-Type
application/json

Body
raw
{
  "username": "+919866340090",
  "password": "Velocity@123"
}

curl --location '/custom/api/v1/auth-token' \
--header 'Content-Type: application/json' \
--data-raw '{
  "username": "+919866340090",
  "password": "Velocity@123"
}'

{
  "token": "bbqRkOXw0xWLuYj9ubnDwg",
  "expires_at": "2025-09-17T10:11:40"
}

POST
Serviceability API
https://shazam.velocity.in/custom/api/v1/serviceability
Purpose
Check if a lane supports pickup & delivery under given payment mode and shipment type.

Request Fields
Field	Type	Required	Description	Example
from	string	Yes	Pickup pincode	560068
to	string	Yes	Destination pincode	560068
payment_mode	enum	Yes	cod or prepaid	cod
shipment_type	enum	Yes	forward or return	forward
HEADERS
Content-Type
application/json

Authorization
DO190JE4z8qD4S7ly6hx9Q

Body
raw
{
  "from": "560068",
  "to": "560068",
  "payment_mode": "cod",
  "shipment_type": "forward"
}

curl --location 'https://shazam.velocity.in/custom/api/v1/serviceability' \
--header 'Content-Type: application/json' \
--header 'Authorization: DO190JE4z8qD4S7ly6hx9Q' \
--data '{
  "from": "560068",
  "to": "560068",
  "payment_mode": "cod",
  "shipment_type": "forward"
}'

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

POST
Forward Shipment - Create Order
https://shazam.velocity.in/custom/api/v1/forward-order-orchestration
Forward Shipment - Field-Level Table
Order, Channel & Carrier
Field	Type	Required	Description	Example
order_id	string	Yes	Unique per order	ORDER-49
order_date	string	Yes	YYYY-MM-DD HH:mm	2018-05-08 12:23
channel_id	string	Optional	Source/channel ID	27202
carrier_id	string	Optional	carrier_id fetched from serviceability API	CARO0ZZQH1H6U
Billing & Shipping
View More
Field	Type	Required	Description	Example
billing_customer_name	string	Yes	First name	Saurabh
billing_last_name	string	Optional	Last name	Jindal
billing_address	string	Yes	Address line 1	Incubex, Velocity
billing_city	string	Yes	City	Bangalore
billing_pincode	string	Yes	6-digit PIN	560102
billing_state	string	Yes	State	Karnataka
billing_country	string	Yes	Country	India
billing_email	string	Optional	Email	saurabh+123891@velocity.in
billing_phone	string	Yes	Phone	8860697807
shipping_is_billing	boolean	Optional	True if shipping same as billing	true
print_label	boolean	Yes	Auto-generate label	true
Items & Payment
Field	Type	Required	Description	Example
order_items[]	array	Yes	List of items	see JSON
payment_method	enum	Yes	COD or PREPAID	COD
sub_total	number	Yes	Order subtotal	990
cod_collectible	number	Yes	Required if payment_method is COD, pass 0 in case of PREPAID	990
Dimensions & Warehouse
Field	Type	Required	Description	Example
length	number	Yes	cm	100
breadth	number	Yes	cm	50
height	number	Yes	cm	10
weight	number	Yes	kg	0.5
pickup_location	string	Yes	Pickup Location Name	Lucknow Warehouse
warehouse_id	string	Yes	Pickup warehouse Id in Shipfast Portal	WHYYB5
Vendor Details(Pickup Location details)
Field	Type	Required	Description	Example
email	string	Optional	Vendor email	abcdd@abcdd.com
phone	string	Optional	Vendor phone	9879879879
name	string	Optional	Vendor name	Coco Cookie
address	string	Optional	Address	Street 1
city	string	Optional	City	delhi
state	string	Optional	State	new delhi
country	string	Optional	Country	india
pin_code	string	Optional	PIN	110077
pickup_location	string	Optional	Pickup label	HomeNew
HEADERS
Content-Type
application/json

Authorization
bbqRkOXw0xWLuYj9ubnDwg

Body
raw

{
  "order_id": "ORDER-4345t9",
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
'

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
    "label_url": "https://velocity-shazam-prod.s3.ap-south-1.amazonaws.com/n9u98s8nodhjgqhnl4fh852tvqo5?response-content-disposition=inline%3B%20filename%3D%2234812010700125_shipping_label.pdf%22%3B%20filename%2A%3DUTF-8%27%2734812010700125_shipping_label.pdf&response-content-type=application%2Fpdf&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAU4T4YDSMMKHXEIKS%2F20250930%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20250930T122050Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=9f1e2e859fa917841c1b74ff2822d28cda2661b64be6c0191daf6390e4647ca2",
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

POST
Reverse Shipment - Create Order
https://shazam.velocity.in/custom/api/v1/reverse-order-orchestration
Reverse Shipment - Field-Level Table
Order, Channel & Carrier

Field	Type	Required	Description	Example
order_id	string	Yes	Unique per return	ORDER-49
order_date	string	Yes	YYYY-MM-DD HH:mm	2018-05-08 12:23
channel_id	string	Optional	Source/channel ID	27202
carrier_id	string	Optional	carrier_id fetched from serviceability API	CARO0ZZQH1H6U
Pickup Address (Customer)

View More
Field	Type	Required	Description	Example
pickup_customer_name	string	Yes	First name	Saurabh
pickup_last_name	string	Optional	Last name	Jindal
company_name	string	Optional	Company name	iorn pvt ltd
pickup_address	string	Yes	Address line 1	Incubex, Velocity
pickup_address_2	string	Optional	Address line 2	
pickup_city	string	Yes	City	Bangalore
pickup_state	string	Yes	State	Karnataka
pickup_country	string	Yes	Country	India
pickup_pincode	string	Yes	PIN code	560102
pickup_email	string	Optional	Email	saurabh+123891@velocity.in
pickup_phone	string	Yes	Phone	8860697807
pickup_isd_code	string	Optional	Country code	91
Shipping Address (Destination / Warehouse)
View More
Field	Type	Required	Description	Example
shipping_customer_name	string	Yes	Name	Jax
shipping_last_name	string	Optional	Last name	Doe
shipping_address	string	Yes	Address line 1	Castle
shipping_address_2	string	Optional	Address line 2	Bridge
shipping_city	string	Yes	City	Delhi
shipping_state	string	Yes	State	New Delhi
shipping_country	string	Yes	Country	India
shipping_pincode	string	Yes	PIN	110015
shipping_email	string	Optional	Email	kumar.abhishek@shiprocket.com
shipping_isd_code	string	Optional	Country code	91
shipping_phone	string	Yes	Phone	8888888888
Items & Payment
Field	Type	Required	Description	Example
order_items[]	array	Yes	List of items	See JSON
payment_method	enum	Yes	Usually PREPAID for returns	PREPAID
total_discount	number/string	Optional	Discount total	0
sub_total	number	Yes	Item value	400
Dimensions & Warehouse
Field	Type	Required	Description	Example
length	number	Yes	cm	3
breadth	number	Yes	cm	1
height	number	Yes	cm	1
weight	number	Yes	kg	0.3
warehouse_id	string	Yes	Destination warehouse	WHYYB5
request_pickup	boolean	Optional	Auto pickup scheduling	true
HEADERS
Content-Type
application/json

Authorization
bbqRkOXw0xWLuYj9ubnDwg

Body
raw

{
  "order_id": "RET-12345157",
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
  "shipping_email": "kumar.abhishek@shiprocket.com",
  "shipping_isd_code": "91",
  "shipping_phone": 8888888888,
  "warehouse_id": "WHYYB5",
  "order_items": [{"name": "shoes","qc_enable": true,"qc_product_name": "shoes","sku": "WSH234","units": 1,"selling_price": 100,"discount": 0,"qc_brand": "Levi","qc_product_image": "https://example.com/image.jpg"}],
  "payment_method": "PREPAID",
  "total_discount": "0",
  "sub_total": 400,
  "length": 3,
  "breadth": 1,
  "height": 1,
  "weight": 0.3,
  "request_pickup": true
}

curl --location 'https://shazam.velocity.in/custom/api/v1/reverse-order-orchestration' \
--header 'Content-Type: application/json' \
--header 'Authorization: oEKN6oibwqhFWhSnBDBJUQ' \
--data-raw '{
  "order_id": "RET-12345157",
  "order_date": "2022-02-16",
  "channel_id": "2113680",
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
  "shipping_email": "kumar.abhishek@shiprocket.com",
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

POST
Cancel Order
https://shazam.velocity.in/custom/api/v1/cancel-order
Cancel Order
Field	Type	Required	Description	Example
awbs[]	array	Yes	List of AWBs to cancel (Max 50)	["84161310011340"]
HEADERS
Content-Type
application/json

Authorization
bbqRkOXw0xWLuYj9ubnDwg

Body
raw
{
  "awbs": ["84161310011340"]
}

curl --location '/custom/api/v1/cancel-order' \
--header 'Content-Type: application/json' \
--header 'Authorization: bbqRkOXw0xWLuYj9ubnDwg' \
--data '{
  "awbs": ["39879810176282"]
}'

{
  "message": "Bulk Shipment cancellation is in progress. Please wait for some time."
}

POST
Order Tracking
https://shazam.velocity.in/custom/api/v1/order-tracking
Order Tracking
Field	Type	Required	Description	Example
awbs[]	array	Yes	List of AWBs to track	["84161310011340"]
HEADERS
Content-Type
application/json

Authorization
bbqRkOXw0xWLuYj9ubnDwg

Body
raw
{
  "awbs": ["PD6786164"]
}

curl --location '/custom/api/v1/order-tracking' \
--header 'Content-Type: application/json' \
--header 'Authorization: bbqRkOXw0xWLuYj9ubnDwg' \
--data '{
  "awbs": ["PD6786164"]
}'

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
        "track_url": "https://shipfast.in/track/PD6786164"
      }
    }
  }
}

POST
Create Warehouse
https://shazam.velocity.in/custom/api/v1/warehouse
Create Warehouse
View More
Field	Type	Required	Description	Example
name	string	Yes	Warehouse display name	Demo Warehouse
phone_number	string	Yes	Contact number	8860606061
email	string	Optional	Operational email	shipfast-clickpost@velocity.in
contact_person	string	Optional	Warehouse POC	Raghuraj
address_attributes.street_address	string	Yes	Street address	Incubex HSR Layout ...
address_attributes.zip	string	Yes	PIN	560102
address_attributes.city	string	Yes	City	Bangalore
address_attributes.state	string	Yes	State	Karnataka
address_attributes.country	string	Yes	Country	India
HEADERS
Content-Type
application/json

Authorization
bbqRkOXw0xWLuYj9ubnDwg

Body
raw

{
  "name": "Demo Warehouse",
  "phone_number": "8860606061",
  "email": "shipfast-clickpost@velocity.in",
  "contact_person": "Raghuraj",
  "address_attributes": {
    "street_address": "Incubex HSR Layout (HSR6) #1504, 19th Main, 11th Cross Rd, opposite Decathlon, 1st Sector, HSR Layout",
    "zip": "560102",
    "city": "Bangalore",
    "state": "Karnataka",
    "country": "India"
  }
}

curl --location '/custom/api/v1/warehouse' \
--header 'Content-Type: application/json' \
--header 'Authorization: bbqRkOXw0xWLuYj9ubnDwg' \
--data-raw '{
  "name": "Demo Warehouse",
  "phone_number": "8860606061",
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

{
  "status": "SUCCESS",
  "payload": {
    "warehouse_id": "WH66DU"
  }
}