# Velocity Order/Shipment Testing Guide

Complete end-to-end testing workflow for creating orders and shipping with Velocity courier.

---

## Prerequisites

1. **Server running**: `http://localhost:5005`
2. **Authenticated user**: Seller role with KYC verified
3. **Velocity integration**: Active in your company settings
4. **Warehouse setup**: At least one warehouse configured

---

## Step 1: Create Order

**Endpoint**: `POST http://localhost:5005/api/v1/orders`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "customerInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "address": {
      "line1": "123 Main Street",
      "line2": "Apt 4B",
      "city": "Bangalore",
      "state": "Karnataka",
      "country": "India",
      "postalCode": "560001"
    }
  },
  "products": [
    {
      "name": "Electronics Widget",
      "sku": "WIDGET-001",
      "quantity": 2,
      "price": 500.00,
      "weight": 0.5,
      "dimensions": {
        "length": 10,
        "width": 8,
        "height": 5
      }
    }
  ],
  "paymentMethod": "cod",
  "warehouseId": "YOUR_WAREHOUSE_ID",
  "notes": "Handle with care"
}
```

**Expected Response**: Note the `_id` field - this is your `orderId` for next step.

---

## Step 2: Create Shipment with Velocity

**Endpoint**: `POST http://localhost:5005/api/v1/shipments`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "orderId": "ORDER_ID_FROM_STEP_1",
  "serviceType": "standard",
  "warehouseId": "YOUR_WAREHOUSE_ID",
  "carrierOverride": "velocity",
  "instructions": "Leave at doorstep if not at home"
}
```

**Expected Response**:
- `trackingNumber`: SC-2026-XXXXXX
- `carrier`: "velocity"
- `carrierDetails.velocityOrderId`: VEL-2026-XXXXXX
- `carrierDetails.carrierTrackingNumber`: AWB number from Velocity
- `currentStatus`: "created"

---

## Step 3: Create Manifest

**Endpoint**: `POST http://localhost:5005/api/v1/shipments/manifest`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "carrier": "velocity",
  "shipmentIds": ["SHIPMENT_ID_FROM_STEP_2"],
  "warehouseId": "YOUR_WAREHOUSE_ID",
  "pickup": {
    "scheduledDate": "2026-02-14",
    "timeSlot": "morning",
    "contactPerson": "Warehouse Manager",
    "contactPhone": "9876543210"
  },
  "notes": "Pickup requested"
}
```

**Expected Response**: Note the `_id` field - this is your `manifestId` for next step.

---

## Step 4: Close Manifest & Schedule Pickup

**Endpoint**: `POST http://localhost:5005/api/v1/shipments/manifests/MANIFEST_ID_FROM_STEP_3/close`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "timeSlot": "morning"
}
```

**Expected Response**:
- `status`: "closed"
- `pickup.pickupGeneratedAt`: timestamp
- Shipment status changes to "manifested"

---

## Step 5: Track Shipment

**Endpoint**: `GET http://localhost:5005/api/v1/shipments/tracking/TRACKING_NUMBER_FROM_STEP_2`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected Response**: Real-time tracking information with:
- `trackingNumber`
- `awb`: Carrier tracking number
- `carrier`: "velocity"
- `currentStatus`
- `timeline`: Array of status events with timestamps and locations

---

## Step 6: Get Shipment Details

**Endpoint**: `GET http://localhost:5005/api/v1/shipments/SHIPMENT_ID_FROM_STEP_2`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected Response**: Complete shipment object with:
- Order details
- Carrier details (Velocity order ID, AWB)
- Pricing breakdown
- Status history
- Documents (label URL)

---

## Status Progression Flow

Your shipment will progress through these statuses:

1. **created** → Initial shipment creation
2. **manifested** → Added to manifest and pickup scheduled
3. **picked_up** → Courier collected package (via webhook)
4. **in_transit** → Package in transit (via webhook)
5. **out_for_delivery** → Out for delivery (via webhook)
6. **delivered** → Successfully delivered (via webhook)

**Alternative flows**:
- **NDR** → Non-delivery report (customer unavailable)
- **rto_initiated** → Return to origin started
- **rto_delivered** → Package returned to warehouse

---

## Testing with Browser/Postman

### Using Postman:

1. **Import collection**: Create new requests for each endpoint above
2. **Set environment variable**: `{{baseUrl}}` = `http://localhost:5005/api/v1`
3. **Set auth token**: Use Bearer Token authentication
4. **Execute sequentially**: Follow steps 1-6 in order

### Using Browser DevTools:

Open browser console and use `fetch`:

