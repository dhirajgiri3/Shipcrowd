// PAN Card Verification API
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  const body = await request.json();

  try {
    // Generate signature for Cashfree API
    async function getSignature() {
      const clientId = body.clientId;
      const publicKey = await getPublicKey();
      const encodedData = clientId + "." + Math.floor(Date.now() / 1000).toString();
      return encryptRSA(encodedData, publicKey);
    }
    
    async function getPublicKey() {
      const publicKeyData = process.env.NEXT_PUBLIC_CASHFREE_PUBLIC_KEY;
      return crypto.createPublicKey({ key: publicKeyData, format: 'pem' });
    }
    
    function encryptRSA(plainData, publicKey) {
      const plainBuffer = Buffer.from(plainData, 'utf8');
      const encryptedBuffer = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        plainBuffer
      );
      return encryptedBuffer.toString('base64');
    }

    const signature = await getSignature();
    const url = 'https://api.cashfree.com/verification/pan';

    const headers = {
      'x-client-id': body.clientId,
      'x-client-secret': body.clientSecret,
      'x-cf-signature': signature,
      'x-api-version': '2022-10-26',
      'Content-Type': 'application/json',
    };

    const postDataRaw = `{
      "name":"${body.name}",
      "pan":"${body.pan}"
    }`;

    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: postDataRaw,
    });

    const data = await res.json();
    return NextResponse.json({ data: data, status: res.status });

  } catch (error) {
    console.error('Error in PAN KYC', error);
    return NextResponse.json({ error: error.message });
  }
}

// Client-side implementation
const verifyPan = async (pan, name) => {
  const res = await fetch('/api/kyc/pan', {
    method: 'POST',
    body: JSON.stringify({
      clientId: 'YOUR_CASHFREE_CLIENT_ID',
      clientSecret: 'YOUR_CASHFREE_CLIENT_SECRET',
      pan: 'ABCDE1234F',
      name: 'John Doe'
    })
  });
  return await res.json();
};

{
  "data": {
    "status": "SUCCESS",
    "message": "PAN details verified successfully",
    "subCode": "200",
    "data": {
      "name": "JOHN DOE",
      "pan": "ABCDE1234F",
      "panStatus": "VALID",
      "lastName": "DOE",
      "firstName": "JOHN"
    }
  },
  "status": 200
}

// Aadhaar OTP Generation API
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  const body = await request.json();

  try {
    async function getSignature() {
      const clientId = body.clientId;
      const publicKey = await getPublicKey();
      const encodedData = clientId + "." + Math.floor(Date.now() / 1000).toString();
      return encryptRSA(encodedData, publicKey);
    }
    
    async function getPublicKey() {
      const publicKeyData = process.env.NEXT_PUBLIC_CASHFREE_PUBLIC_KEY;
      return crypto.createPublicKey({ key: publicKeyData, format: 'pem' });
    }
    
    function encryptRSA(plainData, publicKey) {
      const plainBuffer = Buffer.from(plainData, 'utf8');
      const encryptedBuffer = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        plainBuffer
      );
      return encryptedBuffer.toString('base64');
    }

    const signature = await getSignature();
    const url = 'https://api.cashfree.com/verification/offline-aadhaar/otp';

    const headers = {
      'x-client-id': body.clientId,
      'x-client-secret': body.clientSecret,
      'x-cf-signature': signature,
      'x-api-version': '2022-10-26',
      'Content-Type': 'application/json',
    };

    const postDataRaw = `{
      "aadhaar_number":"${body.aadhaar_number}"
    }`;

    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: postDataRaw,
    });

    const data = await res.json();
    return NextResponse.json({ data: data, status: res.status });

  } catch (error) {
    console.error('Error in Aadhar KYC Otp Send', error);
    return NextResponse.json({ error: error.message });
  }
}

// Client-side implementation
const sendAadhaarOTP = async (aadhaarNumber) => {
  const res = await fetch('/api/kyc/aadhaar/send-otp', {
    method: 'POST',
    body: JSON.stringify({
      clientId: 'YOUR_CASHFREE_CLIENT_ID',
      clientSecret: 'YOUR_CASHFREE_CLIENT_SECRET',
      aadhaar_number: '123456789012'
    })
  });
  return await res.json();
};

