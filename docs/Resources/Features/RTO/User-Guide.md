# RTO Management – User Guide (Sellers & Warehouse)

This guide explains how to use the RTO (Return to Origin) features in the seller dashboard and for warehouse QC.

---

## For Sellers

### 1. Dashboard

- **RTO Overview cards** (seller dashboard): Show **Pending QC**, **In Transit (Reverse)**, **This Month** count, and **Monthly Cost**. Click a card to open the RTO list (optionally filtered).
- **View all RTO**: Opens the full RTO list.
- **RTO Analytics**: Deeper metrics (rate, reasons, courier breakdown). Use **View Details** to go to the RTO list.

### 2. RTO List (`/seller/rto`)

- View all RTO cases. Filter by status, reason, date, warehouse.
- **Deep link from dashboard:** Clicking “Pending QC” or “In Transit” opens the list with that status pre-selected.
- Click a row to open **RTO Details**.

### 3. RTO Details (`/seller/rto/[id]`)

- Order/shipment info, product, financials, **RTO Journey** timeline, **Quality Check** result (if done), **Disposition** (if set), **Reverse Shipment**.
- **Track reverse shipment:** When a reverse AWB is present, use this button to open the public tracking page with the AWB pre-filled.
- **Set disposition:** Shown when status is **QC Completed** and no disposition is set. Opens a modal to choose **Restock**, **Send for Refurb**, **Dispose**, or **File Claim**, with an optional notes field. A suggested action is shown based on QC and order value.
- **Record QC:** Shown when status is **QC Pending**. Opens the QC page.

### 4. QC Page (`/seller/rto/[id]/qc`)

- Set **QC Result** (Passed / Failed), **Damage types** (if failed), **Condition** and **Remarks**.
- **Photos:**
  - **Upload photos:** Choose image files (multiple). They are uploaded to the server and attached to the QC report.
  - **Add photo URL:** Manually add an image URL and optional label.
- Submit to record QC. After submission, you can **Set disposition** from the RTO details page.

---

## For Warehouse / QC Team

1. **Pending QC:** Use the dashboard or RTO list to find cases in **QC Pending**.
2. **Open QC:** From RTO details, click **Record QC**.
3. **Inspect:** Use condition, damage types, and remarks. Upload photos of packaging and product.
4. **Submit QC:** Submit the form. Status becomes **QC Completed**.
5. **Disposition:** From RTO details, click **Set disposition**. Choose Restock (if QC passed), Refurb, Dispose, or Claim. Restock will update inventory and status to **Restocked**; other actions set the corresponding status.

---

## Customer Tracking

- **Public page:** `/track/rto`  
- Customer can enter **AWB** or **Order number + phone** to see RTO status and reverse tracking.
- Sellers can use **Track reverse shipment** on RTO details to open this page with the reverse AWB pre-filled.

---

## Notifications (automated)

- **RTO initiated:** Customer is notified (email/WhatsApp if contact is available).
- **Delivered to warehouse:** Customer is notified when the return is received.
- **QC completed:** Customer is notified of the QC outcome.
- **Refund processed:** Can be sent when the refund is processed (if integrated with wallet/refund flow).

---

## Tips

- Use **Upload photos** on the QC page for faster, more reliable attachment than pasting URLs.
- Use **Set disposition** after QC so restock/refurb/dispose/claim is recorded and status is updated correctly.
- Use **Track reverse shipment** to quickly check reverse logistics from the same RTO details screen.