```javascript
// Step 1: Create Order
const orderResponse = await fetch('http://localhost:5005/api/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    customerInfo: {
      name: "John Doe",
      phone: "9876543210",
      address: {
        line1: "123 Main Street",
        city: "Bangalore",
        state: "Karnataka",
        postalCode: "560001",
        country: "India"
      }
    },
    products: [{
      name: "Product 1",
      quantity: 1,
      price: 500,
      weight: 0.5
    }],
    paymentMethod: "cod",
    warehouseId: "YOUR_WAREHOUSE_ID"
  })
});
const orderData = await orderResponse.json();
console.log('Order ID:', orderData.data.order._id);

// Step 2: Create Shipment
const shipmentResponse = await fetch('http://localhost:5005/api/v1/shipments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    orderId: orderData.data.order._id,
    serviceType: "standard",
    warehouseId: "YOUR_WAREHOUSE_ID",
    carrierOverride: "velocity"
  })
});
const shipmentData = await shipmentResponse.json();
console.log('Tracking Number:', shipmentData.data.shipment.trackingNumber);
console.log('Shipment ID:', shipmentData.data.shipment._id);

// Step 3: Create Manifest
const manifestResponse = await fetch('http://localhost:5005/api/v1/shipments/manifest', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    carrier: "velocity",
    shipmentIds: [shipmentData.data.shipment._id],
    warehouseId: "YOUR_WAREHOUSE_ID",
    pickup: {
      scheduledDate: "2026-02-14",
      timeSlot: "morning",
      contactPerson: "Manager",
      contactPhone: "9876543210"
    }
  })
});
const manifestData = await manifestResponse.json();
console.log('Manifest ID:', manifestData.data._id);

// Step 4: Close Manifest
const closeResponse = await fetch(`http://localhost:5005/api/v1/shipments/manifests/${manifestData.data._id}/close`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({ timeSlot: "morning" })
});
const closeData = await closeResponse.json();
console.log('Manifest closed:', closeData);

// Step 5: Track Shipment
const trackingResponse = await fetch(`http://localhost:5005/api/v1/shipments/tracking/${shipmentData.data.shipment.trackingNumber}`, {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  credentials: 'include'
});
const trackingData = await trackingResponse.json();
console.log('Tracking:', trackingData);
```

---

## Velocity Status Updates (Webhooks)

Status updates from Velocity come via webhooks automatically:

**Webhook URL**: `POST http://localhost:5005/webhooks/couriers/velocity`

**Velocity Status → Internal Status Mapping**:
- `NEW`, `PENDING` → created
- `PKP`, `PICKUP SCHEDULED` → picked_up
- `IT`, `IN TRANSIT`, `REACHED HUB` → in_transit
- `OFD`, `OUT FOR DELIVERY` → out_for_delivery
- `DEL`, `DELIVERED` → delivered
- `NDR` → ndr
- `RTO` → rto_initiated

You don't need to trigger these manually - Velocity sends them automatically once pickup happens.

---

## Troubleshooting

### Error: "Warehouse not found"
- Get your warehouse ID: `GET /api/v1/warehouses`
- Use the `_id` field from response

### Error: "Velocity integration not found"
- Check integration status: `GET /api/v1/integrations`
- Ensure Velocity is active and credentials are set

### Error: "Order not found"
- Verify order was created successfully in Step 1
- Check order status: `GET /api/v1/orders/ORDER_ID`

### Error: "Invalid carrier override"
- Ensure you're using `"velocity"` (lowercase)
- Check supported carriers: `GET /api/v1/carriers`

### Shipment created but no AWB
- Check `carrierDetails` in response
- Look for `velocityOrderId` and `carrierTrackingNumber`
- If missing, check server logs for Velocity API errors

---

## Quick Reference IDs

Replace these placeholders with actual IDs from your system:

- `YOUR_ACCESS_TOKEN`: Get from `/api/v1/auth/login` or browser cookies
- `YOUR_WAREHOUSE_ID`: Get from `/api/v1/warehouses` → `_id` field
- `ORDER_ID_FROM_STEP_1`: Response from Step 1 → `data.order._id`
- `SHIPMENT_ID_FROM_STEP_2`: Response from Step 2 → `data.shipment._id`
- `TRACKING_NUMBER_FROM_STEP_2`: Response from Step 2 → `data.shipment.trackingNumber`
- `MANIFEST_ID_FROM_STEP_3`: Response from Step 3 → `data._id`

---

## Complete Flow Summary

```
1. POST /orders → Get orderId
2. POST /shipments (with orderId, carrierOverride: "velocity") → Get shipmentId, trackingNumber
3. POST /shipments/manifest (with shipmentIds) → Get manifestId
4. POST /shipments/manifests/:id/close → Pickup scheduled
5. GET /shipments/tracking/:trackingNumber → Track in real-time
6. Webhooks update status automatically → picked_up → in_transit → delivered
```

---

**Note**: Make sure your Velocity credentials are configured correctly in the database. The system will automatically:
- Authenticate with Velocity
- Create warehouse in Velocity if not exists
- Generate shipping label
- Schedule pickup with courier
- Track status updates via webhooks
