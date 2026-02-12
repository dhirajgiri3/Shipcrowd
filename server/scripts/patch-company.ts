import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

const envPath = process.cwd().endsWith('server')
    ? path.join(process.cwd(), '.env')
    : path.join(process.cwd(), 'server', '.env');

dotenv.config({ path: envPath });

const DB_URL = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Shipcrowd';

async function patchCompany() {
    try {
        await mongoose.connect(DB_URL);

        // Use raw collection access to avoid schema issues
        const Company = mongoose.connection.collection('companies');
        const User = mongoose.connection.collection('users');

        const companyId = new mongoose.Types.ObjectId('69896c05e5063b94d9f3e342');

        console.log('Patching Company:', companyId);

        const update = {
            $set: {
                status: 'approved',
                billingInfo: {
                    gstin: '27AAAAA0000A1Z5',
                    pan: 'AAAAA0000A',
                    bankName: 'HDFC Bank',
                    accountNumber: '50100000000000',
                    ifscCode: 'HDFC0000123',
                    upiId: 'seller@upi'
                },
                'settings.autoGenerateInvoice': true,
                profileStatus: 'complete'
            }
        };

        const res = await Company.updateOne({ _id: companyId }, update);
        console.log('Company Matched:', res.matchedCount, 'Modified:', res.modifiedCount);

        // Also ensure user has profile completion
        const userRes = await User.updateOne(
            { email: 'seller2@fashionhub.com' },
            {
                $set: {
                    'profileCompletion.status': 100,
                    'profileCompletion.requiredFieldsCompleted': true
                }
            }
        );
        console.log('User Updated:', userRes.modifiedCount);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

patchCompany();
