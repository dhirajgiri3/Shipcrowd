# Razorpay Testing Guide (Local Development)

This guide walks you through testing all Razorpay features (recharge, payout, webhooks) locally using test credentials and an ngrok tunnel.

---

## 1. Environment Setup

### 1.1 Fix RAZORPAY_WEBHOOK_SECRET (Important)

**Your current `.env` has a URL in `RAZORPAY_WEBHOOK_SECRET` — that is incorrect.**

- `RAZORPAY_WEBHOOK_SECRET` must be a **signing secret** (a string like `whsec_xxxx` or similar) that Razorpay gives you when you create a webhook in the Dashboard.
- The ngrok URL is configured **in Razorpay Dashboard** as the webhook endpoint, not in `.env`.

**Correct `.env` values:**

```env
# Razorpay (Payouts & Payment Gateway)
RAZORPAY_KEY_ID=rzp_test_S2xKn4ybMgOCri
RAZORPAY_KEY_SECRET=s5GRxGnQhvY5mtUwQk54E3ql
RAZORPAY_ACCOUNT_NUMBER=2323230057507372
# This must be the WEBHOOK SIGNING SECRET from Razorpay Dashboard, NOT a URL
RAZORPAY_WEBHOOK_SECRET=<your_webhook_secret_from_dashboard>
# Optional endpoint-specific secrets (fallback to RAZORPAY_WEBHOOK_SECRET if omitted)
RAZORPAY_PAYMENT_WEBHOOK_SECRET=<optional_payment_secret>
RAZORPAY_PAYOUT_WEBHOOK_SECRET=<optional_payout_secret>
RAZORPAY_COMMISSION_WEBHOOK_SECRET=<optional_commission_secret>
```

### 1.2 Client-Side Key (Optional)

For Razorpay Checkout to load, the frontend needs the key. The backend returns it in `initRecharge` response. If not, add to client `.env.local`:

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_S2xKn4ybMgOCri
```

---

## 2. Tunnel Setup (ngrok)

Razorpay sends webhooks to a public URL. Use ngrok to expose your local server.

### 2.1 Install ngrok

```bash
# macOS (Homebrew)
brew install ngrok

# Or download from https://ngrok.com/download
```

### 2.2 Start Tunnel

```bash
# Expose backend (default port 5005)
ngrok http 5005
```

You'll get a URL like: `https://abc123.ngrok-free.app`

### 2.3 Update Razorpay Dashboard

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/) → **Settings** → **Webhooks**
2. Click **+ Add New Webhook**
3. **Webhook URL:** `https://YOUR-NGROK-URL.ngrok-free.app/api/v1/webhooks/razorpay/payment`
4. **Secret:** Generate or copy — this goes in `RAZORPAY_WEBHOOK_SECRET`
5. **Active Events:** Select `payment.captured`
6. Save

7. Add another webhook for payouts:
   - **Webhook URL:** `https://YOUR-NGROK-URL.ngrok-free.app/api/v1/webhooks/razorpay/payout`
   - **Active Events:** `payout.processed`, `payout.failed`, `payout.reversed`
   - **Secret:** Can reuse same secret or set `RAZORPAY_PAYOUT_WEBHOOK_SECRET`

8. Add webhook for commission payouts (if using commission payouts module):
   - **Webhook URL:** `https://YOUR-NGROK-URL.ngrok-free.app/api/v1/commission/payouts/webhook`
   - **Active Events:** `payout.processed`, `payout.failed`, `payout.rejected`
   - **Secret:** Can reuse same secret or set `RAZORPAY_COMMISSION_WEBHOOK_SECRET`

**Note:** App now supports endpoint-specific secrets with fallback. If specific env vars are missing, it uses `RAZORPAY_WEBHOOK_SECRET`.

### 2.4 Update .env

Copy the **Webhook Secret** from the Razorpay webhook config and set:

