import dotenv from 'dotenv';
import Razorpay from 'razorpay';

dotenv.config();

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be defined');
}

export const razorpayConfig = {
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
};

export const razorpayInstance = new Razorpay(razorpayConfig);
