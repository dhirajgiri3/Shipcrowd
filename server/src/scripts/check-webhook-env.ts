
import dotenv from 'dotenv';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

console.log('Checking Webhook Configuration...');
if (process.env.RAZORPAY_WEBHOOK_SECRET) {
    if (process.env.RAZORPAY_WEBHOOK_SECRET.length > 8) {
        console.log('✅ PASS: RAZORPAY_WEBHOOK_SECRET is set and appears valid.');
    } else {
        console.log('⚠️ WARN: RAZORPAY_WEBHOOK_SECRET is set but seems too short.');
    }
} else {
    console.error('❌ FAIL: RAZORPAY_WEBHOOK_SECRET is missing from .env');
    console.error('   Webhooks will fail signature verification!');
}