{
  "data": {
    "status": "SUCCESS",
    "message": "OTP sent successfully",
    "subCode": "200",
    "data": {
      "ref_id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6"
    }
  },
  "status": 200
}

// Aadhaar OTP Verification API
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  const body = await request.json();

  try {
    async function getSignature() {
      const clientId = body.clientId;
      const publicKey = await getPublicKey();
      const encodedData = clientId + "." + Math.floor(Date.now() / 1000).toString();
      return encryptRSA(encodedData, publicKey);
    }
    
    async function getPublicKey() {
      const publicKeyData = process.env.NEXT_PUBLIC_CASHFREE_PUBLIC_KEY;
      return crypto.createPublicKey({ key: publicKeyData, format: 'pem' });
    }
    
    function encryptRSA(plainData, publicKey) {
      const plainBuffer = Buffer.from(plainData, 'utf8');
      const encryptedBuffer = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        plainBuffer
      );
      return encryptedBuffer.toString('base64');
    }

    const signature = await getSignature();
    const url = 'https://api.cashfree.com/verification/offline-aadhaar/verify';

    const headers = {
      'x-client-id': body.clientId,
      'x-client-secret': body.clientSecret,
      'x-cf-signature': signature,
      'x-api-version': '2022-10-26',
      'Content-Type': 'application/json',
    };

    const postDataRaw = `{
      "otp":"${body.otp}",
      "ref_id":"${body.ref_id}"
    }`;

    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: postDataRaw,
    });

    const data = await res.json();
    return NextResponse.json({ data: data, status: res.status });

  } catch (error) {
    console.error('Error in Aadhar KYC OTP verification', error);
    return NextResponse.json({ error: error.message });
  }
}

// Client-side implementation
const verifyAadhaarOTP = async (otp, refId) => {
  const res = await fetch('/api/kyc/aadhaar/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      clientId: 'YOUR_CASHFREE_CLIENT_ID',
      clientSecret: 'YOUR_CASHFREE_CLIENT_SECRET',
      otp: '123456',
      ref_id: 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6'
    })
  });
  return await res.json();
};

{
  "data": {
    "status": "SUCCESS",
    "message": "Aadhaar verified successfully",
    "subCode": "200",
    "data": {
      "aadhaar_number": "XXXX XXXX 9012",
      "name": "John Doe",
      "dob": "01-01-1990",
      "gender": "M",
      "address": {
        "country": "India",
        "dist": "Bangalore",
        "state": "Karnataka",
        "po": "560001",
        "loc": "Koramangala",
        "vtc": "Bangalore",
        "subdist": "Bangalore",
        "street": "5th Block"
      },
      "face_status": "y",
      "face_score": "90"
    }
  },
  "status": 200
}

// GSTIN Verification API
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  const body = await request.json();

  try {
    async function getSignature() {
      const clientId = body.clientId;
      const publicKey = await getPublicKey();
      const encodedData = clientId + "." + Math.floor(Date.now() / 1000).toString();
      return encryptRSA(encodedData, publicKey);
    }
    
    async function getPublicKey() {
      const publicKeyData = process.env.NEXT_PUBLIC_CASHFREE_PUBLIC_KEY.split(String.raw`\n`).join('\n');
      return crypto.createPublicKey({ key: publicKeyData, format: 'pem' });
    }
    
    function encryptRSA(plainData, publicKey) {
      const plainBuffer = Buffer.from(plainData, 'utf8');
      const encryptedBuffer = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        plainBuffer
      );
      return encryptedBuffer.toString('base64');
    }

    const signature = await getSignature();
    const url = 'https://api.cashfree.com/verification/gstin';

    const headers = {
      'x-client-id': body.clientId,
      'x-client-secret': body.clientSecret,
      'x-cf-signature': signature,
      'x-api-version': '2022-10-26',
      'Content-Type': 'application/json',
    };

    const postDataRaw = `{
      "GSTIN":"${body.GSTIN}",
      "businessName":""
    }`;

    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: postDataRaw,
    });

    const data = await res.json();
    return NextResponse.json({ data: data, status: res.status });

  } catch (error) {
    console.error('Error in GSTIN verification', error);
    return NextResponse.json({ error: error.message });
  }
}