```env
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

---

## 3. Razorpay Features to Test

### 3.1 Wallet Recharge (Payment)

**Flow:** User adds money → Razorpay Checkout → Payment captured → Wallet credited

**Endpoints:**
- `POST /api/v1/finance/wallet/recharge/init` — Creates Razorpay order
- `POST /api/v1/finance/wallet/recharge` — Verifies payment and credits wallet
- Webhook: `POST /api/v1/webhooks/razorpay/payment` — Async confirmation (payment.captured)

**How to test:**
1. Start server: `npm run dev` (in `server/`)
2. Start client: `npm run dev` (in `client/`)
3. Start ngrok: `ngrok http 5005`
4. Log in as a seller
5. Go to **Wallet** → **Add Money**
6. Enter amount (e.g. ₹100) and pay
7. Use Razorpay test card: `4111 1111 1111 1111`, CVV: `123`, Expiry: any future date

**Razorpay test cards:** https://razorpay.com/docs/payments/payments/test-card-details/

---

### 3.2 Auto-Recharge

**Flow:** Wallet falls below threshold → Auto-recharge creates order → User pays → Webhook credits wallet

**How to test:**
1. Go to **Wallet** → **Auto-Recharge** (or similar)
2. Enable auto-recharge with threshold (e.g. ₹500) and amount (e.g. ₹1000)
3. Reduce wallet balance below threshold (or use a test that triggers it)
4. Auto-recharge creates a Razorpay order; payment is completed via Checkout
5. Webhook `payment.captured` credits the wallet

**Note:** Auto-recharge flow may require `paymentPurpose: 'auto-recharge'` in order notes. Check `razorpay-payment.webhook.controller.ts` — it filters by `paymentPurpose === 'auto-recharge'`.

---

### 3.3 COD Payout (Razorpay Payouts API)

**Flow:** Admin approves remittance → Initiate payout → Worker creates Razorpay payout → Webhook updates status

**Prerequisites:**
- Redis + BullMQ running (for payout worker)
- Company with **verified default** `SellerBankAccount` (with `razorpayFundAccountId`)
- COD remittance in `approved` status

**Endpoints:**
- `POST /api/v1/finance/cod-remittance/:id/initiate-payout` — Enqueues payout job
- Webhook: `POST /api/v1/webhooks/razorpay/payout` — `payout.processed`, `payout.failed`, `payout.reversed`

**How to test:**
1. Ensure a company has a verified bank account (add via `/seller/bank-accounts`, verify via KYC)
2. Create/seed a COD remittance in `approved` status
3. Start payout worker (if separate process)
4. Call `POST /api/v1/finance/cod-remittance/{remittanceId}/initiate-payout` (Admin)
5. Worker creates Razorpay payout; Razorpay sends webhook when processed/failed

**Razorpay test bank accounts:** https://razorpay.com/docs/payments/payouts/test-bank-accounts/

---

### 3.4 Bank Account / Fund Account (Payout Setup)

**Flow:** Add bank account → Verify via KYC → Razorpay contact + fund account created

**How to test:**
1. Add bank account at `/seller/bank-accounts`
2. Use **Verify & Add** with a test bank:
   - Account: `2323230041626905` (Razorpay test)
   - IFSC: `HDFC0001233`
   - Name: `Gaurav Kumar`
3. On success, `SellerBankAccount` gets `razorpayFundAccountId`
4. This account can be used for COD payouts

---

## 4. Webhook Verification

### 4.1 Raw Body Requirement

Razorpay webhooks need the **raw request body** for signature verification. The app must capture it before `express.json()` parses it.

Check `app.ts` or equivalent for something like:

```ts
app.use(express.json({
  verify: (req: any, res, buf) => { req.rawBody = buf; }
}));
```

### 4.2 Test Webhook Manually

Use Razorpay Dashboard → Webhooks → **Send Test Webhook** to fire a test event to your ngrok URL.

### 4.3 Logs

Watch server logs for:
- `Razorpay webhook signature verified`
- `Razorpay webhook: Processing auto-recharge payment`
- `Payout processed: payout_xxx`

---

## 5. Checklist

| Step | Action |
|------|--------|
| 1 | Install ngrok, run `ngrok http 5005` |
| 2 | Create webhooks in Razorpay Dashboard for `/payment` and `/payout` |
| 3 | Copy webhook **secret** (not URL) into `RAZORPAY_WEBHOOK_SECRET` |
| 4 | Restart server after .env change |
| 5 | Test recharge: Wallet → Add Money → Pay with test card |
| 6 | Test payout: Ensure verified bank + approved remittance, then initiate payout |
| 7 | Verify webhooks in Razorpay Dashboard (delivery status) |

---

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| "Invalid webhook signature" | Ensure `RAZORPAY_WEBHOOK_SECRET` is the secret from Dashboard, not the URL. Ensure raw body is captured. |
| "Raw body not available" | Add `verify` callback to `express.json()` to store `req.rawBody`. |
| Recharge fails at init | Check `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in server .env. |
| Razorpay Checkout doesn't load | Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` or ensure init API returns `key`. |
| Payout "No verified default bank account" | Add and verify a bank account; set it as default. |
| Webhook not received | Confirm ngrok is running, URL in Dashboard is correct, and server is reachable. |

---

## 7. File Reference

| Feature | Files |
|---------|-------|
| Recharge init | `server/src/core/application/services/wallet/wallet.service.ts` |
| Payment webhook | `server/src/presentation/http/controllers/webhooks/payment/razorpay-payment.webhook.controller.ts` |
| Payout webhook | `server/src/presentation/http/controllers/webhooks/payment/razorpay-payout.webhook.controller.ts` |
| Payout worker | `server/src/workers/finance/payout.worker.ts` |
| Fund account sync | `server/src/core/application/services/finance/sync-razorpay-fund-account.service.ts` |
| Webhook auth | `server/src/presentation/http/middleware/webhooks/razorpay-webhook-auth.middleware.ts` |