// Client-side implementation
const verifyGSTIN = async (gstin) => {
  const res = await fetch('/api/kyc/gstin', {
    method: 'POST',
    body: JSON.stringify({
      clientId: 'YOUR_CASHFREE_CLIENT_ID',
      clientSecret: 'YOUR_CASHFREE_CLIENT_SECRET',
      GSTIN: '29ABCDE1234F1Z5'
    })
  });
  return await res.json();
};

{
  "data": {
    "status": "SUCCESS",
    "message": "GSTIN details verified successfully",
    "subCode": "200",
    "data": {
      "gstin": "29ABCDE1234F1Z5",
      "tradeName": "ABC ENTERPRISES",
      "legalName": "ABC ENTERPRISES",
      "status": "Active",
      "type": "Regular",
      "registrationDate": "01-07-2017",
      "lastUpdatedDate": "01-01-2023",
      "address": {
        "building": "123, FIRST FLOOR",
        "street": "MAIN ROAD",
        "city": "BANGALORE",
        "state": "Karnataka",
        "pincode": "560001"
      }
    }
  },
  "status": 200
}

// Bank Account Verification API
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  const body = await request.json();

  try {
    async function getSignature() {
      const clientId = body.clientId;
      const publicKey = await getPublicKey();
      const encodedData = clientId + "." + Math.floor(Date.now() / 1000).toString();
      return encryptRSA(encodedData, publicKey);
    }
    
    async function getPublicKey() {
      const publicKeyData = process.env.NEXT_PUBLIC_CASHFREE_PUBLIC_KEY;
      return crypto.createPublicKey({ key: publicKeyData, format: 'pem' });
    }
    
    function encryptRSA(plainData, publicKey) {
      const plainBuffer = Buffer.from(plainData, 'utf8');
      const encryptedBuffer = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        plainBuffer
      );
      return encryptedBuffer.toString('base64');
    }

    const signature = await getSignature();
    const authUrl = 'https://payout-api.cashfree.com/payout/v1/authorize';
    const url = `https://payout-api.cashfree.com/payout/v1.2/validation/bankDetails?bankAccount=${body.bankAccount}&ifsc=${body.ifsc}`;

    const tokenHeaders = {
      'x-client-id': body.clientId,
      'x-client-secret': body.clientSecret,
      'x-cf-signature': signature,
      'x-api-version': '2022-10-26',
      'Content-Type': 'application/json',
    };

    // First get authorization token
    const tokenRes = await fetch(authUrl, {
      method: 'POST',
      headers: tokenHeaders,
    });

    const tokenData = await tokenRes.json();

    if (!tokenData?.data?.token) {
      return NextResponse.json({ 
        error: "Failed to get authorization token", 
        tokenResponse: tokenData 
      });
    }

    // Then verify bank account
    const headers = {
      'Authorization': `Bearer ${tokenData.data.token}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    const data = await res.json();
    return NextResponse.json({ data: data, status: res.status });

  } catch (error) {
    console.error('Error in Bank Verification', error);
    return NextResponse.json({ error: error.message });
  }
}

// Client-side implementation
const verifyBankAccount = async (accountNumber, ifsc) => {
  const res = await fetch('/api/kyc/bank', {
    method: 'POST',
    body: JSON.stringify({
      clientId: 'YOUR_CASHFREE_CLIENT_ID',
      clientSecret: 'YOUR_CASHFREE_CLIENT_SECRET',
      bankAccount: '1234567890',
      ifsc: 'SBIN0000123'
    })
  });
  return await res.json();
};

{
  "data": {
    "status": "SUCCESS",
    "subCode": "200",
    "message": "Bank account details verified successfully",
    "data": {
      "accountExists": true,
      "nameAtBank": "JOHN DOE",
      "amountDeposited": 1,
      "refId": "a1b2c3d4e5f6",
      "bankName": "STATE BANK OF INDIA",
      "accountNumber": "XXXXXXX7890",
      "ifsc": "SBIN0000123"
    }
  },
  "status": 200
}

// UPI Verification API
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  const body = await request.json();

  try {
    async function getSignature() {
      const clientId = body.clientId;
      const publicKey = await getPublicKey();
      const encodedData = clientId + "." + Math.floor(Date.now() / 1000).toString();
      return encryptRSA(encodedData, publicKey);
    }
    
    async function getPublicKey() {
      const publicKeyData = process.env.NEXT_PUBLIC_CASHFREE_PUBLIC_KEY;
      return crypto.createPublicKey({ key: publicKeyData, format: 'pem' });
    }
    
    function encryptRSA(plainData, publicKey) {
      const plainBuffer = Buffer.from(plainData, 'utf8');
      const encryptedBuffer = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        plainBuffer
      );
      return encryptedBuffer.toString('base64');
    }

    const signature = await getSignature();
    const authUrl = 'https://payout-api.cashfree.com/payout/v1/authorize';
    
    const tokenHeaders = {
      'x-client-id': body.clientId,
      'x-client-secret': body.clientSecret,
      'x-cf-signature': signature,
      'x-api-version': '2022-10-26',
      'Content-Type': 'application/json',
    };

    // First get authorization token
    const tokenRes = await fetch(authUrl, {
      method: 'POST',
      headers: tokenHeaders,
    });

    const tokenData = await tokenRes.json();

    if (!tokenData?.data?.token) {
      return NextResponse.json({ 
        error: "Failed to get authorization token", 
        tokenResponse: tokenData 
      });
    }

    // Then verify UPI ID
    const url = 'https://payout-api.cashfree.com/payout/v1.2/validation/upiDetails';
    
    const headers = {
      'Authorization': `Bearer ${tokenData.data.token}`,
      'Content-Type': 'application/json',
    };

    const postDataRaw = JSON.stringify({
      vpa: body.vpa
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: postDataRaw,
    });

    const data = await res.json();
    return NextResponse.json({ data: data, status: res.status });

  } catch (error) {
    console.error('Error in UPI Verification', error);
    return NextResponse.json({ error: error.message });
  }
}

// Client-side implementation
const verifyUPI = async (upiId) => {
  const res = await fetch('/api/kyc/upi', {
    method: 'POST',
    body: JSON.stringify({
      clientId: 'YOUR_CASHFREE_CLIENT_ID',
      clientSecret: 'YOUR_CASHFREE_CLIENT_SECRET',
      vpa: 'johndoe@okaxis'
    })
  });
  return await res.json();
};

{
  "data": {
    "status": "SUCCESS",
    "subCode": "200",
    "message": "UPI ID verified successfully",
    "data": {
      "vpa": "johndoe@okaxis",
      "name": "JOHN DOE",
      "isVPAValid": true,
      "accountExists": true,
      "bankName": "AXIS BANK"
    }
  },
  "status": 200
}

// Razorpay Order Creation API
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request) {
  const body = await request.json();

  try {
    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET
    });

    // Create unique receipt ID
    const receiptId = `rcpt_${body.userId || 'guest'}_${Date.now()}`;
    
    // Amount in paise (multiply by 100)
    const amountInPaise = Math.round(body.amount * 100);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: body.currency || 'INR',
      receipt: receiptId,
      notes: {
        userId: body.userId || 'guest',
        purpose: body.purpose || 'payment',
        ...body.notes
      },
      payment_capture: 1
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      receipt: order.receipt,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Client-side implementation
const createRazorpayOrder = async (amount, purpose, userId) => {
  const res = await fetch('/api/payments/razorpay/create-order', {
    method: 'POST',
    body: JSON.stringify({
      amount: 1000, // ₹1000
      currency: 'INR',
      userId: 'user123',
      purpose: 'wallet_recharge',
      notes: {
        email: 'user@example.com',
        phone: '9876543210'
      }
    })
  });
  return await res.json();
};

{
  "id": "order_MWTGjRWEMdlGNz",
  "amount": 1000,
  "currency": "INR",
  "receipt": "rcpt_user123_1678901234567",
  "key": "rzp_live_k2H45af5H1sDKa"
}

// Razorpay Payment Verification API
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  const body = await request.json();

  try {
    // Extract payment details
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ 
        verified: false, 
        error: 'Invalid payment signature' 
      }, { status: 400 });
    }

    // Fetch payment details from Razorpay (optional but recommended)
    const response = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${process.env.RAZORPAY_SECRET}`
          ).toString('base64')}`
        }
      }
    );

    const paymentDetails = await response.json();

    // Verify payment status
    if (paymentDetails.status !== 'captured') {
      return NextResponse.json({ 
        verified: false, 
        error: 'Payment not captured',
        status: paymentDetails.status
      }, { status: 400 });
    }

    return NextResponse.json({
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: paymentDetails.amount / 100,
      currency: paymentDetails.currency,
      method: paymentDetails.method,
      email: paymentDetails.email,
      contact: paymentDetails.contact,
      createdAt: new Date(paymentDetails.created_at * 1000).toISOString()
    });

  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Client-side implementation
const verifyRazorpayPayment = async (paymentData) => {
  const res = await fetch('/api/payments/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify({
      razorpay_order_id: 'order_MWTGjRWEMdlGNz',
      razorpay_payment_id: 'pay_MWTHJHPqDRYcMa',
      razorpay_signature: '31d2c8c55ad5e9a3b4c9a9b0b86c0e6c5a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d'
    })
  });
  return await res.json();
};

{
  "verified": true,
  "paymentId": "pay_MWTHJHPqDRYcMa",
  "orderId": "order_MWTGjRWEMdlGNz",
  "amount": 1000,
  "currency": "INR",
  "method": "card",
  "email": "user@example.com",
  "contact": "9876543210",
  "createdAt": "2023-03-15T10:20:34.567Z"
}

// Paytm Order Creation API
import { NextResponse } from 'next/server';
import PaytmChecksum from 'paytmchecksum';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  const body = await request.json();

  try {
    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${uuidv4().substring(0, 8)}`;
    
    // Prepare parameters for Paytm
    const paytmParams = {
      body: {
        requestType: "Payment",
        mid: process.env.NEXT_PUBLIC_MID,
        websiteName: "DEFAULT",
        orderId: orderId,
        callbackUrl: `${process.env.NEXT_PUBLIC_HOST}/api/payments/paytm/callback`,
        txnAmount: {
          value: body.amount.toString(),
          currency: "INR",
        },
        userInfo: {
          custId: body.userId || `CUST_${Date.now()}`,
          email: body.email || "",
          mobile: body.phone || "",
          firstName: body.name || ""
        }
      }
    };

    // Generate checksum
    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      process.env.NEXT_PUBLIC_MKEY
    );

    // Add checksum to parameters
    paytmParams.head = {
      signature: checksum
    };

    // Make API call to Paytm
    const url = `${process.env.NEXT_PUBLIC_PAYTM_HOST}/theia/api/v1/initiateTransaction?mid=${process.env.NEXT_PUBLIC_MID}&orderId=${orderId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paytmParams)
    });

    const data = await response.json();

    if (data.body.resultInfo.resultStatus === 'S') {
      return NextResponse.json({
        orderId: orderId,
        txnToken: data.body.txnToken,
        amount: body.amount,
        mid: process.env.NEXT_PUBLIC_MID,
        callbackUrl: `${process.env.NEXT_PUBLIC_HOST}/api/payments/paytm/callback`
      });
    } else {
      return NextResponse.json({ 
        error: data.body.resultInfo.resultMsg 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error creating Paytm order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Client-side implementation
const createPaytmOrder = async (amount, userId, email, phone, name) => {
  const res = await fetch('/api/payments/paytm/create-order', {
    method: 'POST',
    body: JSON.stringify({
      amount: 1000,
      userId: 'user123',
      email: 'user@example.com',
      phone: '9876543210',
      name: 'John Doe'
    })
  });
  return await res.json();
};

{
  "orderId": "ORDER_1678901234567_a1b2c3d4",
  "txnToken": "28763443-3e63-4b83-a9c9-9a5c637a8723",
  "amount": 1000,
  "mid": "zRHeoL95162916413365",
  "callbackUrl": "http://localhost:3000/api/payments/paytm/callback"
}

// Paytm Callback API
import { NextResponse } from 'next/server';
import PaytmChecksum from 'paytmchecksum';

export async function POST(request) {
  const body = await request.json();

  try {
    // Verify checksum
    const paytmParams = {};
    
    // Extract all body parameters except checksum
    Object.keys(body).forEach(key => {
      if (key !== 'CHECKSUMHASH') {
        paytmParams[key] = body[key];
      }
    });
    
    const isValidChecksum = await PaytmChecksum.verifySignature(
      paytmParams,
      process.env.NEXT_PUBLIC_MKEY,
      body.CHECKSUMHASH
    );

    if (!isValidChecksum) {
      return NextResponse.json({ 
        success: false, 
        error: 'Checksum mismatch' 
      }, { status: 400 });
    }

    // Verify transaction status
    const txnStatus = body.STATUS;
    const txnId = body.TXNID;
    const orderId = body.ORDERID;
    const amount = body.TXNAMOUNT;
    const paymentMode = body.PAYMENTMODE;
    const bankTxnId = body.BANKTXNID;
    const txnDate = body.TXNDATE;

    if (txnStatus === 'TXN_SUCCESS') {
      // Transaction successful
      return NextResponse.json({
        success: true,
        orderId: orderId,
        txnId: txnId,
        amount: amount,
        paymentMode: paymentMode,
        bankTxnId: bankTxnId,
        txnDate: txnDate
      });
    } else {
      // Transaction failed
      return NextResponse.json({
        success: false,
        orderId: orderId,
        txnStatus: txnStatus,
        responseCode: body.RESPCODE,
        responseMessage: body.RESPMSG
      });
    }

  } catch (error) {
    console.error('Error processing Paytm callback:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

{
  "success": true,
  "orderId": "ORDER_1678901234567_a1b2c3d4",
  "txnId": "20230315111213800110168012345678",
  "amount": "1000.00",
  "paymentMode": "CREDIT_CARD",
  "bankTxnId": "777001123456789",
  "txnDate": "2023-03-15 11:12:13.0"
}

{
  "success": false,
  "orderId": "ORDER_1678901234567_a1b2c3d4",
  "txnStatus": "TXN_FAILURE",
  "responseCode": "400",
  "responseMessage": "Payment failed due to insufficient balance"
}

// Shopify Authentication API
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  
  try {
    // Extract query parameters
    const shop = searchParams.get('shop');
    const hmac = searchParams.get('hmac');
    const timestamp = searchParams.get('timestamp');
    const code = searchParams.get('code');
    
    // Verify HMAC
    const message = `code=${code}&shop=${shop}&timestamp=${timestamp}`;
    const generatedHash = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
      .update(message)
      .digest('hex');
      
    if (generatedHash !== hmac) {
      return NextResponse.json({ error: 'HMAC validation failed' }, { status: 403 });
    }
    
    // Exchange code for access token
    const accessTokenUrl = `https://${shop}/admin/oauth/access_token`;
    const accessTokenPayload = {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code
    };
    
    const response = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(accessTokenPayload)
    });
    
    const data = await response.json();
    
    if (!data.access_token) {
      return NextResponse.json({ error: 'Failed to get access token' }, { status: 400 });
    }
    
    // Store the access token securely (e.g., in database)
    // This is just a placeholder - implement your storage logic
    await storeShopifyCredentials(shop, data.access_token, data.scope);
    
    // Redirect to app or return success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_HOST}/seller/shopify/connected?shop=${shop}`);
    
  } catch (error) {
    console.error('Error in Shopify authentication:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to store credentials (implement according to your database)
async function storeShopifyCredentials(shop, accessToken, scope) {
  // Example implementation - replace with your database logic
  console.log(`Storing credentials for ${shop}: ${accessToken} (${scope})`);
  // await db.collection('shopify_stores').doc(shop).set({
  //   accessToken,
  //   scope,
  //   createdAt: new Date()
  // });
}

// This is typically accessed via a redirect from Shopify
// https://your-app.com/api/shopify/auth?shop=your-store.myshopify.com&hmac=abc123&timestamp=1678901234&code=def456

// Shopify Order Sync API
import { NextResponse } from 'next/server';
import { db } from '@/repository/firebase';
import { doc, getDoc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';

export async function POST(request) {
  const body = await request.json();
  const { uid, shop } = body;
  
  try {
    // Get Shopify credentials from database
    const shopifyCredentialsRef = doc(db, `sellers/${uid}/integrations/shopify`);
    const shopifyCredentialsSnap = await getDoc(shopifyCredentialsRef);
    
    if (!shopifyCredentialsSnap.exists()) {
      return NextResponse.json({ error: 'Shopify integration not found' }, { status: 404 });
    }
    
    const { accessToken } = shopifyCredentialsSnap.data();
    
    // Fetch orders from Shopify
    const ordersUrl = `https://${shop}/admin/api/2023-07/orders.json?status=any&limit=50`;
    
    const response = await fetch(ordersUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.orders) {
      return NextResponse.json({ error: 'Failed to fetch orders from Shopify' }, { status: 400 });
    }
    
    // Process and store orders
    const syncResults = {
      total: data.orders.length,
      synced: 0,
      failed: 0,
      errors: []
    };
    
    for (const order of data.orders) {
      try {
        // Transform Shopify order to your app's format
        const transformedOrder = transformShopifyOrder(order);
        
        // Store in Firestore
        await addDoc(collection(db, `sellers/${uid}/orders`), {
          ...transformedOrder,
          source: 'shopify',
          shopifyOrderId: order.id,
          syncedAt: Timestamp.now()
        });
        
        syncResults.synced++;
      } catch (error) {
        syncResults.failed++;
        syncResults.errors.push({
          orderId: order.id,
          error: error.message
        });
      }
    }
    
    // Update last sync timestamp
    await setDoc(shopifyCredentialsRef, {
      lastSyncAt: Timestamp.now()
    }, { merge: true });
    
    return NextResponse.json(syncResults);
    
  } catch (error) {
    console.error('Error syncing Shopify orders:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to transform Shopify order to your app's format
function transformShopifyOrder(shopifyOrder) {
  // Extract shipping address
  const shippingAddress = shopifyOrder.shipping_address || {};
  
  // Extract line items
  const lineItems = shopifyOrder.line_items.map(item => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    price: parseFloat(item.price),
    sku: item.sku || '',
    variantId: item.variant_id,
    productId: item.product_id
  }));
  
  // Calculate totals
  const subtotal = parseFloat(shopifyOrder.subtotal_price || 0);
  const shipping = parseFloat(shopifyOrder.shipping_lines?.[0]?.price || 0);
  const tax = parseFloat(shopifyOrder.total_tax || 0);
  const total = parseFloat(shopifyOrder.total_price || 0);
  
  return {
    orderId: shopifyOrder.name,
    orderNumber: shopifyOrder.order_number,
    email: shopifyOrder.email,
    phone: shopifyOrder.phone,
    createdAt: new Date(shopifyOrder.created_at),
    updatedAt: new Date(shopifyOrder.updated_at),
    currency: shopifyOrder.currency,
    financialStatus: shopifyOrder.financial_status,
    fulfillmentStatus: shopifyOrder.fulfillment_status,
    
    customer: {
      id: shopifyOrder.customer?.id,
      email: shopifyOrder.customer?.email,
      firstName: shopifyOrder.customer?.first_name,
      lastName: shopifyOrder.customer?.last_name,
      phone: shopifyOrder.customer?.phone
    },
    
    shippingAddress: {
      name: `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim(),
      address1: shippingAddress.address1 || '',
      address2: shippingAddress.address2 || '',
      city: shippingAddress.city || '',
      province: shippingAddress.province || '',
      zip: shippingAddress.zip || '',
      country: shippingAddress.country || '',
      phone: shippingAddress.phone || ''
    },
    
    lineItems,
    
    totals: {
      subtotal,
      shipping,
      tax,
      total
    }
  };
}

// Client-side implementation
const syncShopifyOrders = async (uid, shop) => {
  const res = await fetch('/api/shopify/sync-orders', {
    method: 'POST',
    body: JSON.stringify({
      uid: 'seller123',
      shop: 'your-store.myshopify.com'
    })
  });
  return await res.json();
};

{
  "total": 25,
  "synced": 23,
  "failed": 2,
  "errors": [
    {
      "orderId": "4293847293",
      "error": "Missing required field: shipping_address"
    },
    {
      "orderId": "4293847295",
      "error": "Invalid price format"
    }
  ]
}

// Shopify Webhook API for Order Creation
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/repository/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';

export async function POST(request) {
  try {
    // Verify Shopify webhook signature
    const hmac = request.headers.get('x-shopify-hmac-sha256');
    const shop = request.headers.get('x-shopify-shop-domain');
    const topic = request.headers.get('x-shopify-topic');
    
    // Get request body as text for HMAC verification
    const body = await request.text();
    
    // Verify HMAC
    const generatedHash = crypto
      .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
      .update(body)
      .digest('base64');
      
    if (generatedHash !== hmac) {
      return NextResponse.json({ error: 'HMAC validation failed' }, { status: 403 });
    }
    
    // Parse the body
    const data = JSON.parse(body);
    
    // Find seller by Shopify domain
    const sellersRef = collection(db, 'sellers');
    const q = query(sellersRef, where('shopifyDomain', '==', shop));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return NextResponse.json({ error: 'Seller not found for this Shopify store' }, { status: 404 });
    }
    
    const sellerDoc = querySnapshot.docs[0];
    const sellerId = sellerDoc.id;
    
    // Process based on webhook topic
    if (topic === 'orders/create') {
      // Transform and store the order
      const transformedOrder = transformShopifyOrder(data);
      
      await addDoc(collection(db, `sellers/${sellerId}/orders`), {
        ...transformedOrder,
        source: 'shopify',
        shopifyOrderId: data.id,
        syncedAt: Timestamp.now(),
        webhookReceived: true
      });
      
      // Log webhook receipt
      await addDoc(collection(db, `sellers/${sellerId}/webhooks`), {
        topic,
        shop,
        orderId: data.id,
        receivedAt: Timestamp.now()
      });
      
      return NextResponse.json({ success: true });
    } else {
      // Handle other webhook topics if needed
      return NextResponse.json({ success: true, message: `Webhook ${topic} received but not processed` });
    }
    
  } catch (error) {
    console.error('Error processing Shopify webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to transform Shopify order (same as in sync API)
function transformShopifyOrder(shopifyOrder) {
  // Extract shipping address
  const shippingAddress = shopifyOrder.shipping_address || {};
  
  // Extract line items
  const lineItems = shopifyOrder.line_items.map(item => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    price: parseFloat(item.price),
    sku: item.sku || '',
    variantId: item.variant_id,
    productId: item.product_id
  }));
  
  // Calculate totals
  const subtotal = parseFloat(shopifyOrder.subtotal_price || 0);
  const shipping = parseFloat(shopifyOrder.shipping_lines?.[0]?.price || 0);
  const tax = parseFloat(shopifyOrder.total_tax || 0);
  const total = parseFloat(shopifyOrder.total_price || 0);
  
  return {
    orderId: shopifyOrder.name,
    orderNumber: shopifyOrder.order_number,
    email: shopifyOrder.email,
    phone: shopifyOrder.phone,
    createdAt: new Date(shopifyOrder.created_at),
    updatedAt: new Date(shopifyOrder.updated_at),
    currency: shopifyOrder.currency,
    financialStatus: shopifyOrder.financial_status,
    fulfillmentStatus: shopifyOrder.fulfillment_status,
    
    customer: {
      id: shopifyOrder.customer?.id,
      email: shopifyOrder.customer?.email,
      firstName: shopifyOrder.customer?.first_name,
      lastName: shopifyOrder.customer?.last_name,
      phone: shopifyOrder.customer?.phone
    },
    
    shippingAddress: {
      name: `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim(),
      address1: shippingAddress.address1 || '',
      address2: shippingAddress.address2 || '',
      city: shippingAddress.city || '',
      province: shippingAddress.province || '',
      zip: shippingAddress.zip || '',
      country: shippingAddress.country || '',
      phone: shippingAddress.phone || ''
    },
    
    lineItems,
    
    totals: {
      subtotal,
      shipping,
      tax,
      total
    }
  };
}

{
  "success": true
}

add that for 3rd party couriers apis integration i have created a markdown file named Api_docs.md which you need to refer for all 4 couriers api integration where for razorpay, paytm, shopify, ekyc etc i have created another file called ThirdParty_Apis.md accordingly.